import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Square, Save, FileText } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PhysicianEvaluation({ patients, onAddEvaluation }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient = patients.find((p) => p.id === patientId);

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleTranscriptReceived = (data) => {
    setTranscript(data);
    setError(null);
    // Append transcription to notes
    if (data?.text) {
      setNotes((prev) => (prev ? prev + '\n' + data.text : data.text));
    }
  };

  const handleError = (msg) => setError(msg);

  const { isRecording, isProcessing, elapsedSeconds, startRecording, stopRecording } =
    useRecorder({ onTranscriptReceived: handleTranscriptReceived, onError: handleError });

  const handleSave = () => {
    if (!diagnosis.trim() && !notes.trim()) return;
    const evaluation = {
      id: `ev${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      physician: 'Dr. Khalid Mansour',
      notes: notes.trim(),
      diagnosis: diagnosis.trim(),
      audioUrl: null
    };
    if (onAddEvaluation) onAddEvaluation(patientId, evaluation);
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
        <div className="topbar"><div className="topbar-left"><h1>Evaluation Saved</h1></div></div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Evaluation Recorded</h2>
            <p className="text-muted mb-4">Physician evaluation for {patient.name} has been saved.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
              <button className="btn btn-outline" onClick={() => navigate(`/diagnostics?patient=${patient.id}`)}>Request Diagnostics</button>
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

          {/* Voice Recorder */}
          <div className="voice-recorder-card mb-4">
            <h3>🎙 Voice Notes — Whisper AI</h3>
            <p>Record your clinical observations. Speech will be transcribed automatically.</p>

            <button
              className={`record-btn-medical ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="spin-ring" style={{ width: 28, height: 28 }} />
              ) : isRecording ? (
                <Square size={28} />
              ) : (
                <Mic size={28} />
              )}
            </button>

            {isRecording && (
              <>
                <div className="record-timer-medical">{formatTimer(elapsedSeconds)}</div>
                <div className="record-status-medical">Recording… Click to stop</div>
              </>
            )}
            {isProcessing && <div className="record-status-medical">Transcribing with Whisper AI…</div>}
            {!isRecording && !isProcessing && <div className="record-status-medical">Click the mic to start recording</div>}

            {error && (
              <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: 12, marginTop: 16, color: '#fca5a5', fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {transcript && (
              <div className="transcript-result">
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>
                  {transcript.language && `Detected: ${transcript.language}`}
                </div>
                {transcript.text}
              </div>
            )}
          </div>

          {/* Written Notes */}
          <div className="card mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Clinical Notes</label>
              <textarea
                className="form-control"
                rows={8}
                placeholder="Type or use the voice recorder above to add notes. Transcribed audio will appear here automatically."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={!diagnosis.trim() && !notes.trim()}>
              <Save size={18} /> Save Evaluation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
