import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../api';

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
      notifyError('Enter at least one interval, e.g. 3, 6, 9');
      return;
    }
    setSaving(true);
    api.patch(`/api/patients/${patient.id}/followup-settings`, { intervalsMonths })
      .then(() => { notifySuccess('Schedule updated'); onSaved(); })
      .catch(() => notifyError('Failed to save'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <h3>Follow-Up Call Schedule</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Months after this patient&rsquo;s first evaluation that a PROM follow-up call gets scheduled.
        </p>

        <div className="form-group" style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="radio" checked={!useCustom} onChange={() => { setUseCustom(false); setInput(globalIntervals.join(', ')); }} />
            Use clinic default ({globalIntervals.join(', ')} months)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} />
            Custom for this patient
          </label>
        </div>

        {useCustom && (
          <div className="form-group">
            <label className="form-label">Months (comma-separated)</label>
            <input className="form-control" placeholder="e.g. 3, 6, 9" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
        )}

        <p className="text-muted" style={{ fontSize: 12 }}>
          Saving regenerates this patient&rsquo;s not-yet-completed calls from their first evaluation date — already-completed calls are left alone.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
