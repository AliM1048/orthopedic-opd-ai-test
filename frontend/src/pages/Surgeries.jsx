import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Calendar, Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLanguage } from '../hooks/useLanguage';

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

// Same status-color convention as the "Recorded Orders" list in
// PhysicianEvaluation.jsx, so a treatment's status reads consistently
// wherever it's shown across the app.
const STATUS_COLORS = {
  pending: '#d97706',
  active: '#059669',
  completed: '#059669',
  scheduled: '#0369a1',
};

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || '#7a9a9e';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

function IconButton({ icon: Icon, onClick, title, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6, border: 'none',
        background: 'transparent', color: 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = danger
          ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
          : 'color-mix(in srgb, var(--primary) 12%, transparent)';
        e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      <Icon size={13} />
    </button>
  );
}

// Every Treatment row of type "Surgery" across all patients — scheduled
// (has a followUpDate) or not (added without a date, to be filled in later
// by the doctor from this page). Reuses the already-loaded `patients` list
// (each carries its own `treatments`) rather than a new backend endpoint,
// same pattern as PatientStatus/Analytics. Dated surgeries sort soonest
// first; undated ones are pushed to the end so they still surface for the
// doctor to fill in without burying the near-term schedule.
function getAllSurgeries(patients) {
  const rows = [];
  for (const p of patients) {
    for (const t of p.treatments || []) {
      if (t.type === 'Surgery') rows.push({ patient: p, treatment: t });
    }
  }
  return rows.sort((a, b) => {
    const ad = a.treatment.followUpDate;
    const bd = b.treatment.followUpDate;
    if (ad && bd) return ad.localeCompare(bd);
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.patient.name.localeCompare(b.patient.name);
  });
}

