import { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Users, Stethoscope, Clock3, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api';

const METHODS = [
  { id: 'self_completion', label: 'Patient Self-Completion', desc: 'A link/QR code the patient fills in themselves — on their phone or a clinic tablet.', icon: Smartphone },
  { id: 'clerk_assisted', label: 'Clerk-Assisted', desc: 'Routed to the clerk task queue — they read the questions and record only the patient\'s answers.', icon: Users },
  { id: 'physician_assisted', label: 'Physician-Assisted Now', desc: 'Run the questionnaire live — the patient answers, you record it.', icon: Stethoscope },
  { id: 'deferred', label: 'Defer / Not Applicable', desc: 'Not completed this visit — a reason is kept on file.', icon: Clock3 },
];

const TIMINGS = [
  { id: 'before_exam', label: 'Before Exam' },
  { id: 'after_exam', label: 'After Exam' },
  { id: 'after_intervention', label: 'After Intervention' },
];

/** Doctor-facing "Select & Assign PROM" modal — see backend/routers/prom_assignments.py
 * for the full workflow this drives. The doctor picks the instrument, who's
 * answering, and how it gets completed; they never fill it in themselves
 * (physician-assisted still means the patient answers, the doctor just types). */
export default function PromAssignmentModal({ patient, bodyAreas, onClose, onAssigned, selfCompletionOnly = false }) {
  const [bodyArea, setBodyArea] = useState(patient?.bodyArea || bodyAreas?.[0]?.bodyArea || '');
  const [respondentType, setRespondentType] = useState('patient');
  const [completionMethod, setCompletionMethod] = useState(selfCompletionOnly ? 'self_completion' : 'physician_assisted');
  const [timing, setTiming] = useState('after_exam');
  const [deferReason, setDeferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // the created assignment, once saved
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const selectedProm = bodyAreas?.find((b) => b.bodyArea === bodyArea);
  const shareLink = result?.accessToken ? `${window.location.origin}/prom/${result.accessToken}` : null;

  useEffect(() => {
    if (shareLink && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareLink, { width: 176, margin: 1 }).catch(() => {});
    }
  }, [shareLink]);

  const handleSubmit = () => {
    if (completionMethod === 'deferred' && !deferReason.trim()) {
      setError('A reason is required to defer.');
      return;
    }
    setSubmitting(true);
    setError('');
    api.post(`/api/patients/${patient.id}/prom-assignments`, {
      bodyArea,
      promName: selectedProm?.promName || null,
      respondentType,
      completionMethod,
      timing,
      deferReason: completionMethod === 'deferred' ? deferReason.trim() : null,
    })
      .then((res) => {
        if (completionMethod === 'physician_assisted') {
          onAssigned(res.data); // parent navigates straight into the question flow
          return;
        }
        setResult(res.data); // clerk_assisted / deferred / self_completion all show a confirmation state
      })
      .catch(() => setError('Failed to create the assignment. Please try again.'))
      .finally(() => setSubmitting(false));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal prom-assign-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="prom-assign-close" onClick={onClose} title="Close"><X size={16} /></button>

        {result ? (
          <>
            <h3>PROM Assigned</h3>
            {result.completionMethod === 'self_completion' && shareLink && (
              <div className="prom-assign-share">
                <canvas ref={canvasRef} />
                <div className="prom-assign-link-row">
                  <input className="form-control" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={copyLink}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 12 }}>
                  Show this QR code or share the link with the patient — automated WhatsApp/SMS delivery isn't wired up yet
                  (needs a messaging provider chosen separately). Status: <strong>Sent to Patient — Pending</strong>.
                </p>
              </div>
            )}
            {result.completionMethod === 'clerk_assisted' && (
              <p>Routed to the clerk task queue. Status: <strong>Assigned to Clerk</strong>.</p>
            )}
            {result.completionMethod === 'deferred' && (
              <p>Marked as deferred. Reason on file: <em>{result.deferReason}</em></p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => onAssigned(result)}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h3>{selfCompletionOnly ? 'Send Patient Form' : 'Select & Assign PROM'}</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {selfCompletionOnly
                ? 'Choose the questionnaire topic. The patient will see it in the mobile app and complete it themselves.'
                : 'No pre-visit questionnaire is on file for this patient. Choose the instrument and how it should get completed — you direct it, you do not answer for the patient.'}
            </p>

            <div className="form-group">
              <label className="form-label">PROM Type</label>
              <select className="form-control" value={bodyArea} onChange={(e) => setBodyArea(e.target.value)}>
                {(bodyAreas || []).map((b) => (
                  <option key={b.bodyArea} value={b.bodyArea}>{b.icon} {b.bodyArea}{b.promName ? ` — ${b.promName}` : ''}</option>
                ))}
              </select>
            </div>

            {!selfCompletionOnly && <div className="form-group">
              <label className="form-label">Respondent</label>
              <div className="prom-assign-radio-row">
                <label className={`prom-assign-radio ${respondentType === 'patient' ? 'selected' : ''}`}>
                  <input type="radio" name="respondent" checked={respondentType === 'patient'} onChange={() => setRespondentType('patient')} />
                  Patient
                </label>
                <label className={`prom-assign-radio ${respondentType === 'parent_caregiver' ? 'selected' : ''}`}>
                  <input type="radio" name="respondent" checked={respondentType === 'parent_caregiver'} onChange={() => setRespondentType('parent_caregiver')} />
                  Parent / Caregiver <span className="text-muted" style={{ fontWeight: 500 }}>(pediatric)</span>
                </label>
              </div>
            </div>}

            {!selfCompletionOnly && <div className="form-group">
              <label className="form-label">Completion Method</label>
              <div className="prom-assign-method-grid">
                {METHODS.map((m) => (
                  <label key={m.id} className={`prom-assign-method-card ${completionMethod === m.id ? 'selected' : ''}`}>
                    <input type="radio" name="method" checked={completionMethod === m.id} onChange={() => setCompletionMethod(m.id)} />
                    <m.icon size={16} />
                    <div>
                      <div className="prom-assign-method-label">{m.label}</div>
                      <div className="prom-assign-method-desc">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>}

            {!selfCompletionOnly && (completionMethod === 'deferred' ? (
              <div className="form-group">
                <label className="form-label">Reason for Deferring</label>
                <textarea className="form-control" rows={2} placeholder="e.g. Patient declined today, will complete at next visit." value={deferReason} onChange={(e) => setDeferReason(e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Timing Relative to Exam</label>
                <select className="form-control" value={timing} onChange={(e) => setTiming(e.target.value)}>
                  {TIMINGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            ))}

            {error && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Sending…' : completionMethod === 'physician_assisted' ? 'Start Now' : selfCompletionOnly ? 'Send Form' : 'Assign PROM'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
