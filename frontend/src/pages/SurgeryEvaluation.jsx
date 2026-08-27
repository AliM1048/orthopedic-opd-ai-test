import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, FlaskConical, Pill, CalendarCheck, Scissors,
         FilePlus, ClipboardList, Printer, Send, UserCheck, Check, X,
         FileText, Trash2, Search, ListChecks, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useDictation } from '../hooks/useDictation';
import { useLookup } from '../hooks/useLookupData';
import DictationRecordingModal from '../components/DictationRecordingModal';
import AudioWaveformPlayer from '../components/AudioWaveformPlayer';
import PrintDocModal from '../components/PrintDocModal';
import PrintTypeModal from '../components/PrintTypeModal';
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

/* ── Operative Note ──────────────────────────────────────────────────────── */
const SOAP_SECTIONS = [
  { id: 'procedurePerformed', label: 'Procedure Performed', icon: Scissors, rows: 3,
    placeholder: 'e.g. Arthroscopic meniscus repair, right knee.' },
  { id: 'findings', label: 'Findings', icon: Search, rows: 4,
    placeholder: 'Intraoperative findings — tissue condition, extent of damage, etc.' },
  { id: 'postoperativePlan', label: 'Postoperative Plan', icon: ListChecks, rows: 4,
    placeholder: 'Recovery plan — pain management, weight-bearing status, rehab, follow-up…' },
];

const EMPTY_SOAP = SOAP_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {});

