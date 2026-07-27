import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, FlaskConical, Pill, CalendarCheck, Stethoscope,
         FilePlus, ClipboardList, Printer, Send, UserCheck, Check, X,
         Zap, TrendingUp, Activity, FileText, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useDictation } from '../hooks/useDictation';
import { useLookup, useAssessmentConfig } from '../hooks/useLookupData';
import { getOdiNdiInterpretation } from '../utils/scoring';
import DictationRecordingModal from '../components/DictationRecordingModal';
import AudioWaveformPlayer from '../components/AudioWaveformPlayer';
import PrintDocModal from '../components/PrintDocModal';
import rasoulLogo from '../assets/rasoul_hosp_logo.jpeg';

const API_BASE = 'http://localhost:8000';

function uid() {
  return `t${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

const successToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 1800,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

function notifySuccess(title) {
  successToast.fire({ icon: 'success', title });
}

function notifyError(title) {
  successToast.fire({ icon: 'error', title, timer: 3000 });
}

function latestByDate(items) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/* ── Workflow Steps ──────────────────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  { id: 'check-in',   label: 'Check In',         icon: '🏥' },
  { id: 'pre-visit',  label: 'Pre-Visit Call',    icon: '📞' },
  { id: 'assessment', label: 'Nurse Assessment',  icon: '📋' },
  { id: 'evaluation', label: 'Doctor Evaluation', icon: '🩺' },
  { id: 'discharge',  label: 'Discharge',         icon: '✅' },
];

function getActiveStepIndex(patient) {
  if (!patient) return 0;
  if (patient.status === 'completed') return 4;
  if ((patient.evaluations?.length || 0) > 0) return 3;
  if ((patient.assessments?.length || 0) > 0) return 2;
  return 0;
}

// A pre-migration assessment (taken before the real per-instrument scoring
// engine existed) has no finalScore stored — fall back to the raw/max ratio
// it does have rather than showing nothing.
function resolveFinalScore(assessment) {
  if (!assessment) return null;
  if (assessment.finalScore !== null && assessment.finalScore !== undefined) return assessment.finalScore;
  if (assessment.maxScore) return Math.round((assessment.score / assessment.maxScore) * 100);
  return null;
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
function ScoreRing({ score, max = 100, size = 88, stroke = 8, direction = 'higher_better' }) {
  const hasScore = score !== null && score !== undefined;
  const pct    = hasScore ? Math.min(score / max, 1) : 0;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  // Direction-aware: for a lower_better instrument (e.g. QuickDASH/ODI/NDI,
  // where 0=best/100=worst) a low score is good, so the colour bands invert.
  const wellnessPct = direction === 'lower_better' ? 1 - pct : pct;
  const color = !hasScore ? 'var(--text-muted)' : wellnessPct > 0.7 ? 'var(--success)' : wellnessPct > 0.4 ? 'var(--warning)' : 'var(--danger)';

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
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{hasScore ? score : '—'}</span>
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
const ORDER_STATUS_COLORS = {
  pending: '#f59e0b',
  active: '#10b981',
  completed: '#10b981',
  scheduled: '#3b82f6',
};

function iconForName(name, options) {
  return options.find((o) => o.name.toLowerCase() === (name || '').toLowerCase())?.icon || '📄';
}

/** Derives the printable orders list from the patient's real diagnostics/
 * treatments records instead of fabricated demo content — necessarily less
 * detailed than a hand-written demo order (no invented MRI sequence
 * protocols etc.), since only fields that actually exist in the DB are used. */
function buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions) {
  const treatmentOrders = (patient.treatments || []).map((t) => ({
    id: t.id,
    kind: 'treatment',
    icon: iconForName(t.type, treatmentOptions),
    title: `${t.type} Order`,
    status: t.status,
    statusColor: ORDER_STATUS_COLORS[t.status] || '#94a3b8',
    summary: t.details || t.type,
    details: `Duration: ${t.duration}`,
    note: null,
    printTitle: `${t.type} Order`,
    printBody: [
      ['Treatment', t.type],
      ['Details', t.details || '—'],
      ['Duration', t.duration],
      ['Physician', t.physician],
      ['Date', t.date],
      ...(t.followUpDate ? [['Follow-Up Date', t.followUpDate]] : []),
    ],
  }));

  const diagnosticOrders = (patient.diagnostics || []).map((d) => ({
    id: d.id,
    kind: 'diagnostic',
    icon: iconForName(d.type, diagnosticTests),
    title: `${d.type} Request`,
    status: d.status,
    statusColor: ORDER_STATUS_COLORS[d.status] || '#94a3b8',
    summary: d.type,
    details: d.result || 'Pending results',
    note: null,
    printTitle: `Diagnostic Request — ${d.type}`,
    printBody: [
      ['Examination', d.type],
      ['Date', d.date],
      ['Status', d.status],
      ['Result', d.result || 'Pending'],
    ],
  }));

  return [...treatmentOrders, ...diagnosticOrders];
}

function ReviewPrintView({ patient, physicianName, audioUrl, isPlaying, togglePlay, audioProgress, audioCurrentTime, audioDuration, formatAudioTime, handleTimeUpdate, handleLoadedMetadata, handleAudioEnd, audioRef, latestAssessment, promName, scoreDirection, finalScore, painNRS, painColor, onBack, diagnosticTests, treatmentOptions }) {
  const [printOrder, setPrintOrder] = React.useState(null);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const evaluation = (patient?.evaluations || []).sort((a, b) => b.date.localeCompare(a.date))[0];
  const orders = buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions);

  return (
    <div className="pe-review-root" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
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

      <div className="pe-review-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 360px', gap: 16, padding: '16px 24px', flex: 1, alignItems: 'start' }}>

        {/* ── LEFT: Patient Stats ───────────────────────────────────── */}
        <div className="pe-review-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Patient card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ background: patient?.avatar || 'var(--primary)', height: 6 }} />
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
              <span style={{ fontSize: 40, fontWeight: 900, color: painColor, lineHeight: 1 }}>{painNRS === null ? '—' : painNRS}</span>
              <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>
            </div>
            <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: 'linear-gradient(to right,#10b981,#f59e0b,#ef4444)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Pre-Visit PROM */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>Pre-Visit PROM</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 10 }}>{promName}</div>
            {!latestAssessment ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No pre-visit assessment completed yet.</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Raw Score</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{latestAssessment.score} / {latestAssessment.maxScore}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Final Score</span>
                  <span style={{ color: finalScore === null ? 'var(--text-muted)' : 'var(--primary)' }}>{finalScore === null ? '—' : finalScore}/100</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  {scoreDirection === 'lower_better' ? 'Higher = more disability' : 'Higher = better function'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── MIDDLE: Voice Player + Extracted Orders ───────────────── */}
        <div className="pe-review-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Voice Player */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <AudioWaveformPlayer
              audioUrl={audioUrl}
              audioRef={audioRef}
              isPlaying={isPlaying}
              togglePlay={togglePlay}
              audioProgress={audioProgress}
              audioCurrentTime={audioCurrentTime}
              audioDuration={audioDuration}
              formatAudioTime={formatAudioTime}
              handleTimeUpdate={handleTimeUpdate}
              handleLoadedMetadata={handleLoadedMetadata}
              handleAudioEnd={handleAudioEnd}
            />
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
              {orders.map((order) => (
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
        <div className="pe-review-paper" style={{
          background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden',
          position: 'sticky', top: 80,
        }}>
          {/* Document header — hospital letterhead */}
          <div style={{ padding: '18px 24px 16px', borderBottom: '3px solid #33AEB8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={rasoulLogo} alt="Al-Rasoul Al-Aazam Hospital" style={{ width: 48, height: 48, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Al-Rasoul Al-Aazam Hospital</div>
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orthopedic OPD — Clinical Summary</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>Doctor's Orders Summary</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{patient?.name} · {today}</div>
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
                {orders.map((order, i) => (
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
export default function PhysicianEvaluation({ patients, user, onAddEvaluation, onUpdateEvaluation, onAddDiagnostic, onDeleteDiagnostic, onAddTreatment, onDeleteTreatment, onMarkEvaluationSent }) {
  /* eslint-disable no-use-before-define */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient   = patients.find((p) => p.id === patientId);
  const physicianName = user?.name || 'Physician';
  const latestAssessment = patient ? latestByDate(patient.assessments) : null;

  const [diagnosis, setDiagnosis]             = useState('');
  const [notes, setNotes]                     = useState('');
  const [selectedTests, setSelectedTests]     = useState([]);
  const [treatments, setTreatments]           = useState([]);
  const [dictation, setDictation]             = useState(null);
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [error, setError]                     = useState(null);
  const [saved, setSaved]                     = useState(false);
  // The evaluation row (if any) already saved today for this patient — once
  // set, "Complete Visit" and "New Note" amend it in place instead of each
  // inserting their own row, so one encounter doesn't fragment into several
  // partial evaluations (one with no diagnosis, one with no notes, etc.).
  const [currentEvaluationId, setCurrentEvaluationId] = useState(null);

  /* ── Quick-action modal state ── */
  const [showMedModal, setShowMedModal] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', dose: '', duration: '' });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sendingToPatient, setSendingToPatient] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  // Seed diagnosis/notes from the most recent saved evaluation once per
  // patient, so reopening an existing evaluation is editable too — not just
  // a fresh dictation. Only fills in what's actually blank so it never
  // clobbers an in-progress dictation or edit.
  useEffect(() => {
    if (!patient) return;
    const latestEval = latestByDate(patient.evaluations);
    setDiagnosis((d) => d || latestEval?.diagnosis || '');
    setNotes((n) => n || latestEval?.notes || '');
    // Only today's evaluation counts as "the current encounter" to amend —
    // an older saved evaluation is a past visit and must stay untouched.
    setCurrentEvaluationId(latestEval?.date === todayIso() ? latestEval.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const toggleDiagnosticTest = (testId) => {
    setSelectedTests((prev) => prev.includes(testId) ? prev.filter((t) => t !== testId) : [...prev, testId]);
  };

  const addTreatmentEntry = () => {
    setTreatments((prev) => [...prev, { uid: uid(), type: '', duration: '', details: '', followUpDate: '' }]);
  };

  const updateTreatmentEntry = (entryUid, field, value) => {
    setTreatments((prev) => prev.map((t) => (t.uid === entryUid ? { ...t, [field]: value } : t)));
  };

  const removeTreatmentEntry = (entryUid) => {
    setTreatments((prev) => prev.filter((t) => t.uid !== entryUid));
  };

  /* ── Audio Player State ── */
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  // Set while handleLoadedMetadata is forcing a seek purely to read the real
  // duration (see below) — handleTimeUpdate skips updating playback-position
  // state during that window so the seek-and-back doesn't visibly flash the
  // waveform to "fully played" for a frame.
  const fixingDurationRef = useRef(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !fixingDurationRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isFinite(audio.duration)) {
      setAudioDuration(audio.duration);
      return;
    }
    // MediaRecorder-produced WebM/Opus commonly reports duration=Infinity on
    // loadedmetadata (the container has no duration header) — Chrome only
    // computes the real value once playback seeks near the end. Force that,
    // capture the now-finite duration, then seek back to the start so this
    // doesn't disturb normal playback.
    fixingDurationRef.current = true;
    const onTimeUpdate = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      setAudioDuration(audio.duration);
      audio.currentTime = 0;
      fixingDurationRef.current = false;
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.currentTime = 1e101;
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
  };


  const formatAudioTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDictationResult = (data) => {
    setError(null); setDictation(data); setShowDictationModal(false);
    // Reset the audio player so it doesn't show stale progress/duration from
    // a previous recording once the <audio> element's src switches over.
    setIsPlaying(false); setAudioProgress(0); setAudioCurrentTime(0); setAudioDuration(0);
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

  const { isRecording, isProcessing, elapsedSeconds, liveCaption, detectedLanguage, analyserRef, startRecording, stopRecording, cancelRecording } =
    useDictation({ patientId, onResult: handleDictationResult, onError: setError });

  const { diagnosticTests, treatmentOptions } = useLookup();
  const assessmentConfig = useAssessmentConfig(latestAssessment?.bodyArea || patient?.bodyArea);

  // Opens the modal in its idle state — recording itself starts when the
  // doctor clicks the mic inside the modal, not the instant the modal opens.
  const handleStartDictation = () => { setDictation(null); setError(null); setShowDictationModal(true); };
  const handleRetryDictation  = () => { setError(null); startRecording(); };
  const handleCloseDictationModal = () => { setShowDictationModal(false); setError(null); };
  // Discards the current take (recording or in-flight transcription) and
  // closes the modal — see useDictation's cancelRecording for what this
  // aborts under the hood.
  const handleCancelDictation = () => { cancelRecording(); setShowDictationModal(false); setError(null); };

  const handleSaveAll = () => {
    if (!diagnosis.trim() && !notes.trim()) return;
    const audioUrl = dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null;
    if (currentEvaluationId && onUpdateEvaluation) {
      onUpdateEvaluation(patientId, currentEvaluationId, { notes: notes.trim(), diagnosis: diagnosis.trim(), audioUrl });
    } else if (onAddEvaluation) {
      const newId = `ev${Date.now()}`;
      onAddEvaluation(patientId, {
        id: newId, date: todayIso(),
        physician: physicianName, notes: notes.trim(), diagnosis: diagnosis.trim(), audioUrl,
      });
      setCurrentEvaluationId(newId);
    }
    selectedTests.forEach((testId) => {
      const test = diagnosticTests.find((t) => t.id === testId);
      if (test && onAddDiagnostic) onAddDiagnostic(patientId, {
        id: `d${Date.now()}-${testId}`, type: test.name,
        date: todayIso(), status: 'pending', result: null,
      });
    });
    treatments.filter((t) => t.type).forEach((t) => {
      const opt = treatmentOptions.find((o) => o.id === t.type);
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
    Promise.resolve(onAddTreatment(patientId, {
      id: uid(), type: 'Medication', date: todayIso(), physician: physicianName,
      duration: medForm.duration.trim() || 'TBD', details, followUpDate: null, status: 'active',
    }))
      .then(() => notifySuccess('Prescription saved'))
      .catch(() => notifyError('Failed to save prescription'));
    setMedForm({ name: '', dose: '', duration: '' });
    setShowMedModal(false);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    // Appends to today's evaluation (if one is already open) instead of
    // inserting a separate row, so a quick note doesn't fork the encounter
    // into a second, diagnosis-less evaluation — see currentEvaluationId.
    const merged = notes.trim() ? `${notes.trim()}\n\n${noteText.trim()}` : noteText.trim();
    setNotes(merged);
    let promise;
    if (currentEvaluationId && onUpdateEvaluation) {
      promise = onUpdateEvaluation(patientId, currentEvaluationId, { notes: merged });
    } else if (onAddEvaluation) {
      const newId = `ev${Date.now()}`;
      const audioUrl = dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null;
      promise = onAddEvaluation(patientId, {
        id: newId, date: todayIso(),
        physician: physicianName, notes: merged, diagnosis: diagnosis.trim(), audioUrl,
      });
      setCurrentEvaluationId(newId);
    } else {
      return;
    }
    Promise.resolve(promise)
      .then(() => notifySuccess('Note saved'))
      .catch(() => notifyError('Failed to save note'));
    setNoteText('');
    setShowNoteModal(false);
  };

  const handleSendToPatient = (evaluationId) => {
    if (!onMarkEvaluationSent || sendingToPatient) return;
    setSendingToPatient(true);
    Promise.resolve(onMarkEvaluationSent(patientId, evaluationId))
      .then(() => notifySuccess('Sent to patient'))
      .catch(() => notifyError('Failed to send to patient'))
      .finally(() => setSendingToPatient(false));
  };

  const handleDeleteOrder = async (order) => {
    if (deletingOrderId) return;
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: `Remove ${order.title}?`,
      text: 'This order will be permanently removed from the patient record.',
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: 'var(--danger)',
      cancelButtonText: 'Cancel',
    }).then((r) => r.isConfirmed);
    if (!confirmed) return;

    const handler = order.kind === 'treatment' ? onDeleteTreatment : onDeleteDiagnostic;
    if (!handler) return;
    setDeletingOrderId(order.id);
    Promise.resolve(handler(patientId, order.id))
      .then(() => notifySuccess('Order removed'))
      .catch(() => notifyError('Failed to remove order'))
      .finally(() => setDeletingOrderId(null));
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

  if (!assessmentConfig) return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Physician Evaluation</h1></div></div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon">🩺</div>
          <p>Loading assessment data…</p>
        </div>
      </div>
    </>
  );

  /* ── Derived values ── */
  const initials    = patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  const isNew       = !patient.evaluations?.length;
  const activeStep  = getActiveStepIndex(patient);

  const latestEvaluation = latestByDate(patient.evaluations);
  const latestTreatment   = latestByDate(patient.treatments);
  const sortedDiagnostics = [...(patient.diagnostics || [])].sort((a, b) => b.date.localeCompare(a.date));
  const medications        = (patient.treatments || []).filter((t) => t.type === 'Medication').sort((a, b) => b.date.localeCompare(a.date));

  const chiefComplaint = latestAssessment?.chiefComplaint || 'Not recorded yet.';

  const answers = latestAssessment?.answers || {};
  const promName = assessmentConfig?.promName || assessmentConfig?.title || 'PROM';
  const scoreDirection = assessmentConfig?.scoreDirection || 'higher_better';
  const finalScore = resolveFinalScore(latestAssessment);
  const disabilityInterpretation = latestAssessment?.interpretation || getOdiNdiInterpretation(finalScore);
  const directionCaption = scoreDirection === 'lower_better' ? 'Higher = more disability' : 'Higher = better function';

  // Pain NRS score (0-10) — real only, straight from the shared pain_scale
  // intake item; null when there's genuinely no pain data recorded (no
  // fabricated fallback number).
  let painNRS = null;
  if (answers['pain_scale'] !== undefined && answers['pain_scale'] !== null && answers['pain_scale'] !== '') {
    painNRS = Number(answers['pain_scale']);
  }

  const painColor = painNRS === null ? 'var(--text-muted)' : painNRS > 6 ? '#ef4444' : painNRS > 3 ? '#f59e0b' : '#10b981';
  const painLabel = painNRS === null ? 'Not recorded' : painNRS > 6 ? 'Severe Pain (ألم شديد)' : painNRS > 3 ? 'Moderate Pain (ألم متوسط)' : 'Mild / Low Pain (ألم خفيف)';

  // PROM Trend — only plotted from real assessment history (2+ visits with a
  // resolvable score). With fewer than 2, there's nothing real to trend, so
  // no points are fabricated — the chart shows an empty-history message.
  const assessmentHistory = (patient.assessments || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const trendPoints = assessmentHistory.length >= 2
    ? assessmentHistory
        .map((a, idx) => {
          const s = resolveFinalScore(a);
          if (s === null) return null;
          const x = (idx / (assessmentHistory.length - 1)) * 170 + 15;
          const y = 55 - (s / 100) * 45;
          return { score: s, label: a.date, x, y };
        })
        .filter(Boolean)
    : [];

  const firstPt = trendPoints[0] || null;
  const lastPt = trendPoints[trendPoints.length - 1] || null;
  const trendDiff = lastPt && firstPt ? lastPt.score - firstPt.score : null;

  const trendLinePath = trendPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const trendAreaPath = (firstPt && lastPt) ? `${trendLinePath} L ${lastPt.x} 60 L ${firstPt.x} 60 Z` : '';

  // Prefer the just-recorded dictation (playable immediately, before the
  // doctor hits "Confirm & Save All") over the last persisted evaluation's
  // audio, which only exists once a recording has actually been saved.
  const audioUrl = (dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null)
    || latestEvaluation?.audioUrl
    || null;

  const visitDateStr = patient.appointmentDate
    ? new Date(patient.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const visitTime = patient.appointmentTime || '—';

  const mainOrders = buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions);

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
        handleTimeUpdate={handleTimeUpdate}
        handleLoadedMetadata={handleLoadedMetadata}
        handleAudioEnd={handleAudioEnd}
        audioRef={audioRef}
        latestAssessment={latestAssessment}
        promName={promName}
        scoreDirection={scoreDirection}
        finalScore={finalScore}
        painNRS={painNRS}
        painColor={painColor}
        onBack={() => setShowReview(false)}
        diagnosticTests={diagnosticTests}
        treatmentOptions={treatmentOptions}
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

            {/* Card 2 — Pre-Visit PROM */}
            <SCard title={`Pre-Visit PROM — ${promName}`} icon={FlaskConical}>
              {!latestAssessment ? (
                <p className="pe-empty-note">No pre-visit assessment completed yet.</p>
              ) : (
                <div className="pe-prom-body">
                  <ScoreRing score={finalScore} size={96} stroke={9} direction={scoreDirection} />
                  <div className="pe-prom-list">
                    <div className="pe-prom-row">
                      <span className="pe-prom-label">Raw Score</span>
                      <span className="pe-prom-val" style={{ color: 'var(--text-primary)' }}>{latestAssessment.score} / {latestAssessment.maxScore}</span>
                    </div>
                    <div className="pe-prom-total">
                      <span>Final Score</span>
                      <span style={{ fontWeight: 800, color: finalScore === null ? 'var(--text-muted)' : 'var(--primary)' }}>
                        {finalScore === null ? '—' : finalScore} / 100
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{directionCaption}</div>
                    {disabilityInterpretation && (
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Disability Severity</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{disabilityInterpretation.label}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </SCard>

            {/* Card 3 — Pain Score (NRS) */}
            <SCard title="Pain Score (NRS)" icon={Zap}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: painColor }}>
                    {painNRS === null ? '—' : painNRS} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>/ 10</span>
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
                {painNRS !== null && (
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
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>0 (No Pain)</span>
                <span>3 (Mild)</span>
                <span>6 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </SCard>

            {/* Card 4 — PROM Trend */}
            <SCard title={`PROM Trend — ${promName}`} icon={TrendingUp}>
              {trendPoints.length === 0 ? (
                <p className="pe-empty-note">Not enough visit history yet — needs 2+ completed assessments to plot a trend.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                        {finalScore === null ? '—' : finalScore} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Overall {promName} Score
                      </div>
                    </div>
                    {trendDiff !== null && (() => {
                      // For a lower_better instrument a falling score is the
                      // improvement, so the up/down arrow's good/bad colour
                      // (not its direction) flips relative to higher_better.
                      const improving = scoreDirection === 'lower_better' ? trendDiff <= 0 : trendDiff >= 0;
                      return (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                          background: improving ? '#10b98118' : '#ef444418',
                          color: improving ? '#10b981' : '#ef4444',
                          border: `1px solid ${improving ? '#10b98130' : '#ef444430'}`
                        }}>
                          {trendDiff >= 0 ? `▲ +${trendDiff}` : `▼ ${trendDiff}`}
                        </span>
                      );
                    })()}
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
                </>
              )}
            </SCard>

          </div>{/* end left col */}

          {/* ── MIDDLE COLUMN (double width) ─────────────────────────── */}
          <div className="pe-col pe-col-mid">
            <SCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

              {/* 1. Doctor Voice Note — decoded waveform player */}
              <AudioWaveformPlayer
                audioUrl={audioUrl}
                audioRef={audioRef}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                audioProgress={audioProgress}
                audioCurrentTime={audioCurrentTime}
                audioDuration={audioDuration}
                formatAudioTime={formatAudioTime}
                handleTimeUpdate={handleTimeUpdate}
                handleLoadedMetadata={handleLoadedMetadata}
                handleAudioEnd={handleAudioEnd}
              />

              {/* 2. Note Paper (Clean Style) */}
              <div className="pe-note-paper">
                {dictation?.text && (
                  <div className="pe-note-section" style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 4 }}>
                    <h4>Raw Transcript</h4>
                    <p style={{ fontStyle: 'italic' }}>{dictation.text}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Check this against what was actually said — the fields below are the AI's structured read of it, and can be edited before you click Complete Visit.
                    </p>
                  </div>
                )}
                <div className="pe-note-section">
                  <h4 className="pe-note-h4"><FileText size={13} /> Clinical Notes</h4>
                  {isRecording ? (
                    <p style={{ opacity: 0.6 }}>{liveCaption || 'Listening…'}</p>
                  ) : (
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="No notes recorded yet."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  )}
                </div>
                <div className="pe-note-section">
                  <h4 className="pe-note-h4"><Stethoscope size={13} /> Diagnosis / Assessment</h4>
                  <input
                    className="form-control"
                    placeholder="No diagnosis recorded yet."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>
                <div className="pe-note-section">
                  <h4 className="pe-note-h4"><FlaskConical size={13} /> Diagnostic Tests</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {diagnosticTests.map((t) => (
                      <label
                        key={t.id}
                        className={`pe-test-pill ${selectedTests.includes(t.id) ? 'selected' : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                          fontSize: 12, padding: '5px 10px', borderRadius: 999,
                          border: `1px solid ${selectedTests.includes(t.id) ? 'var(--primary)' : 'var(--border)'}`,
                          background: selectedTests.includes(t.id) ? 'var(--primary-light)' : 'var(--surface-2)',
                          color: selectedTests.includes(t.id) ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: selectedTests.includes(t.id) ? 700 : 500,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(t.id)}
                          onChange={() => toggleDiagnosticTest(t.id)}
                          style={{ margin: 0 }}
                        />
                        {t.icon} {t.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="pe-note-section">
                  <h4 className="pe-note-h4"><Pill size={13} /> Treatment Plan</h4>
                  {treatments.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No treatments added yet.</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {treatments.map((t) => (
                      <div key={t.uid} className="pe-treatment-card">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            className="form-control"
                            style={{ flex: 1 }}
                            value={t.type}
                            onChange={(e) => updateTreatmentEntry(t.uid, 'type', e.target.value)}
                          >
                            <option value="">Select treatment type…</option>
                            {treatmentOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.icon} {opt.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="pe-treatment-remove"
                            onClick={() => removeTreatmentEntry(t.uid)}
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            className="form-control"
                            style={{ flex: 1 }}
                            placeholder="Duration (e.g. 6 weeks)"
                            value={t.duration}
                            onChange={(e) => updateTreatmentEntry(t.uid, 'duration', e.target.value)}
                          />
                          <input
                            className="form-control"
                            style={{ flex: 1 }}
                            type="date"
                            value={t.followUpDate || ''}
                            onChange={(e) => updateTreatmentEntry(t.uid, 'followUpDate', e.target.value)}
                          />
                        </div>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Details / instructions"
                          value={t.details}
                          onChange={(e) => updateTreatmentEntry(t.uid, 'details', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={addTreatmentEntry}
                  >
                    + Add Treatment
                  </button>
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
              {mainOrders.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No orders recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {mainOrders.map((order) => (
                    <div key={order.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{order.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{order.title}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${order.statusColor}18`, color: order.statusColor, border: `1px solid ${order.statusColor}30` }}>{order.status}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order)}
                          disabled={deletingOrderId === order.id}
                          title="Remove order"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6, border: 'none',
                            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                            opacity: deletingOrderId === order.id ? 0.5 : 1, flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 12%, transparent)'; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{order.summary} — {order.details}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 14px' }} />

              {/* ── Follow-Up ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Follow-Up</span>
                </div>
                {latestTreatment?.followUpDate ? (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{latestTreatment.followUpDate}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{latestTreatment.type}{latestTreatment.details ? ` — ${latestTreatment.details}` : ''}</div>
                    </div>
                    <CalendarCheck size={22} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No follow-up scheduled yet.</p>
                )}
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
        detectedLanguage={detectedLanguage}
        analyserRef={analyserRef}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onCancel={handleCancelDictation}
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
