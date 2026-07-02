import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Save, FileText, X, Plus } from 'lucide-react';
import { useDictation } from '../hooks/useDictation';
import { DIAGNOSTIC_TESTS, TREATMENT_OPTIONS } from '../data/mockData';
import DictationRecordingModal from '../components/DictationRecordingModal';

function uid() {
  return `t${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export default function PhysicianEvaluation({ patients, onAddEvaluation, onAddDiagnostic, onAddTreatment }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient = patients.find((p) => p.id === patientId);

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [dictation, setDictation] = useState(null);
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDictationResult = (data) => {
    setError(null);
    setDictation(data);
    setShowDictationModal(false);

    const structured = data?.structured;
    if (!structured) return;

    if (structured.diagnosis) setDiagnosis(structured.diagnosis);
    if (structured.notes) setNotes(structured.notes);
    if (structured.diagnostic_tests?.length) setSelectedTests(structured.diagnostic_tests);
    if (structured.treatments?.length) {
      setTreatments(
        structured.treatments.map((t) => ({
          uid: uid(),
          type: t.type,
          duration: t.duration || '',
          details: t.details || '',
          followUpDate: t.followUpDate || '',
        }))
      );
    }
  };

  const { isRecording, isProcessing, elapsedSeconds, liveCaption, startRecording, stopRecording } =
    useDictation({ patientId, onResult: handleDictationResult, onError: setError });

  const handleStartDictation = () => {
    setDictation(null);
    setError(null);
    setShowDictationModal(true);
    startRecording();
  };

  const handleRetryDictation = () => {
    setError(null);
    startRecording();
  };

  const handleCloseDictationModal = () => {
    setShowDictationModal(false);
    setError(null);
  };

  const toggleTest = (id) => {
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addTreatmentRow = () => {
    setTreatments((prev) => [...prev, { uid: uid(), type: '', duration: '', details: '', followUpDate: '' }]);
  };

  const updateTreatmentRow = (rowId, field, value) => {
    setTreatments((prev) => prev.map((t) => (t.uid === rowId ? { ...t, [field]: value } : t)));
  };

  const removeTreatmentRow = (rowId) => {
    setTreatments((prev) => prev.filter((t) => t.uid !== rowId));
  };

  const handleSaveAll = () => {
    if (!diagnosis.trim() && !notes.trim()) return;

    const evaluation = {
      id: `ev${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      physician: 'Dr. Khalid Mansour',
      notes: notes.trim(),
      diagnosis: diagnosis.trim(),
      audioUrl: null,
    };
    if (onAddEvaluation) onAddEvaluation(patientId, evaluation);

    selectedTests.forEach((testId) => {
      const test = DIAGNOSTIC_TESTS.find((t) => t.id === testId);
      if (!test) return;
      if (onAddDiagnostic) {
        onAddDiagnostic(patientId, {
          id: `d${Date.now()}-${testId}`,
          type: test.name,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          result: null,
        });
      }
    });

    treatments
      .filter((t) => t.type)
      .forEach((t) => {
        const option = TREATMENT_OPTIONS.find((o) => o.id === t.type);
        if (!option) return;
        if (onAddTreatment) {
          onAddTreatment(patientId, {
            id: `tr${Date.now()}-${t.type}`,
            type: option.name,
            date: new Date().toISOString().split('T')[0],
            physician: 'Dr. Khalid Mansour',
            duration: t.duration || 'TBD',
            details: t.details?.trim() || '',
            followUpDate: t.followUpDate || null,
            status: 'active',
          });
        }
      });

    setSaved(true);
  };

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Physician Evaluation</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">🩺</div>
            <p>No patient selected. Please select a patient from their profile page.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </>
    );
  }

  if (saved) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Visit Recorded</h1></div></div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Visit Recorded</h2>
            <p className="text-muted mb-4">
              Evaluation saved for {patient.name}
              {selectedTests.length > 0 && ` · ${selectedTests.length} diagnostic test${selectedTests.length !== 1 ? 's' : ''} requested`}
              {treatments.filter((t) => t.type).length > 0 && ` · ${treatments.filter((t) => t.type).length} treatment${treatments.filter((t) => t.type).length !== 1 ? 's' : ''} started`}.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>Dashboard</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1>Physician Evaluation</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Patient Summary */}
          <div className="card mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="patient-avatar" style={{ background: patient.avatar, width: 48, height: 48 }}>
                {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="fw-700">{patient.name}</div>
                <div className="text-muted">{patient.age}y · {patient.gender} · {patient.bodyArea}</div>
              </div>
              {patient.assessments.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-sm">Last Assessment Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                    {patient.assessments[patient.assessments.length - 1].score}/{patient.assessments[patient.assessments.length - 1].maxScore}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous Assessments Quick View */}
          {patient.assessments.length > 0 && (
            <div className="card mb-4">
              <div className="card-title" style={{ marginBottom: 12 }}>
                <FileText size={16} style={{ display: 'inline', marginRight: 6 }} />
                Nurse Assessment Summary
              </div>
              {patient.assessments.map((a) => (
                <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm fw-600">{a.type} — {a.bodyArea} ({a.date})</span>
                    <span className="badge badge-active">Score: {a.score}/{a.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voice Dictation trigger — fills the chart fields below automatically */}
          <div className="card mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mic size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="fw-700">Record Full Visit — Whisper AI</div>
                <div className="text-muted">
                  Say “Diagnosis…”, “Diagnostics…”, then “Treatment plan…” — the fields below fill in automatically when you stop.
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleStartDictation}>
                <Mic size={16} /> Start Dictation
              </button>
            </div>

            {dictation && !dictation.structured?.ai_structured && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginTop: 16, color: '#92400e', fontSize: 13 }}>
                ⚠️ AI structuring is unavailable right now (the local LLM may not be running), so diagnostic tests
                and treatment plan weren&apos;t auto-filled. The transcript was added to Clinical Notes — fill the
                sections below manually.
              </div>
            )}

            {dictation && (
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-3"
                onClick={() => setShowTranscript((s) => !s)}
              >
                {showTranscript ? 'Hide transcript' : 'View raw transcript'}
              </button>
            )}
            {dictation && showTranscript && (
              <div className="transcript-result" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {dictation.language && `Detected: ${dictation.language_name || dictation.language}`}
                <div style={{ marginTop: 4 }}>{dictation.text}</div>
              </div>
            )}
          </div>

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

          {/* Diagnosis */}
          <div className="card mb-4">
            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <input
                className="form-control"
                placeholder="e.g., Osteoarthritis Grade 3, Rotator Cuff Tear…"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
          </div>

          {/* Written Notes */}
          <div className="card mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Clinical Notes</label>
              <textarea
                className="form-control"
                rows={6}
                placeholder="Type or use the voice recorder above. Transcribed notes appear here automatically."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Diagnostic Tests — auto-checked from dictation, doctor can adjust */}
          <div className="card mb-4">
            <div className="card-title" style={{ marginBottom: 4 }}>Diagnostic Tests</div>
            <p className="text-muted mb-4">Auto-selected from your dictation. Click to add or remove.</p>
            <div className="diag-grid">
              {DIAGNOSTIC_TESTS.map((test) => (
                <div
                  key={test.id}
                  className={`diag-card ${selectedTests.includes(test.id) ? 'selected' : ''}`}
                  onClick={() => toggleTest(test.id)}
                >
                  <div className="diag-card-icon">{test.icon}</div>
                  <div className="diag-card-name">{test.name}</div>
                  <div className="diag-card-desc">{test.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Plan(s) — auto-filled from dictation, doctor can adjust */}
          <div className="card mb-4">
            <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Treatment Plan</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addTreatmentRow}>
                <Plus size={14} /> Add Treatment
              </button>
            </div>
            <p className="text-muted mb-4">Auto-filled from your dictation. Adjust duration, follow-up, and instructions as needed.</p>

            {treatments.length === 0 && (
              <p className="text-muted text-sm">No treatment mentioned yet. Dictate a treatment plan above, or add one manually.</p>
            )}

            {treatments.map((t) => (
              <div key={t.uid} className="card" style={{ marginBottom: 12, background: 'rgba(255,255,255,.03)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                  <select
                    className="form-control"
                    style={{ maxWidth: 240 }}
                    value={t.type}
                    onChange={(e) => updateTreatmentRow(t.uid, 'type', e.target.value)}
                  >
                    <option value="">Select treatment type…</option>
                    {TREATMENT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.icon} {opt.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTreatmentRow(t.uid)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input
                      className="form-control"
                      placeholder="e.g., 6 weeks"
                      value={t.duration}
                      onChange={(e) => updateTreatmentRow(t.uid, 'duration', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-Up Date</label>
                    <input
                      className="form-control"
                      type="date"
                      value={t.followUpDate || ''}
                      onChange={(e) => updateTreatmentRow(t.uid, 'followUpDate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Instructions & Details</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Medication schedule, recovery plan, instructions…"
                    value={t.details}
                    onChange={(e) => updateTreatmentRow(t.uid, 'details', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={handleSaveAll} disabled={!diagnosis.trim() && !notes.trim()}>
              <Save size={18} /> Confirm & Save All
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
