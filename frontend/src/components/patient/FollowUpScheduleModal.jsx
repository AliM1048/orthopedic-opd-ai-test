import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../api';
import { useLanguage } from '../../hooks/useLanguage';

const successToast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, timerProgressBar: true,
  didOpen: (el) => { el.addEventListener('mouseenter', Swal.stopTimer); el.addEventListener('mouseleave', Swal.resumeTimer); },
});
const notifySuccess = (title) => successToast.fire({ icon: 'success', title });
const notifyError = (title) => successToast.fire({ icon: 'error', title, timer: 3000 });

function parseIntervals(text) {
  const nums = text.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** Edits this patient's follow-up call interval (e.g. "3, 6, 9" months) —
 * overrides the clinic-wide default (see backend/routers/followups.py) and
 * regenerates their not-yet-completed calls immediately. */
export default function FollowUpScheduleModal({ patient, onClose, onSaved }) {
  const { t } = useLanguage();
  const [globalIntervals, setGlobalIntervals] = useState([3, 6, 9]);
  const [input, setInput] = useState('');
  const [useCustom, setUseCustom] = useState(!!patient.followUpIntervalsMonths?.length);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/followup-settings')
      .then((res) => {
        setGlobalIntervals(res.data.intervalsMonths);
        if (!patient.followUpIntervalsMonths?.length) setInput(res.data.intervalsMonths.join(', '));
      })
      .catch(() => {});
    if (patient.followUpIntervalsMonths?.length) setInput(patient.followUpIntervalsMonths.join(', '));
  }, [patient.followUpIntervalsMonths]);

  const handleSave = () => {
    const intervalsMonths = useCustom ? parseIntervals(input) : null;
    if (useCustom && !intervalsMonths.length) {
      notifyError(t('components.followUpSchedule.enterIntervalError'));
      return;
    }
    setSaving(true);
    api.patch(`/api/patients/${patient.id}/followup-settings`, { intervalsMonths })
      .then(() => { notifySuccess(t('components.followUpSchedule.scheduleUpdated')); onSaved(); })
      .catch(() => notifyError(t('components.followUpSchedule.failedToSave')))
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <h3>{t('components.followUpSchedule.title')}</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
          {t('components.followUpSchedule.description')}
        </p>

        <div className="form-group" style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="radio" checked={!useCustom} onChange={() => { setUseCustom(false); setInput(globalIntervals.join(', ')); }} />
            {t('components.followUpSchedule.useClinicDefault', { months: globalIntervals.join(', ') })}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} />
            {t('components.followUpSchedule.customForPatient')}
          </label>
        </div>

        {useCustom && (
          <div className="form-group">
            <label className="form-label">{t('components.followUpSchedule.monthsLabel')}</label>
            <input className="form-control" placeholder={t('components.followUpSchedule.monthsPlaceholder')} value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
        )}

        <p className="text-muted" style={{ fontSize: 12 }}>
          {t('components.followUpSchedule.saveNote')}
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>{t('components.followUpSchedule.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('components.followUpSchedule.saving') : t('components.followUpSchedule.save')}</button>
        </div>
      </div>
    </div>
  );
}