// The evaluation's `diagnosis`/`notes` columns are kept for older pages that
// still read them directly (patient timeline, analytics diagnosis tally,
// print views) — this derives both from the structured note so there's one
// source of truth (`soap`) instead of two things that can drift apart.
function deriveLegacyFields(soap) {
  const findingsText = (soap.findings || '').trim();
  const diagnosis = findingsText.split('\n')[0].trim();
  const notes = SOAP_SECTIONS
    .map((s) => [s.label, (soap[s.id] || '').trim()])
    .filter(([, text]) => text)
    .map(([label, text]) => `${label}:\n${text}`)
    .join('\n\n');
  return { diagnosis, notes };
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

/* ── Orders — same shape/status colors as Physician Evaluation's printable
   orders list, so a treatment/diagnostic order reads consistently wherever
   it's shown across the app. ── */
const ORDER_STATUS_COLORS = {
  pending: '#d97706',
  active: '#059669',
  completed: '#059669',
  scheduled: '#0369a1',
};

function iconForName(name, options) {
  return options.find((o) => o.name.toLowerCase() === (name || '').toLowerCase())?.icon || '📄';
}

function buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions) {
  const treatmentOrders = (patient.treatments || []).map((t) => ({
    id: t.id,
    kind: 'treatment',
    icon: iconForName(t.type, treatmentOptions),
    title: `${t.type} Order`,
    status: t.status,
    statusColor: ORDER_STATUS_COLORS[t.status] || '#7a9a9e',
    summary: t.details || t.type,
    details: `Duration: ${t.duration}`,
    note: null,
    printTitle: `${t.type} Order`,
    printBody: [
      ['Ordered By', t.physician],
      ['Treatment', t.type],
      ['Details', t.details || '—'],
      ['Duration', t.duration],
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
    statusColor: ORDER_STATUS_COLORS[d.status] || '#7a9a9e',
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

/* ── Review & Print View ─────────────────────────────────────────────────── */
function ReviewPrintView({ patient, surgeonName, audioUrl, isPlaying, togglePlay, audioProgress, audioCurrentTime, audioDuration, formatAudioTime, handleTimeUpdate, handleLoadedMetadata, handleAudioEnd, audioRef, onBack, diagnosticTests, treatmentOptions }) {
  const [printOrder, setPrintOrder] = React.useState(null);
  const [showPrintTypeModal, setShowPrintTypeModal] = React.useState(false);
  const [printDocType, setPrintDocType] = React.useState(null);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const evaluation = (patient?.surgeryEvaluations || []).sort((a, b) => b.date.localeCompare(a.date))[0];
  const soap = evaluation?.soapNote || {};
  const orders = buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions);

  // Printing is blocking in mainstream browsers — window.print() only returns
  // once the print dialog closes — so resetting printDocType right after the
  // call still leaves the insurance flag visible for the whole print/preview.
  React.useEffect(() => {
    if (printDocType) {
      window.print();
      setPrintDocType(null);
    }
  }, [printDocType]);

  return (
    <div className="pe-review-root" data-doc-type={printDocType || 'standard'} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Insurance flag — placeholder until the real insurance layout is provided */}
      {printDocType === 'insurance' && (
        <div style={{ background: '#fef3c7', color: '#92400e', textAlign: 'center', padding: '6px 12px', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>
          🏷 INSURANCE COPY
        </div>
      )}
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
          <button onClick={() => setShowPrintTypeModal(true)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#0369a1,#6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            🖨 Print Full Summary
          </button>
        </div>
      </div>

      <div className="pe-review-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, padding: '16px 24px', flex: 1, alignItems: 'start' }}>

        {/* ── LEFT: Patient + Voice Note ───────────────────────────────── */}
        <div className="pe-review-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ background: patient?.avatar || 'var(--primary)', height: 6 }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{patient?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{patient?.mrn} · {patient?.age} yrs · {patient?.bodyArea}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <div><span style={{ fontWeight: 600 }}>Procedure:</span> {soap.procedurePerformed || evaluation?.diagnosis || '—'}</div>
                <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600 }}>Surgeon:</span> {surgeonName}</div>
                <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600 }}>Date:</span> {today}</div>
              </div>
            </div>
          </div>

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
          </div>
        </div>

        {/* ── RIGHT: Operative note + orders + signature ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '3px solid #0369a1', display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={rasoulLogo} alt="Al-Rasoul Al-Aazam Hospital" style={{ width: 56, height: 56, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Al-Rasoul Al-Aazam Hospital</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orthopedic OPD — Operative Note</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {SOAP_SECTIONS.map((s) => (
                <div key={s.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{soap[s.id] || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '16px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Orders</div>
            {orders.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No orders recorded.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Order</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Details</th>
                    <th style={{ padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <tr key={order.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 8px' }}>
                        <span style={{ fontSize: 15, marginRight: 6 }}>{order.icon}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.title}</span>
                      </td>
                      <td style={{ padding: '9px 8px', color: '#475569' }}>{order.summary}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${order.statusColor}18`, color: order.statusColor, border: `1px solid ${order.statusColor}25` }}>{order.status}</span>
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'center' }}>
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
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              <div>Date: {today}</div>
              <div style={{ marginTop: 3 }}>Orthopedic OPD — Official Clinical Document</div>
              <div style={{ marginTop: 3, fontWeight: 600 }}>This document is computer-generated.</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 140, borderBottom: '2px solid #334155', marginBottom: 4 }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{surgeonName}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>Attending Surgeon</div>
            </div>
          </div>
        </div>
      </div>

      {printOrder && (
        <PrintDocModal
          order={printOrder}
          patient={patient}
          physicianName={surgeonName}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {showPrintTypeModal && (
        <PrintTypeModal
          onChoose={(type) => { setShowPrintTypeModal(false); setPrintDocType(type); }}
          onClose={() => setShowPrintTypeModal(false)}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */

export default function SurgeryEvaluation({ patients, user, onAddSurgeryEvaluation, onUpdateSurgeryEvaluation, onAddDiagnostic, onDeleteDiagnostic, onAddTreatment, onDeleteTreatment, onMarkSurgeryEvaluationSent }) {
  /* eslint-disable no-use-before-define */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient   = patients.find((p) => p.id === patientId);
  const surgeonName = user?.name || 'Surgeon';

  const [soap, setSoap]                       = useState(EMPTY_SOAP);
  const [selectedTests, setSelectedTests]     = useState([]);
  const [treatments, setTreatments]           = useState([]);
  const [dictation, setDictation]             = useState(null);
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [error, setError]                     = useState(null);
  const [saved, setSaved]                     = useState(false);
  // The evaluation row (if any) already saved today for this patient — once
  // set, "Complete Visit" and "New Note" amend it in place instead of each
  // inserting their own row, so one encounter doesn't fragment into several
  // partial evaluations.
  const [currentEvaluationId, setCurrentEvaluationId] = useState(null);

  /* ── Quick-action modal state ── */
  const [showMedModal, setShowMedModal] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', dose: '', duration: '' });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [sendingToPatient, setSendingToPatient] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  // Seed the operative note from the most recent saved evaluation once per
  // patient, so reopening an existing evaluation is editable too — not just
  // a fresh dictation. Only fills in fields that are actually blank so it
  // never clobbers an in-progress dictation or edit.
  useEffect(() => {
    if (!patient) return;
    const latestEval = latestByDate(patient.surgeryEvaluations);
    const seeded = (latestEval?.soapNote && typeof latestEval.soapNote === 'object') ? latestEval.soapNote : null;
    setSoap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const field of Object.keys(EMPTY_SOAP)) {
        if (!next[field] && seeded?.[field]) { next[field] = seeded[field]; changed = true; }
      }
      return changed ? next : prev;
    });
    // Only today's evaluation counts as "the current encounter" to amend —
    // an older saved evaluation is a past visit and must stay untouched.
    setCurrentEvaluationId(latestEval?.date === todayIso() ? latestEval.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const updateSoap = (field, value) => setSoap((prev) => ({ ...prev, [field]: value }));

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

  /* ── Audio Player State (playback of the surgeon's recorded note) ── */
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
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
    // loadedmetadata — Chrome only computes the real value once playback
    // seeks near the end. Force that, capture the now-finite duration, then
    // seek back to the start so this doesn't disturb normal playback.
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
    if (s.soap) {
      setSoap((prev) => {
        const next = { ...prev };
        for (const field of Object.keys(EMPTY_SOAP)) {
          if (s.soap[field]) next[field] = s.soap[field];
        }
        return next;
      });
    }
    if (s.diagnostic_tests?.length) setSelectedTests(s.diagnostic_tests);
    if (s.treatments?.length)
      setTreatments(s.treatments.map((t) => ({
        uid: uid(), type: t.type, duration: t.duration || '',
        details: t.details || '', followUpDate: t.followUpDate || '',
      })));
  };

  const { isRecording, isProcessing, elapsedSeconds, liveCaption, detectedLanguage, analyserRef, startRecording, stopRecording, cancelRecording } =
    useDictation({ patientId, noteType: 'surgery', onResult: handleDictationResult, onError: setError });

  const { diagnosticTests, treatmentOptions } = useLookup();

  // Opens the modal in its idle state — recording itself starts when the
  // surgeon clicks the mic inside the modal, not the instant the modal opens.
  const handleStartDictation = () => { setDictation(null); setError(null); setShowDictationModal(true); };
  const handleRetryDictation  = () => { setError(null); startRecording(); };
  const handleCloseDictationModal = () => { setShowDictationModal(false); setError(null); };
  // Discards the current take (recording or in-flight transcription) and
  // closes the modal — see useDictation's cancelRecording for what this
  // aborts under the hood.
  const handleCancelDictation = () => { cancelRecording(); setShowDictationModal(false); setError(null); };

  const handleSaveAll = () => {
    const { diagnosis, notes } = deriveLegacyFields(soap);
    if (!diagnosis && !notes) return;
    const audioUrl = dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null;
    if (currentEvaluationId && onUpdateSurgeryEvaluation) {
      onUpdateSurgeryEvaluation(patientId, currentEvaluationId, { notes, diagnosis, audioUrl, soapNote: soap });
    } else if (onAddSurgeryEvaluation) {
      const newId = `ev${Date.now()}`;
      onAddSurgeryEvaluation(patientId, {
        id: newId, date: todayIso(),
        surgeon: surgeonName, notes, diagnosis, audioUrl, soapNote: soap,
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
        date: todayIso(), physician: surgeonName,
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
      id: uid(), type: 'Medication', date: todayIso(), physician: surgeonName,
      duration: medForm.duration.trim() || 'TBD', details, followUpDate: null, status: 'active',
    }))
      .then(() => notifySuccess('Prescription saved'))
      .catch(() => notifyError('Failed to save prescription'));
    setMedForm({ name: '', dose: '', duration: '' });
    setShowMedModal(false);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    // Appends to today's evaluation's Postoperative Plan section (if one is
    // already open) instead of inserting a separate row, so a quick note
    // doesn't fork the encounter into a second, diagnosis-less evaluation —
    // see currentEvaluationId. Postoperative Plan is the catch-all section
    // for anything said outside the structured dictation flow.
    const mergedPlan = soap.postoperativePlan.trim() ? `${soap.postoperativePlan.trim()}\n\n${noteText.trim()}` : noteText.trim();
    const nextSoap = { ...soap, postoperativePlan: mergedPlan };
    setSoap(nextSoap);
    const { diagnosis, notes } = deriveLegacyFields(nextSoap);
    let promise;
    if (currentEvaluationId && onUpdateSurgeryEvaluation) {
      promise = onUpdateSurgeryEvaluation(patientId, currentEvaluationId, { notes, diagnosis, soapNote: nextSoap });
    } else if (onAddSurgeryEvaluation) {
      const newId = `ev${Date.now()}`;
      const audioUrl = dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null;
      promise = onAddSurgeryEvaluation(patientId, {
        id: newId, date: todayIso(),
        surgeon: surgeonName, notes, diagnosis, audioUrl, soapNote: nextSoap,
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
    if (!onMarkSurgeryEvaluationSent || sendingToPatient) return;
    setSendingToPatient(true);
    Promise.resolve(onMarkSurgeryEvaluationSent(patientId, evaluationId))
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
      <div className="topbar"><div className="topbar-left"><h1>Surgery Evaluation</h1></div></div>
      <div className="page-body">
        <div className="empty-state">
          <div className="empty-state-icon"><Scissors size={36} /></div>
          <p>No patient selected.</p>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/surgeries')}>Back to Surgeries</button>
        </div>
      </div>
    </>
  );

  if (saved) return (
    <>
      <div className="topbar"><div className="topbar-left"><h1>Operative Note Recorded</h1></div></div>
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Operative Note Recorded</h2>
          <p className="text-muted mb-4">Surgery evaluation saved for {patient.name}.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
            <button className="btn btn-outline"  onClick={() => navigate('/surgeries')}>Back to Surgeries</button>
          </div>
        </div>
      </div>
    </>
  );

  /* ── Derived values ── */
  const latestEvaluation = latestByDate(patient.surgeryEvaluations);
  const latestTreatment  = latestByDate(patient.treatments);
  const hasAllergies = patient.allergies && patient.allergies.toLowerCase() !== 'none';

  // Prefer the just-recorded dictation (playable immediately, before the
  // surgeon hits "Confirm & Save All") over the last persisted evaluation's
  // audio, which only exists once a recording has actually been saved.
  const audioUrl = (dictation?.audio_filename ? `${API_BASE}/audio/${dictation.audio_filename}` : null)
    || latestEvaluation?.audioUrl
    || null;

  const mainOrders = buildOrdersFromPatient(patient, diagnosticTests, treatmentOptions);

  if (showReview) {
    return (
      <ReviewPrintView
        patient={patient}
        surgeonName={surgeonName}
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
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/surgeries')}><ArrowLeft size={18} /></button>
          <div>
            <h1>Surgery Evaluation</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
      </div>

      {/* ── Page Body ───────────────────────────────────────────────────── */}
      <div className="pe-page-body">

        {/* ══════════════════════════════════════════════════════════════
            Patient identity / safety strip — the OR-relevant facts at a
            glance (right patient, right side, known allergies) instead of
            the outpatient intake/PROM detail already shown on the
            Physician Evaluation page.
        ══════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, padding: '16px 24px', flexWrap: 'wrap' }}>
          <div className="patient-avatar" style={{ background: patient.avatar, width: 52, height: 52, fontSize: 18, flexShrink: 0 }}>
            {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{patient.name}</span>
              <span className="badge badge-completed">{patient.gender} · {patient.age}y</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              MRN {patient.mrn} · {patient.bodyArea} · Blood Type {patient.bloodType}
            </div>
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: 10, minWidth: 160,
            background: hasAllergies ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--surface-2)',
            border: hasAllergies ? '1px solid color-mix(in srgb, var(--danger) 35%, transparent)' : '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: hasAllergies ? 'var(--danger)' : 'var(--text-muted)' }}>
              {hasAllergies && <AlertTriangle size={12} />} Allergies
            </div>
            <div style={{ fontWeight: 700, color: hasAllergies ? 'var(--danger)' : 'var(--text-primary)', fontSize: 13, marginTop: 2 }}>
              {patient.allergies || 'None on file'}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Main grid — operative note (left) + orders/follow-up (right)
        ══════════════════════════════════════════════════════════════ */}
        <div className="pe-grid" style={{ gridTemplateColumns: '1fr 340px' }}>

          {/* ── MAIN COLUMN — dictation + operative note ─────────────── */}
          <div className="pe-col pe-col-mid">
            <SCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

              {/* 1. Surgeon Voice Note — decoded waveform player */}
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

              {/* 2. Operative Note — 3-section notepad (procedure/findings/
                  postop plan). Scrolls internally (pe-note-paper already has
                  overflow-y:auto and sits in a flex:1 card) so a long
                  dictation never grows the page layout; each field is
                  dictation-filled, then editable. */}
              <div className="pe-note-paper pe-soap-notepad">
                {isRecording && (
                  <div className="pe-soap-live-caption">
                    <Mic size={12} />
                    <span>{liveCaption || 'Listening…'}</span>
                  </div>
                )}
                {dictation?.text && (
                  <div className="pe-note-section pe-soap-transcript">
                    <h4 className="pe-note-h4"><FileText size={13} /> Raw Transcript</h4>
                    <p style={{ fontStyle: 'italic' }}>{dictation.text}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Check this against what was actually said — the sections below are the AI's structured, grammar-corrected read of it, and can be edited before you click Complete Visit.
                    </p>
                  </div>
                )}
                {SOAP_SECTIONS.map(({ id, label, icon: Icon, rows, placeholder }) => (
                  <div className="pe-note-section pe-soap-section" key={id}>
                    <h4 className="pe-note-h4"><Icon size={13} /> {label}</h4>
                    <textarea
                      className="form-control pe-soap-textarea"
                      rows={rows}
                      placeholder={placeholder}
                      value={soap[id]}
                      onChange={(e) => updateSoap(id, e.target.value)}
                    />
                  </div>
                ))}
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

          {/* ── RIGHT COLUMN — post-op orders & follow-up ────────────── */}
          <div className="pe-col pe-col-right">

            <SCard title="Orders & Follow-Up" icon={ClipboardList} style={{ flex: 1 }}>

              {/* ── Draft orders for this visit — dictation-filled or added
                  manually, editable right up until Complete Visit persists
                  them below as Diagnostic/Treatment records. ── */}
              <div className="pe-orders-draft">
                <div className="pe-orders-draft-label">
                  <FlaskConical size={13} /> Post-Op Diagnostic Tests
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
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

                <div className="pe-orders-draft-label">
                  <Pill size={13} /> Post-Op Treatment Plan
                </div>
                {treatments.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>No treatments added yet.</p>
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

              <div style={{ height: 1, background: 'var(--border)', margin: '18px 0 14px' }} />

              <div className="pe-orders-draft-label" style={{ marginBottom: 10 }}>
                <ClipboardList size={13} /> Recorded Orders
              </div>
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
            Quick Actions
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
            <textarea className="form-control" rows={5} placeholder="Add a quick note — appended to the Postoperative Plan section…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
        </MiniModal>
      )}
    </>
  );
}
