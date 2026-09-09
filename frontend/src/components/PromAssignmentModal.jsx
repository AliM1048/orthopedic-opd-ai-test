import { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Users, Stethoscope, Clock3, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api';
import { useLanguage } from '../hooks/useLanguage';

const METHODS = [
  { id: 'self_completion', icon: Smartphone },
  { id: 'clerk_assisted', icon: Users },
  { id: 'physician_assisted', icon: Stethoscope },
  { id: 'deferred', icon: Clock3 },
];

const TIMINGS = [
  { id: 'before_exam' },
  { id: 'after_exam' },
  { id: 'after_intervention' },
];

/** Doctor-facing "Select & Assign PROM" modal — see backend/routers/prom_assignments.py
 * for the full workflow this drives. The doctor picks the instrument, who's
 * answering, and how it gets completed; they never fill it in themselves
 * (physician-assisted still means the patient answers, the doctor just types). */
export default function PromAssignmentModal({ patient, bodyAreas, onClose, onAssigned, selfCompletionOnly = false }) {
  const { t } = useLanguage();
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
      setError(t('components.promAssignment.deferReasonRequiredError'));
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
      .catch(() => setError(t('components.promAssignment.assignFailedError')))
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
        <button type="button" className="prom-assign-close" onClick={onClose} title={t('components.promAssignment.close')}><X size={16} /></button>

        {result ? (
          <>
            <h3>{t('components.promAssignment.resultTitle')}</h3>
            {result.completionMethod === 'self_completion' && shareLink && (
              <div className="prom-assign-share">
                <canvas ref={canvasRef} />
                <div className="prom-assign-link-row">
                  <input className="form-control" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={copyLink}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('components.promAssignment.copied') : t('components.promAssignment.copy')}
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 12 }}>
                  {t('components.promAssignment.shareInstructions')} <strong>{t('components.promAssignment.sentPending')}</strong>.
                </p>
              </div>
            )}
            {result.completionMethod === 'clerk_assisted' && (
              <p>{t('components.promAssignment.routedToClerk')} <strong>{t('components.promAssignment.assignedToClerk')}</strong>.</p>
            )}
            {result.completionMethod === 'deferred' && (
              <p>{t('components.promAssignment.deferredReasonPrefix')} <em>{result.deferReason}</em></p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => onAssigned(result)}>{t('components.promAssignment.done')}</button>
            </div>
          </>
        ) : (
          <>
            <h3>{selfCompletionOnly ? t('components.promAssignment.sendPatientFormTitle') : t('components.promAssignment.selectAssignTitle')}</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {selfCompletionOnly
                ? t('components.promAssignment.sendPatientFormDesc')
                : t('components.promAssignment.selectAssignDesc')}
            </p>

            <div className="form-group">
              <label className="form-label">{t('components.promAssignment.promTypeLabel')}</label>
              <select className="form-control" value={bodyArea} onChange={(e) => setBodyArea(e.target.value)}>
                {(bodyAreas || []).map((b) => (
                  <option key={b.bodyArea} value={b.bodyArea}>{b.icon} {b.bodyArea}{b.promName ? ` — ${b.promName}` : ''}</option>
                ))}
              </select>
            </div>

            {!selfCompletionOnly && <div className="form-group">
              <label className="form-label">{t('components.promAssignment.respondentLabel')}</label>
              <div className="prom-assign-radio-row">
                <label className={`prom-assign-radio ${respondentType === 'patient' ? 'selected' : ''}`}>
                  <input type="radio" name="respondent" checked={respondentType === 'patient'} onChange={() => setRespondentType('patient')} />
                  {t('components.promAssignment.patientOption')}
                </label>
                <label className={`prom-assign-radio ${respondentType === 'parent_caregiver' ? 'selected' : ''}`}>
                  <input type="radio" name="respondent" checked={respondentType === 'parent_caregiver'} onChange={() => setRespondentType('parent_caregiver')} />
                  {t('components.promAssignment.parentCaregiverOption')} <span className="text-muted" style={{ fontWeight: 500 }}>{t('components.promAssignment.pediatricNote')}</span>
                </label>
              </div>
            </div>}

            {!selfCompletionOnly && <div className="form-group">
              <label className="form-label">{t('components.promAssignment.completionMethodLabel')}</label>
              <div className="prom-assign-method-grid">
                {METHODS.map((m) => (
                  <label key={m.id} className={`prom-assign-method-card ${completionMethod === m.id ? 'selected' : ''}`}>
                    <input type="radio" name="method" checked={completionMethod === m.id} onChange={() => setCompletionMethod(m.id)} />
                    <m.icon size={16} />
                    <div>
                      <div className="prom-assign-method-label">{t(`components.promAssignment.methods.${m.id}.label`)}</div>
                      <div className="prom-assign-method-desc">{t(`components.promAssignment.methods.${m.id}.desc`)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>}

            {!selfCompletionOnly && (completionMethod === 'deferred' ? (
              <div className="form-group">
                <label className="form-label">{t('components.promAssignment.reasonForDeferringLabel')}</label>
                <textarea className="form-control" rows={2} placeholder={t('components.promAssignment.deferPlaceholder')} value={deferReason} onChange={(e) => setDeferReason(e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">{t('components.promAssignment.timingLabel')}</label>
                <select className="form-control" value={timing} onChange={(e) => setTiming(e.target.value)}>
                  {TIMINGS.map((tm) => <option key={tm.id} value={tm.id}>{t(`components.promAssignment.timings.${tm.id}`)}</option>)}
                </select>
              </div>
            ))}

            {error && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 4 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={onClose}>{t('components.promAssignment.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('components.promAssignment.sending') : completionMethod === 'physician_assisted' ? t('components.promAssignment.startNow') : selfCompletionOnly ? t('components.promAssignment.sendFormButton') : t('components.promAssignment.assignButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
