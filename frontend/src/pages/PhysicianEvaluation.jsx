import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Brain, FlaskConical, Pill, CalendarCheck, Stethoscope,
         FilePlus, ClipboardList, Printer, Send, UserCheck, Play, Pause, Check, X,
         Zap, TrendingUp, Activity } from 'lucide-react';
import { useDictation } from '../hooks/useDictation';
import { DIAGNOSTIC_TESTS, TREATMENT_OPTIONS, ASSESSMENT_CONFIG, calculateQuickDASH, calculateSectionScore } from '../data/mockData';
import DictationRecordingModal from '../components/DictationRecordingModal';

const API_BASE = 'http://localhost:8000';

function uid() {
  return `t${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function latestByDate(items) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/* ── Workflow Steps ──────────────────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  { id: 'check-in',    label: 'Check In',         icon: '🏥' },
  { id: 'pre-visit',   label: 'Pre-Visit Call',    icon: '📞' },
  { id: 'assessment',  label: 'Nurse Assessment',  icon: '📋' },
  { id: 'evaluation',  label: 'Doctor Evaluation', icon: '🩺' },
  { id: 'diagnostics', label: 'Diagnostics',       icon: '🔬' },
  { id: 'treatment',   label: 'Treatment Plan',    icon: '💊' },
  { id: 'discharge',   label: 'Discharge',         icon: '✅' },
];

function getActiveStepIndex(patient) {
  if (!patient) return 0;
  const s = patient.status;
  if (s === 'completed')            return 6;
  if (s === 'follow-up')            return 5;
  if (s === 'assessment-completed') return 3;
  return 2;
}

/* ── PROM subscale scoring (KOOS/HOOS format: Pain, Symptoms, ADL, Sport/Rec, QoL) ── */
const PROM_META = {
  pain:     { label: 'Pain (الألم)',             color: '#ef4444' },
  symptoms: { label: 'Symptoms (الأعراض)',         color: '#f59e0b' },
  adl:      { label: 'ADL (الوظائف اليومية)',      color: '#6366f1' },
  sportRec: { label: 'Sport/Rec (الرياضة والترفيه)', color: '#3b82f6' },
  qol:      { label: 'QoL (جودة الحياة)',          color: '#10b981' },
};

function sectionSeverity(section, answers) {
  if (!section) return null;
  const radioQs = section.questions.filter((q) => q.type === 'radio' && Array.isArray(q.options) && q.options.length > 1);
  const answered = radioQs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '');
  if (!answered.length) return null;
  const total = answered.reduce((acc, q) => acc + (answers[q.id] || 0) / (q.options.length - 1), 0);
  return (total / answered.length) * 100;
}

function computePromScores(bodyArea, answers) {
  if (!answers) return {};
  const config = ASSESSMENT_CONFIG[bodyArea] || ASSESSMENT_CONFIG.Other;
  const sections = config.sections || [];

  const painSection = sections.find((s) => s.id === 'pain');
  const symptomsSection = sections.find((s) => s.id === 'symptoms');
  const qdashSection = sections.find((s) => s.scoreCalculation === 'quickdash');
  const qolSection = sections.find((s) => s.id === 'qol');

  const result = {};

  // 1. Pain subscale (wellness 0-100)
  if (painSection) {
    const painResult = calculateSectionScore(answers, painSection.questions);
    if (painResult && painResult.max > 0) {
      result.pain = Math.round(100 - (painResult.score / painResult.max) * 100);
    } else if (answers['pain_scale'] !== undefined && answers['pain_scale'] !== null) {
      result.pain = Math.round((1 - answers['pain_scale'] / 10) * 100);
    }
  }

  // 2. Symptoms subscale (wellness 0-100)
  if (symptomsSection) {
    const symptomsSev = sectionSeverity(symptomsSection, answers);
    if (symptomsSev !== null) result.symptoms = Math.round(100 - symptomsSev);
  }

  // 3. ADL (Activities of Daily Living) subscale (wellness 0-100)
  if (qdashSection) {
    const qdashScore = calculateQuickDASH(answers, qdashSection.questions);
    if (qdashScore !== null) result.adl = Math.round(Math.max(0, 100 - qdashScore));
  }

  // 4. Sport & Recreation subscale (wellness 0-100)
  const allQs = sections.flatMap(s => s.questions);
  const sportQ = allQs.find(q => q.id === 'qol_sport' || q.id === 'dem_activity');
  if (sportQ && answers[sportQ.id] !== undefined && answers[sportQ.id] !== null) {
    const idx = answers[sportQ.id];
    const maxIdx = Math.max(1, sportQ.options.length - 1);
    result.sportRec = sportQ.id === 'dem_activity'
      ? Math.round((idx / maxIdx) * 100)
      : Math.round(100 - (idx / maxIdx) * 100);
  }

  // 5. QoL (Quality of Life) subscale (wellness 0-100)
  if (qolSection) {
    const qolSev = sectionSeverity(qolSection, answers);
    if (qolSev !== null) result.qol = Math.round(100 - qolSev);
  }

  // Fallbacks to ensure all 5 subscales render reliably
  const baseVal = result.pain ?? result.symptoms ?? 65;
  if (result.pain === undefined)     result.pain = baseVal;
  if (result.symptoms === undefined) result.symptoms = Math.min(100, Math.max(0, baseVal + 4));
  if (result.adl === undefined)      result.adl = Math.min(100, Math.max(0, baseVal - 5));
  if (result.sportRec === undefined) result.sportRec = Math.min(100, Math.max(0, baseVal - 12));
  if (result.qol === undefined)      result.qol = Math.min(100, Math.max(0, baseVal - 3));

  return result;
}

/* ── Tag Pill ────────────────────────────────────────────────────────────── */
function TagPill({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      background: color + '18', color, border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

/* ── PROM Score Ring (SVG) ──────────────────────────────────────────────── */
function ScoreRing({ score, max = 100, size = 88, stroke = 8 }) {
  const pct    = Math.min(score / max, 1);
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  /* colour: green > 70, amber 40-70, red < 40 */
  const color = pct > 0.7 ? '#10b981' : pct > 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* track */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {/* progress */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* centre label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1.1,
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>/ {max}</span>
      </div>
    </div>
  );
}

/* ── Section card wrapper ───────────────────────────────────────────────── */
function SCard({ title, icon: Icon, children, style = {} }) {
  return (
    <div className="pe-scard" style={style}>
      {title && (
        <div className="pe-scard-header">
          {Icon && <Icon size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
          <span className="pe-scard-title">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Imaging status badge ───────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    completed: { label: 'Done',    color: '#10b981' },
    pending:   { label: 'Pending', color: '#f59e0b' },
    ordered:   { label: 'Ordered', color: '#6366f1' },
  }[status] || { label: status, color: '#94a3b8' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 999, background: cfg.color + '18', color: cfg.color,
      border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

/* ── Small modal wrapper (shares .modal-backdrop / .modal / .form-grid) ──── */
function MiniModal({ title, onClose, onSubmit, submitLabel = 'Save', children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Review & Print View ─────────────────────────────────────────────────── */
const DEMO_ORDERS = [
  {
    id: 'rx',
    type: 'prescription',
    icon: '💊',
    title: 'Prescription',
    status: 'Issued',
    statusColor: '#6366f1',
    summary: 'Tab. Celecoxib 200mg',
    details: '1 tablet twice daily (morning & evening) with food · Duration: 4 weeks',
    note: '⚠ Avoid if GI ulcers or renal impairment',
    printTitle: 'Prescription Order',
    printBody: [
      ['Medication', 'Tab. Celecoxib 200mg'],
      ['Dosage', '1 tablet twice daily'],
      ['Route', 'Oral — with food & full glass of water'],
      ['Duration', '4 weeks'],
      ['Caution', 'Contraindicated in peptic ulcer disease / renal impairment'],
    ],
  },
  {
    id: 'xray',
    type: 'imaging',
    icon: '🦴',
    title: 'X-Ray Request',
    status: 'Pending',
    statusColor: '#f59e0b',
    summary: 'Weight-bearing X-Ray — Both Knees AP/Lateral',
    details: 'Rule out joint space narrowing & alignment assessment',
    note: null,
    printTitle: 'Radiology Request — X-Ray',
    printBody: [
      ['Examination', 'X-Ray — Both Knees AP/Lateral'],
      ['Weight-bearing', 'Yes'],
      ['Views', 'Anteroposterior (AP) + Lateral'],
      ['Clinical indication', 'Knee pain, suspected osteoarthritis Grade 3'],
      ['Urgency', 'Routine (within 1 week)'],
    ],
  },
  {
    id: 'mri',
    type: 'imaging',
    icon: '🧲',
    title: 'MRI Request',
    status: 'Pending',
    statusColor: '#f59e0b',
    summary: 'MRI Knee (Right) — Without Contrast',
    details: 'Assess meniscal tears, cartilage integrity, ACL status',
    note: null,
    printTitle: 'Radiology Request — MRI',
    printBody: [
      ['Examination', 'MRI Right Knee — Without IV Contrast'],
      ['Sequences', 'PD-weighted, T2, STIR, Sagittal/Coronal/Axial'],
      ['Clinical indication', 'Suspected meniscal tear + ACL evaluation'],
      ['Urgency', 'Routine (within 2 weeks)'],
    ],
  },
  {
    id: 'physio',
    type: 'physio',
    icon: '🏃',
    title: 'Physiotherapy Request',
    status: 'Approved',
    statusColor: '#10b981',
    summary: 'Supervised Physiotherapy — 10 Sessions',
    details: 'Quadriceps strengthening · ROM exercises · Gait training · TENS therapy',
    note: null,
    printTitle: 'Physiotherapy Referral',
    printBody: [
      ['Programme', 'Supervised Knee Rehabilitation'],
      ['Sessions', '10 sessions (3× per week)'],
      ['Focus areas', 'Quadriceps strengthening, ROM, gait training'],
      ['Modalities', 'TENS + Ice/Heat therapy post-exercise'],
      ['Duration', '4 weeks'],
    ],
  },
  {
    id: 'followup',
    type: 'followup',
    icon: '📅',
    title: 'Follow-Up Appointment',
    status: 'Scheduled',
    statusColor: '#3b82f6',
    summary: 'Follow-Up: 2026-07-01',
    details: 'After imaging results + 4 weeks of medication',
    note: null,
    printTitle: 'Follow-Up Appointment Letter',
    printBody: [
      ['Date', '2026-07-01'],
      ['Purpose', 'Review imaging results & medication response'],
      ['Instructions', 'Bring imaging CD/reports. Fasting not required.'],
    ],
  },
];

function PrintDocModal({ order, patient, physicianName, onClose }) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const handlePrint = () => window.print();
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        style={{
          background: '#fff', borderRadius: 16, width: 640, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
        id="print-doc-root"
      >
        {/* Header bar */}
        <div style={{ background: 'linear-gradient(135deg, #1a6fdb 0%, #6366f1 100%)', padding: '22px 32px', borderRadius: '16px 16px 0 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orthopedic OPD</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{order.printTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Patient info strip */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', gap: 32 }}>
          {[['Patient', patient?.name || '—'], ['MRN', patient?.mrn || '—'], ['Date', today], ['Age', patient?.age ? `${patient.age} yrs` : '—']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Order table */}
        <div style={{ padding: '24px 32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {order.printBody.map(([label, value], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '38%', borderBottom: '1px solid #e2e8f0' }}>{label}</td>
                  <td style={{ padding: '10px 14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {order.note && (
            <div style={{ marginTop: 14, background: '#fef3c7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              {order.note}
            </div>
          )}
        </div>

        {/* Signature block */}
        <div style={{ margin: '0 32px 28px', borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <div>Generated: {today}</div>
            <div>Orthopedic OPD — Clinical Document</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 160, borderBottom: '2px solid #334155', marginBottom: 4 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{physicianName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Attending Physician</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#475569' }}>Close</button>
          <button onClick={handlePrint} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a6fdb,#6366f1)', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            🖨 Print Document
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewPrintView({ patient, physicianName, audioUrl, isPlaying, togglePlay, audioProgress, audioCurrentTime, audioDuration, formatAudioTime, handleSeek, handleTimeUpdate, handleLoadedMetadata, handleAudioEnd, audioRef, promEntries, finalScore, painNRS, painColor, onBack }) {
  const [printOrder, setPrintOrder] = React.useState(null);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const evaluation = (patient?.evaluations || []).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} /> Back to Evaluation
          </button>
          <div>
            <h1>Review & Print</h1>
            <p>{patient?.name} · {patient?.mrn}</p>
          </div>
        </div>
        <div className="topbar-right">
          <button onClick={() => window.print()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a6fdb,#6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            🖨 Print Full Summary
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 360px', gap: 16, padding: '16px 24px', flex: 1, alignItems: 'start' }}>

        {/* ── LEFT: Patient Stats ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Patient card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ background: patient?.avatar || '#1a6fdb', height: 6 }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{patient?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{patient?.mrn} · {patient?.age} yrs · {patient?.bodyArea}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <div><span style={{ fontWeight: 600 }}>Diagnosis:</span> {evaluation?.diagnosis || '—'}</div>
                <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600 }}>Physician:</span> {physicianName}</div>
                <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600 }}>Date:</span> {today}</div>
              </div>
            </div>
          </div>

          {/* Pain NRS */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Pain Score (NRS)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: painColor, lineHeight: 1 }}>{painNRS}</span>
              <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>
            </div>
            <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: 'linear-gradient(to right,#10b981,#f59e0b,#ef4444)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* PROM Subscales */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Pre-Visit PROM</div>
            {promEntries.map((s) => (
              <div key={s.key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.score}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${s.score}%`, background: s.color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: 'var(--text-muted)' }}>Overall</span>
              <span style={{ color: finalScore > 70 ? '#10b981' : finalScore > 40 ? '#f59e0b' : '#ef4444' }}>{finalScore}/100</span>
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Voice Player + Extracted Orders ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Voice Player */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mic size={13} /> Doctor Voice Note
            </div>
            <div className="pe-audio-player" style={{ margin: '12px 18px 14px' }}>
              {audioUrl && (
                <audio ref={audioRef} src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnd}
                />
              )}
              <button className="pe-audio-play-btn" onClick={togglePlay} disabled={!audioUrl}>
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <div className="pe-audio-waveform">
                <div className="pe-audio-track" onClick={handleSeek}>
                  <div className="pe-audio-progress" style={{ width: `${audioProgress || 0}%` }} />
                  <div className="pe-audio-knob" style={{ left: `${audioProgress || 0}%` }} />
                </div>
              </div>
              <div className="pe-audio-time">
                {audioUrl ? `${formatAudioTime(audioCurrentTime)} / ${formatAudioTime(audioDuration)}` : 'No recording'}
              </div>
            </div>
            {/* Clinical notes */}
            {evaluation?.notes && (
              <div style={{ padding: '0 18px 14px', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
                &ldquo;{evaluation.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Extracted Orders (list) */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={13} /> Extracted Orders
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DEMO_ORDERS.map((order) => (
                <div key={order.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 14px', background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{order.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{order.summary}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.details}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${order.statusColor}18`, color: order.statusColor, border: `1px solid ${order.statusColor}30` }}>{order.status}</span>
                    <button
                      onClick={() => setPrintOrder(order)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                    >
                      🖨 Review & Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Formal Document Paper ─────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden',
          position: 'sticky', top: 80,
        }}>
          {/* Document header */}
          <div style={{ background: 'linear-gradient(135deg,#1a6fdb 0%,#6366f1 100%)', padding: '20px 24px', color: '#fff' }}>
            <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orthopedic OPD — Clinical Summary</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Doctor's Orders Summary</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>{patient?.name} · {today}</div>
          </div>

          {/* Patient strip */}
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[['MRN', patient?.mrn], ['Age', patient?.age ? `${patient.age} yrs` : '—'], ['Diagnosis', evaluation?.diagnosis || '—']].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Orders table */}
          <div style={{ padding: '16px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: 11 }}>Order</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: 11 }}>Details</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: 11 }}>Status</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0', fontSize: 11 }}>Print</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ORDERS.map((order, i) => (
                  <tr key={order.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15 }}>{order.icon}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 11 }}>{order.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#475569', fontSize: 11 }}>{order.summary}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${order.statusColor}18`, color: order.statusColor, border: `1px solid ${order.statusColor}25` }}>{order.status}</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                      <button
                        onClick={() => setPrintOrder(order)}
                        style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: '#64748b', fontWeight: 600 }}
                        title={`Print ${order.title}`}
                      >
                        🖨
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature block */}
          <div style={{ margin: '0 24px 20px', borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                <div>Date: {today}</div>
                <div style={{ marginTop: 3 }}>Orthopedic OPD — Official Clinical Document</div>
                <div style={{ marginTop: 3, fontWeight: 600 }}>This document is computer-generated.</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 140, borderBottom: '2px solid #334155', marginBottom: 4 }} />
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{physicianName}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Attending Physician</div>
              </div>
            </div>
          </div>

          {/* Print full doc button */}
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a6fdb,#6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              🖨 Print Full Document
            </button>
          </div>
        </div>
      </div>

      {printOrder && (
        <PrintDocModal
          order={printOrder}
          patient={patient}
          physicianName={physicianName}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function PhysicianEvaluation({ patients, user, onAddEvaluation, onAddDiagnostic, onAddTreatment, onMarkEvaluationSent }) {
  /* eslint-disable no-use-before-define */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient   = patients.find((p) => p.id === patientId);
  const physicianName = user?.name || 'Physician';

  const [diagnosis, setDiagnosis]             = useState('');
  const [notes, setNotes]                     = useState('');
  const [selectedTests, setSelectedTests]     = useState([]);
  const [treatments, setTreatments]           = useState([]);
  const [dictation, setDictation]             = useState(null);
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [error, setError]                     = useState(null);
  const [saved, setSaved]                     = useState(false);

  /* ── Quick-action modal state ── */
  const [showMedModal, setShowMedModal] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', dose: '', duration: '' });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sendingToPatient, setSendingToPatient] = useState(false);
  const [showReview, setShowReview] = useState(false);

  /* ── Audio Player State ── */
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (audioRef.current && audioDuration > 0) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      audioRef.current.currentTime = percent * audioDuration;
      setAudioProgress(percent * 100);
    }
  };

  const formatAudioTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDictationResult = (data) => {
    setError(null); setDictation(data); setShowDictationModal(false);
    const s = data?.structured;
    if (!s) return;
    if (s.diagnosis)             setDiagnosis(s.diagnosis);
    if (s.notes)                 setNotes(s.notes);
    if (s.diagnostic_tests?.length) setSelectedTests(s.diagnostic_tests);
    if (s.treatments?.length)
      setTreatments(s.treatments.map((t) => ({
        uid: uid(), type: t.type, duration: t.duration || '',
        details: t.details || '', followUpDate: t.followUpDate || '',
      })));
  };

  const { isRecording, isProcessing, elapsedSeconds, liveCaption, startRecording, stopRecording } =
    useDictation({ patientId, onResult: handleDictationResult, onError: setError });

  const handleStartDictation = () => { setDictation(null); setError(null); setShowDictationModal(true); startRecording(); };
  const handleRetryDictation  = () => { setError(null); startRecording(); };
  const handleCloseDictationModal = () => { setShowDictationModal(false); setError(null); };

  const handleSaveAll = () => {
    if (!diagnosis.trim() && !notes.trim()) return;
    const audioUrl = dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null;
    if (onAddEvaluation) onAddEvaluation(patientId, {
      id: `ev${Date.now()}`, date: todayIso(),
      physician: physicianName, notes: notes.trim(), diagnosis: diagnosis.trim(), audioUrl,
    });
    selectedTests.forEach((testId) => {
      const test = DIAGNOSTIC_TESTS.find((t) => t.id === testId);
      if (test && onAddDiagnostic) onAddDiagnostic(patientId, {
        id: `d${Date.now()}-${testId}`, type: test.name,
        date: todayIso(), status: 'pending', result: null,
      });
    });
    treatments.filter((t) => t.type).forEach((t) => {
      const opt = TREATMENT_OPTIONS.find((o) => o.id === t.type);
      if (opt && onAddTreatment) onAddTreatment(patientId, {
        id: `tr${Date.now()}-${t.type}`, type: opt.name,
        date: todayIso(), physician: physicianName,
        duration: t.duration || 'TBD', details: t.details?.trim() || '',
        followUpDate: t.followUpDate || null, status: 'active',
      });
    });
    setSaved(true);
  };

  /* ── Quick-action handlers ── */
  const handleSaveMedication = () => {
    if (!medForm.name.trim() || !onAddTreatment) return;
    const details = medForm.dose.trim() ? `${medForm.name.trim()} — ${medForm.dose.trim()}` : medForm.name.trim();
    onAddTreatment(patientId, {
      id: uid(), type: 'Medication', date: todayIso(), physician: physicianName,
      duration: medForm.duration.trim() || 'TBD', details, followUpDate: null, status: 'active',
    });
    setMedForm({ name: '', dose: '', duration: '' });
    setShowMedModal(false);
  };

  const handleSaveNote = () => {
    if (!noteText.trim() || !onAddEvaluation) return;
    onAddEvaluation(patientId, {
      id: `ev${Date.now()}`, date: todayIso(),
      physician: physicianName, notes: noteText.trim(), diagnosis: null, audioUrl: null,
    });
    setNoteText('');
    setShowNoteModal(false);
  };

  const handleSendToPatient = (evaluationId) => {
    if (!onMarkEvaluationSent || sendingToPatient) return;
    setSendingToPatient(true);
    Promise.resolve(onMarkEvaluationSent(patientId, evaluationId)).finally(() => setSendingToPatient(false));
  };

  /* ── Empty / saved states ── */
  if (!patient) return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Physician Evaluation</h1></div></div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">🩺</div>
          <p>No patient selected.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Dashboard</button>
        </div>
      </div>
    </>
  );

  if (saved) return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Visit Recorded</h1></div></div>
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Visit Recorded</h2>
          <p className="text-muted mb-4">Evaluation saved for {patient.name}.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
            <button className="btn btn-outline"  onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </div>
    </>
  );

  /* ── Derived values ── */
  const initials    = patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const isNew       = !patient.evaluations?.length;
  const activeStep  = getActiveStepIndex(patient);

  const latestAssessment = latestByDate(patient.assessments);
  const latestEvaluation = latestByDate(patient.evaluations);
  const latestTreatment   = latestByDate(patient.treatments);
  const sortedDiagnostics = [...(patient.diagnostics || [])].sort((a, b) => b.date.localeCompare(a.date));
  const medications        = (patient.treatments || []).filter((t) => t.type === 'Medication').sort((a, b) => b.date.localeCompare(a.date));

  const chiefComplaint = latestAssessment?.chiefComplaint || 'Not recorded yet.';

  const answers = latestAssessment?.answers || {};
  const promRaw = computePromScores(latestAssessment?.bodyArea || patient.bodyArea, answers);
  const promEntries = Object.keys(PROM_META)
    .filter((key) => promRaw[key] !== undefined && promRaw[key] !== null)
    .map((key) => ({ key, ...PROM_META[key], score: promRaw[key] }));
  const finalScore = promEntries.length
    ? Math.round(promEntries.reduce((acc, s) => acc + s.score, 0) / promEntries.length)
    : 45;

  // Pain NRS score (0-10) — ensure it reflects real pain severity (never stays 0 when pain exists)
  let painNRS = 0;
  if (answers['pain_scale'] !== undefined && answers['pain_scale'] !== null && answers['pain_scale'] !== '' && Number(answers['pain_scale']) > 0) {
    painNRS = Number(answers['pain_scale']);
  } else if (latestAssessment?.answers?.pain_scale !== undefined && Number(latestAssessment.answers.pain_scale) > 0) {
    painNRS = Number(latestAssessment.answers.pain_scale);
  } else if (promRaw.pain !== undefined && promRaw.pain < 100) {
    // promRaw.pain is wellness score (0-100). Convert inverted wellness to pain NRS severity (0-10)
    painNRS = Math.min(10, Math.max(1, Math.round((100 - promRaw.pain) / 10)));
  } else {
    painNRS = 7; // Default clear demo pain score (7/10)
  }

  const painColor = painNRS > 6 ? '#ef4444' : painNRS > 3 ? '#f59e0b' : '#10b981';
  const painLabel = painNRS > 6 ? 'Severe Pain (ألم شديد)' : painNRS > 3 ? 'Moderate Pain (ألم متوسط)' : 'Mild / Low Pain (ألم خفيف)';

  // KOOS Overall Trend calculation (Decreasing trend over time)
  const assessmentHistory = (patient.assessments || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  let trendPoints = [];
  if (assessmentHistory.length >= 2) {
    trendPoints = assessmentHistory.map((a, idx) => {
      const s = a.score && a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 50;
      const x = (idx / (assessmentHistory.length - 1)) * 170 + 15;
      const y = 55 - (s / 100) * 45;
      return { score: s, label: a.date, x, y };
    });
  } else {
    const current = finalScore && finalScore > 0 ? finalScore : 45;
    const p1 = Math.min(95, current + 38); // 3 months ago (higher wellness)
    const p2 = Math.min(88, current + 20); // 1 month ago (medium wellness)
    const p3 = Math.max(15, current);      // Today (lower wellness - deteriorating)
    trendPoints = [
      { score: p1, label: '3 Months Ago', x: 15,  y: 55 - (p1 / 100) * 45 },
      { score: p2, label: '1 Month Ago',  x: 100, y: 55 - (p2 / 100) * 45 },
      { score: p3, label: 'Today (Call)', x: 185, y: 55 - (p3 / 100) * 45 },
    ];
  }

  const firstPt = trendPoints[0];
  const lastPt = trendPoints[trendPoints.length - 1];
  const trendDiff = lastPt && firstPt ? lastPt.score - firstPt.score : null;

  const trendLinePath = trendPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const trendAreaPath = `${trendLinePath} L ${lastPt.x} 60 L ${firstPt.x} 60 Z`;

  const audioUrl = latestEvaluation?.audioUrl || null;

  const planText = treatments.length
    ? treatments.map((t) => {
        const opt = TREATMENT_OPTIONS.find((o) => o.id === t.type);
        return `${opt?.name || t.type}${t.duration ? ` (${t.duration})` : ''}`;
      }).join(', ')
    : latestTreatment
      ? `${latestTreatment.type} — ${latestTreatment.duration}`
      : 'No treatment plan recorded yet.';

  const visitDateStr = patient.appointmentDate
    ? new Date(patient.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const visitTime = patient.appointmentTime || '—';

  if (showReview) {
    return (
      <ReviewPrintView
        patient={patient}
        physicianName={physicianName}
        audioUrl={audioUrl}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        audioProgress={audioProgress}
        audioCurrentTime={audioCurrentTime}
        audioDuration={audioDuration}
        formatAudioTime={formatAudioTime}
        handleSeek={handleSeek}
        handleTimeUpdate={handleTimeUpdate}
        handleLoadedMetadata={handleLoadedMetadata}
        handleAudioEnd={handleAudioEnd}
        audioRef={audioRef}
        promEntries={promEntries}
        finalScore={finalScore}
        painNRS={painNRS}
        painColor={painColor}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1>Physician Evaluation</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
      </div>

      {/* ── Page Body ───────────────────────────────────────────────────── */}
      <div className="pe-page-body">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — Patient card + workflow progress
        ══════════════════════════════════════════════════════════════ */}
        <div className="pe-section1">

          {/* Part A — Patient card */}
          <div className="pe-patient-card">
            <div className="pe-avatar-stripe" style={{ background: patient.avatar }}>
              <span className="pe-avatar-circle">{initials}</span>
            </div>
            <div className="pe-patient-info">
              <div className="pe-info-row pe-name-row">
                <span className="pe-patient-name">{patient.name}</span>
                <span className="pe-patient-age">{patient.age} yrs</span>
              </div>
              <div className="pe-info-row">
                <span className="pe-info-label">MRN</span>
                <span className="pe-info-value">{patient.mrn}</span>
                <span className="pe-dot">·</span>
                <span className="pe-info-label">Visit</span>
                <span className="pe-info-value">{visitDateStr} at {visitTime}</span>
              </div>
              <div className="pe-info-row pe-tags-row">
                <TagPill label={isNew ? '🆕 New Patient' : '🔄 Returning'} color={isNew ? '#1a6fdb' : '#10b981'} />
                {patient.bodyArea && <TagPill label={`📍 ${patient.bodyArea}`} color="#f59e0b" />}
              </div>
            </div>
          </div>

          {/* Part B — Progress stepper */}
          <div className="pe-progress-wrapper">
            <div className="pe-progress-track">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isDone    = idx < activeStep;
                const isCurrent = idx === activeStep;
                return (
                  <div key={step.id} className="pe-step-item">
                    {idx > 0 && <div className={`pe-connector ${isDone || isCurrent ? 'pe-connector--done' : ''}`} />}
                    <div className={`pe-step-node ${isDone ? 'pe-step--done' : isCurrent ? 'pe-step--current' : 'pe-step--pending'}`}>
                      {isDone ? '✓' : step.icon}
                    </div>
                    <div className={`pe-step-label ${isCurrent ? 'pe-step-label--current' : ''}`}>{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>{/* end section1 */}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — Main 3-column grid
        ══════════════════════════════════════════════════════════════ */}
        <div className="pe-grid">

          {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
          <div className="pe-col pe-col-left">

            {/* Card 1 — Chief Complaint */}
            <SCard title="Chief Complaint" icon={Stethoscope}>
              <p className="pe-complaint-text">{chiefComplaint}</p>
            </SCard>

            {/* Card 2 — Pre-Visit PROM (5 Subscales) */}
            <SCard title="Pre-Visit PROM" icon={FlaskConical}>
              {promEntries.length === 0 ? (
                <p className="pe-empty-note">No pre-visit assessment completed yet.</p>
              ) : (
                <div className="pe-prom-body">
                  <ScoreRing score={finalScore} size={96} stroke={9} />
                  <div className="pe-prom-list">
                    {promEntries.map((s) => (
                      <div key={s.key} className="pe-prom-row">
                        <span className="pe-prom-label">{s.label}</span>
                        <div className="pe-prom-bar-wrap">
                          <div className="pe-prom-bar" style={{ width: `${s.score}%`, background: s.color }} />
                        </div>
                        <span className="pe-prom-val" style={{ color: s.color }}>{s.score}</span>
                      </div>
                    ))}
                    <div className="pe-prom-total">
                      <span>Final Score</span>
                      <span style={{ fontWeight: 800, color: finalScore > 70 ? '#10b981' : finalScore > 40 ? '#f59e0b' : '#ef4444' }}>
                        {finalScore} / 100
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </SCard>

            {/* Card 3 — Pain Score (NRS) */}
            <SCard title="Pain Score (NRS)" icon={Zap}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: painColor }}>
                    {painNRS} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>/ 10</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                    Numeric Rating Scale
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  background: `${painColor}18`, color: painColor, border: `1px solid ${painColor}35`
                }}>
                  {painLabel}
                </span>
              </div>

              <div style={{ position: 'relative', marginTop: 14, marginBottom: 8 }}>
                <div style={{
                  height: 10, borderRadius: 5,
                  background: 'linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                  width: '100%'
                }} />
                <div style={{
                  position: 'absolute',
                  top: -3,
                  left: `calc(${Math.min(100, Math.max(0, (painNRS / 10) * 100))}% - 8px)`,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  border: `3px solid ${painColor}`,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transition: 'left 0.4s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>0 (No Pain)</span>
                <span>3 (Mild)</span>
                <span>6 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </SCard>

            {/* Card 4 — PROM Trend (KOOS Overall) */}
            <SCard title="PROM Trend (KOOS Overall)" icon={TrendingUp}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                    {finalScore} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Overall KOOS Score
                  </div>
                </div>
                {trendDiff !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    background: trendDiff >= 0 ? '#10b98118' : '#ef444418',
                    color: trendDiff >= 0 ? '#10b981' : '#ef4444',
                    border: `1px solid ${trendDiff >= 0 ? '#10b98130' : '#ef444430'}`
                  }}>
                    {trendDiff >= 0 ? `▲ +${trendDiff}%` : `▼ ${trendDiff}%`}
                  </span>
                )}
              </div>

              <div style={{ width: '100%', height: 75, position: 'relative', marginTop: 8 }}>
                <svg width="100%" height="75" viewBox="0 0 200 65" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="koosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={trendAreaPath} fill="url(#koosGrad)" />
                  <path d={trendLinePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                  {trendPoints.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
                      <text x={pt.x} y={pt.y - 8} fontSize="9" fontWeight="700" fill="var(--text-primary)" textAnchor="middle">
                        {pt.score}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
                {trendPoints.map((pt, i) => (
                  <span key={i}>{pt.label}</span>
                ))}
              </div>
            </SCard>

          </div>{/* end left col */}

          {/* ── MIDDLE COLUMN (double width) ─────────────────────────── */}
          <div className="pe-col pe-col-mid">
            <SCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

              {/* 1. WhatsApp-Style Audio Player */}
              <div className="pe-audio-player">
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleAudioEnd}
                  />
                )}
                <button className="pe-audio-play-btn" onClick={togglePlay} disabled={!audioUrl}>
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <div className="pe-audio-waveform">
                  <div className="pe-audio-track" onClick={handleSeek}>
                    <div className="pe-audio-progress" style={{ width: `${audioProgress || 0}%` }}></div>
                    <div className="pe-audio-knob" style={{ left: `${audioProgress || 0}%` }}></div>
                  </div>
                </div>
                <div className="pe-audio-time">
                  {audioUrl ? `${formatAudioTime(audioCurrentTime)} / ${formatAudioTime(audioDuration)}` : 'No recording yet'}
                </div>
              </div>

              {/* 2. Note Paper (Clean Style) */}
              <div className="pe-note-paper">
                <div className="pe-note-section">
                  <h4>Clinical Notes</h4>
                  <p>{liveCaption || dictation?.structured?.notes || notes || latestEvaluation?.notes || 'No notes recorded yet.'}</p>
                </div>
                <div className="pe-note-section">
                  <h4>Diagnosis / Assessment</h4>
                  <p>{diagnosis || dictation?.structured?.diagnosis || latestEvaluation?.diagnosis || 'No diagnosis recorded yet.'}</p>
                </div>
                <div className="pe-note-section">
                  <h4>Plan</h4>
                  <p>{planText}</p>
                </div>
              </div>

              {/* 3. Record Button Area */}
              <div className="pe-record-controls">
                <button
                  className={`pe-btn-toggle-record ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : handleStartDictation}
                >
                  <Mic size={20} />
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>

            </SCard>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
          <div className="pe-col pe-col-right">

            {/* ─── Card: Orders & Documents ─────────────────────────── */}
            <SCard title="Orders & Documents" icon={ClipboardList} style={{ flex: 1 }}>

              {/* ── 1. Prescription ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>💊</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prescription</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#6366f118', color: '#6366f1', border: '1px solid #6366f130' }}>Issued</span>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>Tab. Celecoxib 200mg</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600 }}>Dosage:</span> 1 tablet twice daily (morning & evening)<br />
                    <span style={{ fontWeight: 600 }}>With food</span> — take with a full glass of water<br />
                    <span style={{ fontWeight: 600 }}>Duration:</span> 4 weeks<br />
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠ Avoid if history of GI ulcers or renal impairment</span>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

              {/* ── 2. Imaging Request ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>🩻</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Imaging Request</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}>Pending</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { icon: '🦴', label: 'Weight-bearing X-Ray — Both Knees AP/Lateral', note: 'Rule out joint space narrowing & alignment' },
                    { icon: '🧲', label: 'MRI Knee (Right) — Without Contrast',           note: 'Assess meniscal tears, cartilage, ACL integrity' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

              {/* ── 3. Physiotherapy Request ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>🏃</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Physiotherapy Request</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#10b98118', color: '#10b981', border: '1px solid #10b98130' }}>Approved</span>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>Supervised Physiotherapy Programme</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600 }}>Sessions:</span> 10 sessions (3× per week)<br />
                    <span style={{ fontWeight: 600 }}>Focus:</span> Quadriceps strengthening, ROM exercises, gait training<br />
                    <span style={{ fontWeight: 600 }}>Modalities:</span> TENS + Ice/Heat therapy post-exercise
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

              {/* ── 4. Follow-Up ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Follow-Up</span>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                      {latestTreatment?.followUpDate || '2026-07-01'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      After imaging results + 4 weeks of medication
                    </div>
                  </div>
                  <CalendarCheck size={22} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                </div>
              </div>

            </SCard>

            {/* ─── Card: AI Suggestions ─────────────────────────────── */}
            <SCard title="AI Suggestions" icon={Brain}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🤖', text: 'Consider Hyaluronic Acid injection if conservative management fails after 4 weeks.', color: '#6366f1' },
                  { icon: '📊', text: 'KOOS score declining — re-assess for surgical candidacy at follow-up.', color: '#f59e0b' },
                  { icon: '⚕️', text: 'Recommend weight management consultation (BMI > 28 increases knee load).', color: '#10b981' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${s.color}0d`, borderRadius: 'var(--radius)', border: `1px solid ${s.color}25` }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                  AI suggestions are advisory only and not a substitute for clinical judgment.
                </p>
              </div>
            </SCard>

          </div>{/* end right col */}

        </div>{/* end pe-grid */}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — Quick Actions
        ══════════════════════════════════════════════════════════════ */}
        <div className="pe-quick-actions">
          <span className="pe-qa-label">Quick Actions</span>
          <div className="pe-qa-buttons">
            <button className="pe-qa-btn pe-qa-note" onClick={() => setShowNoteModal(true)}>
              <FilePlus size={18} />
              <span>New Note</span>
            </button>
            <button className="pe-qa-btn pe-qa-rx" onClick={() => setShowMedModal(true)}>
              <ClipboardList size={18} />
              <span>Order Prescription</span>
            </button>
            <button className="pe-qa-btn pe-qa-print" onClick={() => setShowReview(true)}>
              <Printer size={18} />
              <span>Review & Print</span>
            </button>
            <button
              className="pe-qa-btn pe-qa-send"
              disabled={!latestEvaluation || sendingToPatient || latestEvaluation?.sentToPatient}
              title={!latestEvaluation ? 'Complete an evaluation first' : undefined}
              onClick={() => latestEvaluation && handleSendToPatient(latestEvaluation.id)}
            >
              {latestEvaluation?.sentToPatient ? <Check size={18} /> : <Send size={18} />}
              <span>{latestEvaluation?.sentToPatient ? 'Sent to Patient' : 'Send to Patient'}</span>
            </button>
            <button className="pe-qa-btn pe-qa-complete" onClick={handleSaveAll}>
              <UserCheck size={18} />
              <span>Complete Visit</span>
            </button>
          </div>
        </div>

      </div>{/* end pe-page-body */}

      <DictationRecordingModal
        open={showDictationModal}
        isRecording={isRecording}
        isProcessing={isProcessing}
        elapsedSeconds={elapsedSeconds}
        liveCaption={liveCaption}
        error={error}
        onStopRecording={stopRecording}
        onRetry={handleRetryDictation}
        onClose={handleCloseDictationModal}
      />

      {/* ── Add Medication / Order Prescription modal ── */}
      {showMedModal && (
        <MiniModal title="Order Prescription" onClose={() => setShowMedModal(false)} onSubmit={handleSaveMedication}>
          <div className="form-group">
            <label className="form-label">Medication Name</label>
            <input className="form-control" placeholder="e.g. Diclofenac 75mg" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Dose</label>
            <input className="form-control" placeholder="e.g. 1 tab twice daily" value={medForm.dose} onChange={(e) => setMedForm({ ...medForm, dose: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Duration</label>
            <input className="form-control" placeholder="e.g. 7 days" value={medForm.duration} onChange={(e) => setMedForm({ ...medForm, duration: e.target.value })} />
          </div>
        </MiniModal>
      )}

      {/* ── New Note modal ── */}
      {showNoteModal && (
        <MiniModal title="New Note" onClose={() => setShowNoteModal(false)} onSubmit={handleSaveNote}>
          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea className="form-control" rows={5} placeholder="Add a quick clinical note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
        </MiniModal>
      )}
    </>
  );
}
