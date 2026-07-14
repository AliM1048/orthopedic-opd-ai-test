import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Brain, Clock, FlaskConical, Pill, CalendarCheck, Stethoscope,
         FilePlus, ClipboardList, Printer, Send, UserCheck, Play, Pause } from 'lucide-react';
import { useDictation } from '../hooks/useDictation';
import { DIAGNOSTIC_TESTS, TREATMENT_OPTIONS } from '../data/mockData';
import DictationRecordingModal from '../components/DictationRecordingModal';

function uid() {
  return `t${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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

/* ── Static demo data ───────────────────────────────────────────────────── */
const STATIC_DATA = {
  p001: {
    chiefComplaint: 'Severe right knee pain worsening on stair climbing.',
    vitals: { bp: '132/84', hr: 76, bmi: 28.1, temp: '36.7°C' },
    prom: {
      pain:     { label: 'Pain',              score: 62, max: 100, color: '#ef4444' },
      symptoms: { label: 'Symptoms',          score: 70, max: 100, color: '#f59e0b' },
      function: { label: 'Physical Function', score: 55, max: 100, color: '#6366f1' },
      qol:      { label: 'Quality of Life',   score: 68, max: 100, color: '#10b981' },
    },
    notes: {
      history: 'Patient is a 52-year-old male presenting with chronic right knee pain, worsening over the last 6 months. Pain is exacerbated by stair climbing and prolonged standing. Reports morning stiffness lasting ~20 mins. No recent trauma.',
      physicalExam: 'Right knee: Mild effusion present. Tenderness along medial joint line. ROM limited to 10-110 degrees with crepitus. Ligaments (ACL, PCL, MCL, LCL) stable. Negative McMurray\'s.',
      assessment: '1. Primary Osteoarthritis of Right Knee (Grade 3)\n2. Overweight (BMI 28.1) contributing to joint load.',
      plan: '1. Prescribe NSAIDs (Diclofenac) for 7 days.\n2. Recommend physiotherapy focused on quad strengthening.\n3. Weight management counseling.\n4. Follow-up in 4 weeks to assess response to conservative management.'
    },
    audioUrl: '/sample.mp3',
    imaging: [
      { type: 'X-Ray – Right Knee',  status: 'completed', date: '10 May 2026' },
      { type: 'MRI – Right Knee',    status: 'pending',   date: '12 May 2026' },
    ],
    medications: [
      { name: 'Diclofenac 75mg',  dose: '1 tab twice daily',   duration: '7 days' },
      { name: 'Omeprazole 20mg',  dose: '1 cap once daily',    duration: '7 days' },
    ],
    followUp: '4 weeks',
    aiSuggestions: [
      'Consider weight-bearing X-ray series for grading.',
      'Physiotherapy 3×/week may improve ROM significantly.',
      'Reassess NSAID tolerance at follow-up — renal profile recommended.',
    ],
  },
};

function getStaticData(patientId) {
  return STATIC_DATA[patientId] || {
    chiefComplaint: 'Patient reports chronic pain and limited range of motion.',
    vitals: { bp: '120/80', hr: 72, bmi: 24.5, temp: '36.8°C' },
    prom: {
      pain:     { label: 'Pain',              score: 60, max: 100, color: '#ef4444' },
      symptoms: { label: 'Symptoms',          score: 65, max: 100, color: '#f59e0b' },
      function: { label: 'Physical Function', score: 58, max: 100, color: '#6366f1' },
      qol:      { label: 'Quality of Life',   score: 70, max: 100, color: '#10b981' },
    },
    notes: {
      history: 'Patient presents with joint pain.',
      physicalExam: 'Unremarkable aside from localized tenderness.',
      assessment: 'Undiagnosed arthralgia.',
      plan: 'Order imaging and prescribe NSAIDs PRN.'
    },
    imaging: [],
    medications: [],
    followUp: '—',
    aiSuggestions: ['No AI suggestions available at this time.'],
  };
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

/* ════════════════════════════════════════════════════════════════════════ */
export default function PhysicianEvaluation({ patients, onAddEvaluation, onAddDiagnostic, onAddTreatment }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient   = patients.find((p) => p.id === patientId);

  const [diagnosis, setDiagnosis]             = useState('');
  const [notes, setNotes]                     = useState('');
  const [selectedTests, setSelectedTests]     = useState([]);
  const [treatments, setTreatments]           = useState([]);
  const [dictation, setDictation]             = useState(null);
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [error, setError]                     = useState(null);
  const [saved, setSaved]                     = useState(false);

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
    if (onAddEvaluation) onAddEvaluation(patientId, {
      id: `ev${Date.now()}`, date: new Date().toISOString().split('T')[0],
      physician: 'Dr. Khalid Mansour', notes: notes.trim(), diagnosis: diagnosis.trim(), audioUrl: null,
    });
    selectedTests.forEach((testId) => {
      const test = DIAGNOSTIC_TESTS.find((t) => t.id === testId);
      if (test && onAddDiagnostic) onAddDiagnostic(patientId, {
        id: `d${Date.now()}-${testId}`, type: test.name,
        date: new Date().toISOString().split('T')[0], status: 'pending', result: null,
      });
    });
    treatments.filter((t) => t.type).forEach((t) => {
      const opt = TREATMENT_OPTIONS.find((o) => o.id === t.type);
      if (opt && onAddTreatment) onAddTreatment(patientId, {
        id: `tr${Date.now()}-${t.type}`, type: opt.name,
        date: new Date().toISOString().split('T')[0], physician: 'Dr. Khalid Mansour',
        duration: t.duration || 'TBD', details: t.details?.trim() || '',
        followUpDate: t.followUpDate || null, status: 'active',
      });
    });
    setSaved(true);
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
  const sd          = getStaticData(patientId);
  const promScores  = Object.values(sd.prom);
  const finalScore  = Math.round(promScores.reduce((acc, s) => acc + s.score, 0) / promScores.length);

  const visitDateStr = patient.appointmentDate
    ? new Date(patient.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const visitTime = patient.appointmentTime || '—';

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
              <p className="pe-complaint-text">{sd.chiefComplaint}</p>
            </SCard>

            {/* Card 2 — Pre-Visit PROM */}
            <SCard title="Pre-Visit PROM" icon={FlaskConical}>
              <div className="pe-prom-body">
                {/* Score ring */}
                <ScoreRing score={finalScore} size={96} stroke={9} />
                {/* Score list */}
                <div className="pe-prom-list">
                  {promScores.map((s) => (
                    <div key={s.label} className="pe-prom-row">
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
            </SCard>

            {/* Card 3 — Vitals by Clerk */}
            <SCard title="Vitals by Clerk" icon={Stethoscope}>
              <table className="pe-vitals-table">
                <tbody>
                  <tr>
                    <td className="pe-vt-label">🩸 Blood Pressure</td>
                    <td className="pe-vt-value">{sd.vitals.bp} <span className="pe-vt-unit">mmHg</span></td>
                  </tr>
                  <tr>
                    <td className="pe-vt-label">❤️ Heart Rate</td>
                    <td className="pe-vt-value">{sd.vitals.hr} <span className="pe-vt-unit">bpm</span></td>
                  </tr>
                  <tr>
                    <td className="pe-vt-label">⚖️ BMI</td>
                    <td className="pe-vt-value">{sd.vitals.bmi} <span className="pe-vt-unit">kg/m²</span></td>
                  </tr>
                  <tr>
                    <td className="pe-vt-label">🌡️ Temperature</td>
                    <td className="pe-vt-value">{sd.vitals.temp}</td>
                  </tr>
                </tbody>
              </table>
            </SCard>

          </div>{/* end left col */}

          {/* ── MIDDLE COLUMN (double width) ─────────────────────────── */}
          <div className="pe-col pe-col-mid">
            <SCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              
              {/* 1. WhatsApp-Style Audio Player */}
              <div className="pe-audio-player">
                {sd.audioUrl && (
                  <audio 
                    ref={audioRef} 
                    src={sd.audioUrl} 
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleAudioEnd}
                  />
                )}
                <button className="pe-audio-play-btn" onClick={togglePlay} disabled={!sd.audioUrl}>
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <div className="pe-audio-waveform">
                  <div className="pe-audio-track" onClick={handleSeek}>
                    <div className="pe-audio-progress" style={{ width: `${audioProgress || 0}%` }}></div>
                    <div className="pe-audio-knob" style={{ left: `${audioProgress || 0}%` }}></div>
                  </div>
                </div>
                <div className="pe-audio-time">
                  {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                </div>
              </div>

              {/* 2. Note Paper (Clean Style) */}
              <div className="pe-note-paper">
                <div className="pe-note-section">
                  <h4>History of Present Illness</h4>
                  <p>{liveCaption || dictation?.structured?.history || sd.notes.history}</p>
                </div>
                <div className="pe-note-section">
                  <h4>Physical Exam</h4>
                  <p>{dictation?.structured?.physical_exam || sd.notes.physicalExam}</p>
                </div>
                <div className="pe-note-section">
                  <h4>Assessment</h4>
                  <p>{diagnosis || dictation?.structured?.diagnosis || sd.notes.assessment}</p>
                </div>
                <div className="pe-note-section">
                  <h4>Plan</h4>
                  <p>
                    {treatments.map(t => `${t.type} ${t.duration}`).join(', ') || 
                     dictation?.structured?.treatments?.map(t => `${t.type}`).join(', ') || sd.notes.plan}
                  </p>
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

            {/* Card 1 — Imaging & Orders */}
            <SCard title="Imaging &amp; Orders" icon={FlaskConical}>
              {sd.imaging.length === 0 ? (
                <p className="pe-empty-note">No orders placed yet.</p>
              ) : (
                <div className="pe-imaging-list">
                  {sd.imaging.map((img, i) => (
                    <div key={i} className="pe-imaging-row">
                      <div>
                        <div className="pe-imaging-type">{img.type}</div>
                        <div className="pe-imaging-date">{img.date}</div>
                      </div>
                      <StatusBadge status={img.status} />
                    </div>
                  ))}
                </div>
              )}
            </SCard>

            {/* Card 2 — Medications */}
            <SCard title="Medications" icon={Pill}>
              {sd.medications.length === 0 ? (
                <p className="pe-empty-note">No medications prescribed yet.</p>
              ) : (
                <div className="pe-med-list">
                  {sd.medications.map((m, i) => (
                    <div key={i} className="pe-med-row">
                      <div className="pe-med-icon">💊</div>
                      <div className="pe-med-info">
                        <div className="pe-med-name">{m.name}</div>
                        <div className="pe-med-dose">{m.dose} · {m.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>

            {/* Card 3 — Follow-Up */}
            <SCard title="Follow-Up" icon={CalendarCheck}>
              <div className="pe-followup-body">
                <CalendarCheck size={28} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                <div>
                  <div className="pe-followup-value">{sd.followUp}</div>
                  <div className="pe-followup-sub">from today's visit</div>
                </div>
              </div>
            </SCard>

            {/* Card 4 — AI Suggestions */}
            <SCard title="AI Suggestions" icon={Brain}>
              <ul className="pe-ai-list">
                {sd.aiSuggestions.map((tip, i) => (
                  <li key={i} className="pe-ai-item">
                    <span className="pe-ai-dot" />
                    {tip}
                  </li>
                ))}
              </ul>
            </SCard>

          </div>{/* end right col */}

        </div>{/* end pe-grid */}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — Quick Actions
        ══════════════════════════════════════════════════════════════ */}
        <div className="pe-quick-actions">
          <span className="pe-qa-label">Quick Actions</span>
          <div className="pe-qa-buttons">
            <button className="pe-qa-btn pe-qa-note" onClick={() => {}}>
              <FilePlus size={18} />
              <span>New Note</span>
            </button>
            <button className="pe-qa-btn pe-qa-rx" onClick={() => {}}>
              <ClipboardList size={18} />
              <span>Order Prescription</span>
            </button>
            <button className="pe-qa-btn pe-qa-print" onClick={() => window.print()}>
              <Printer size={18} />
              <span>Print Summary</span>
            </button>
            <button className="pe-qa-btn pe-qa-send" onClick={() => {}}>
              <Send size={18} />
              <span>Send to Patient</span>
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
    </>
  );
}