function AddSurgeryModal({ patients, physicianName, onAdd, onClose }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [duration, setDuration] = useState('');
  const [details, setDetails] = useState('');
  const [surgeryDate, setSurgeryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    if (selectedPatient || !search.trim()) return [];
    const q = search.toLowerCase();
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 6);
  }, [patients, search, selectedPatient]);

  const canSave = Boolean(selectedPatient) && !saving;

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    Promise.resolve(onAdd(selectedPatient.id, {
      id: `tr${Date.now()}-surgery`,
      type: 'Surgery',
      date: todayIso(),
      physician: physicianName,
      duration: duration.trim() || 'TBD',
      details: details.trim(),
      followUpDate: surgeryDate || null,
      status: 'active',
    }))
      .then(() => { notifySuccess(t('surgeries.surgeryAdded')); onClose(); })
      .catch(() => { notifyError(t('surgeries.surgeryAddFailed')); setSaving(false); });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3>{t('surgeries.addSurgery')}</h3>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">{t('common.patient')}</label>
          {selectedPatient ? (
            <div className="dg-selected-patient">
              <div className="patient-avatar" style={{ background: selectedPatient.avatar, width: 30, height: 30, fontSize: 12 }}>
                {selectedPatient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedPatient.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{selectedPatient.mrn}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPatient(null)}>
                <X size={14} /> {t('surgeries.changePatient')}
              </button>
            </div>
          ) : (
            <>
              <div className="search-bar">
                <Search size={16} color="var(--text-muted)" />
                <input
                  placeholder={t('common.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {suggestions.length > 0 && (
                <div className="dg-suggestions">
                  {suggestions.map((p) => (
                    <div key={p.id} className="dg-suggestion" onClick={() => { setSelectedPatient(p); setSearch(''); }}>
                      <div className="patient-avatar" style={{ background: p.avatar, width: 26, height: 26, fontSize: 11 }}>
                        {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{p.mrn}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">{t('surgeries.surgeryDate')} <span className="text-muted">({t('common.optional')})</span></label>
            <input type="date" className="form-control" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('surgeries.duration')} <span className="text-muted">({t('common.optional')})</span></label>
            <input className="form-control" placeholder={t('surgeries.durationPlaceholder')} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">{t('surgeries.details')} <span className="text-muted">({t('common.optional')})</span></label>
            <textarea className="form-control" rows={3} placeholder={t('surgeries.detailsPlaceholder')} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Surgeries({ patients, user, onAddTreatment, onUpdateTreatment, onDeleteTreatment }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const physicianName = user?.name || t('common.physician');
  const rows = useMemo(() => getAllSurgeries(patients), [patients]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const startEditDate = (treatment) => {
    setEditingId(treatment.id);
    setEditDateValue(treatment.followUpDate || '');
  };

  const cancelEditDate = () => {
    setEditingId(null);
    setEditDateValue('');
  };

  const saveEditDate = (patientId, treatmentId) => {
    setSavingId(treatmentId);
    Promise.resolve(onUpdateTreatment(patientId, treatmentId, { followUpDate: editDateValue || null }))
      .then(() => { notifySuccess(t('surgeries.dateSaved')); cancelEditDate(); })
      .catch(() => notifyError(t('surgeries.dateSaveFailed')))
      .finally(() => setSavingId(null));
  };

  const handleDelete = async (patientId, treatment, patientName) => {
    if (deletingId) return;
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: t('surgeries.deleteConfirmTitle', { name: patientName }),
      text: t('surgeries.deleteConfirmText'),
      showCancelButton: true,
      confirmButtonText: t('common.delete'),
      confirmButtonColor: 'var(--danger)',
      cancelButtonText: t('common.cancel'),
    }).then((r) => r.isConfirmed);
    if (!confirmed) return;
    setDeletingId(treatment.id);
    Promise.resolve(onDeleteTreatment(patientId, treatment.id))
      .then(() => notifySuccess(t('surgeries.deleted')))
      .catch(() => notifyError(t('surgeries.deleteFailed')))
      .finally(() => setDeletingId(null));
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>{t('surgeries.title')}</h1>
          <p>{t('surgeries.subtitle')}</p>
        </div>
        {onAddTreatment && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> {t('surgeries.addSurgery')}
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="card">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Scissors size={32} /></div>
              <p>{t('surgeries.emptyState')}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.patient')}</th>
                  <th>{t('surgeries.mrn')}</th>
                  <th>{t('surgeries.surgeryDate')}</th>
                  <th>{t('surgeries.details')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ patient, treatment }) => (
                  <tr key={treatment.id} onClick={() => navigate(`/surgery-evaluation?patient=${patient.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="patient-avatar" style={{ background: patient.avatar }}>
                          {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="fw-600">{patient.name}</div>
                          <div className="text-muted">{patient.age}y · {patient.bodyArea}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{patient.mrn}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {editingId === treatment.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="date"
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: 12, width: 150 }}
                            value={editDateValue}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            autoFocus
                          />
                          <IconButton
                            icon={Check}
                            title={t('common.save')}
                            disabled={savingId === treatment.id}
                            onClick={() => saveEditDate(patient.id, treatment.id)}
                          />
                          <IconButton icon={X} title={t('common.cancel')} onClick={cancelEditDate} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {treatment.followUpDate ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar size={14} color="var(--text-muted)" />
                              {treatment.followUpDate}
                            </div>
                          ) : (
                            <span className="text-muted text-sm" style={{ fontStyle: 'italic' }}>
                              {t('surgeries.noDateSet')}
                            </span>
                          )}
                          {onUpdateTreatment && (
                            <IconButton
                              icon={Pencil}
                              title={t('surgeries.editDateTooltip')}
                              onClick={() => startEditDate(treatment)}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-sm">{treatment.details || '—'}</td>
                    <td><StatusPill status={treatment.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {onDeleteTreatment && (
                        <IconButton
                          icon={Trash2}
                          danger
                          title={t('surgeries.deleteSurgeryTooltip')}
                          disabled={deletingId === treatment.id}
                          onClick={() => handleDelete(patient.id, treatment, patient.name)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSurgeryModal
          patients={patients}
          physicianName={physicianName}
          onAdd={onAddTreatment}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}
