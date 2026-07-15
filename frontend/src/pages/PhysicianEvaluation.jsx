import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Brain, FlaskConical, Pill, CalendarCheck, Stethoscope,
         FilePlus, ClipboardList, Printer, Send, UserCheck, Play, Pause, Check, X } from 'lucide-react';
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

/* ── PROM scoring — derived from the patient's real submitted assessment ──
   Pain and Function (QuickDASH) use the scoreValues already defined per
   question in ASSESSMENT_CONFIG. Symptoms and Quality of Life sections don't
   carry scoreValues, but their radio options are already ordered from best
   to worst answer, so the option index normalizes into the same 0-100 scale.
   Every metric is inverted to "wellness" (higher = better) so it lines up
   with ScoreRing's green/amber/red convention. */
const PROM_META = {
  pain:     { label: 'Pain',              color: '#ef4444' },
  symptoms: { label: 'Symptoms',          color: '#f59e0b' },
  function: { label: 'Physical Function', color: '#6366f1' },
  qol:      { label: 'Quality of Life',   color: '#10b981' },
};

function sectionSeverity(section, answers) {
  if (!section) return null;
  const radioQs = section.questions.filter((q) => q.type === 'radio' && Array.isArray(q.options) && q.options.length > 1);
  const answered = radioQs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '');
  if (!answered.length) return null;
  const total = answered.reduce((acc, q) => acc + answers[q.id] / (q.options.length - 1), 0);
  return (total / answered.length) * 100;
}

function computePromScores(bodyArea, answers) {
  if (!answers) return {};
  const config = ASSESSMENT_CONFIG[bodyArea] || ASSESSMENT_CONFIG.Other;
  const sections = config.sections;
  const painSection = sections.find((s) => s.id === 'pain');
  const qdashSection = sections.find((s) => s.scoreCalculation === 'quickdash');
  const symptomsSection = sections.find((s) => s.id === 'symptoms');
  const qolSection = sections.find((s) => s.id === 'qol');

  const result = {};

  if (painSection) {
    const painResult = calculateSectionScore(answers, painSection.questions);
    if (painResult && painResult.max > 0) {
      result.pain = Math.round(100 - (painResult.score / painResult.max) * 100);
    }
  }

  if (qdashSection) {
    const qdashScore = calculateQuickDASH(answers, qdashSection.questions);
    if (qdashScore !== null) result.function = Math.round(Math.max(0, 100 - qdashScore));
  }

  const symptomsSeverity = sectionSeverity(symptomsSection, answers);
  if (symptomsSeverity !== null) result.symptoms = Math.round(100 - symptomsSeverity);

  const qolSeverity = sectionSeverity(qolSection, answers);
  if (qolSeverity !== null) result.qol = Math.round(100 - qolSeverity);

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

/* ════════════════════════════════════════════════════════════════════════ */
export default function PhysicianEvaluation({ patients, user, onAddEvaluation, onAddDiagnostic, onAddTreatment, onMarkEvaluationSent }) {
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

  const promRaw = latestAssessment ? computePromScores(latestAssessment.bodyArea || patient.bodyArea, latestAssessment.answers) : {};
  const promEntries = Object.keys(PROM_META)
    .filter((key) => promRaw[key] !== undefined && promRaw[key] !== null)
    .map((key) => ({ key, ...PROM_META[key], score: promRaw[key] }));
  const finalScore = promEntries.length
    ? Math.round(promEntries.reduce((acc, s) => acc + s.score, 0) / promEntries.length)
    : null;

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
            <SCard title="Pre-Visit PROM" icon={FlaskConical}>
              {promEntries.length === 0 ? (
                <p className="pe-empty-note">No pre-visit assessment completed yet.</p>
              ) : (
                <div className="pe-prom-body">
                  {/* Score ring */}
                  <ScoreRing score={finalScore} size={96} stroke={9} />
                  {/* Score list */}
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

            {/* Card 1 — Imaging & Orders */}
            <SCard title="Imaging &amp; Orders" icon={FlaskConical}>
              {selectedTests.length > 0 && (
                <div className="pe-imaging-list" style={{ marginBottom: sortedDiagnostics.length ? 10 : 0 }}>
                  {selectedTests.map((testId) => {
                    const test = DIAGNOSTIC_TESTS.find((t) => t.id === testId);
                    return (
                      <div key={testId} className="pe-imaging-row">
                        <div>
                          <div className="pe-imaging-type">{test?.name || testId}</div>
                          <div className="pe-imaging-date">Not saved yet — from dictation</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: '#94a3b818', color: '#64748b', border: '1px solid #94a3b830',
                          }}>Staged</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTests((prev) => prev.filter((id) => id !== testId))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {sortedDiagnostics.length === 0 && selectedTests.length === 0 ? (
                <p className="pe-empty-note">No orders placed yet.</p>
              ) : (
                <div className="pe-imaging-list">
                  {sortedDiagnostics.map((img) => (
                    <div key={img.id} className="pe-imaging-row">
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
              {medications.length === 0 ? (
                <p className="pe-empty-note">No medications prescribed yet.</p>
              ) : (
                <div className="pe-med-list">
                  {medications.map((m) => (
                    <div key={m.id} className="pe-med-row">
                      <div className="pe-med-icon">💊</div>
                      <div className="pe-med-info">
                        <div className="pe-med-name">{m.details || m.type}</div>
                        <div className="pe-med-dose">{m.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-outline btn-sm mt-2" style={{ width: '100%' }} onClick={() => setShowMedModal(true)}>
                Add Medication
              </button>
            </SCard>

            {/* Card 3 — Follow-Up */}
            <SCard title="Follow-Up" icon={CalendarCheck}>
              <div className="pe-followup-body">
                <CalendarCheck size={28} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                <div>
                  <div className="pe-followup-value">{latestTreatment?.followUpDate || 'None scheduled'}</div>
                  <div className="pe-followup-sub">{latestTreatment?.followUpDate ? 'from today\'s visit' : 'no follow-up on file'}</div>
                </div>
              </div>
            </SCard>

            {/* Card 4 — AI Suggestions */}
            <SCard title="AI Suggestions" icon={Brain}>
              <p className="pe-empty-note">No AI suggestions available at this time.</p>
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
            <button className="pe-qa-btn pe-qa-print" onClick={() => window.print()}>
              <Printer size={18} />
              <span>Print Summary</span>
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
