import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, PlayCircle, XCircle, Users2 } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api';
import { useLanguage } from '../hooks/useLanguage';

const successToast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, timerProgressBar: true,
  didOpen: (el) => { el.addEventListener('mouseenter', Swal.stopTimer); el.addEventListener('mouseleave', Swal.resumeTimer); },
});
const notifySuccess = (title) => successToast.fire({ icon: 'success', title });
const notifyError = (title) => successToast.fire({ icon: 'error', title, timer: 3000 });

const STATUS_META_KEYS = {
  assigned_to_clerk: { labelKey: 'clerkTasks.statusAssigned', badgeClass: 'badge-completed' },
  overdue:           { labelKey: 'clerkTasks.statusOverdue',  badgeClass: 'badge-danger' },
};

const RESPONDENT_LABEL_KEYS = { patient: 'clerkTasks.respondentPatient', parent_caregiver: 'clerkTasks.respondentParentCaregiver' };

// Clerk-assisted PROM queue — the clerk records only the patient's answers
// (no history re-taken) via the exact same question flow the nurse uses for
// pre-visit calls; see PreVisitAssessment.jsx's promAssignment handling and
// backend/routers/prom_assignments.py for the full workflow this closes out.
export default function ClerkTasks() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const reload = () => {
    Promise.all([
      api.get('/api/prom-assignments', { params: { status: 'assigned_to_clerk' } }),
      api.get('/api/prom-assignments', { params: { status: 'overdue' } }),
    ])
      .then(([assignedRes, overdueRes]) => {
        const overdueIds = new Set(overdueRes.data.map((t) => t.id));
        const merged = [
          ...overdueRes.data,
          ...assignedRes.data.filter((t) => !overdueIds.has(t.id)),
        ];
        setTasks(merged);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) => t.patientName.toLowerCase().includes(q) || t.patientMrn.toLowerCase().includes(q));
  }, [tasks, search]);

  const handleDecline = async (task) => {
    const { value: reason } = await Swal.fire({
      icon: 'warning',
      title: t('clerkTasks.declineDialogTitle'),
      input: 'text',
      inputPlaceholder: t('clerkTasks.declineReasonPlaceholder'),
      showCancelButton: true,
      confirmButtonText: t('clerkTasks.decline'),
      confirmButtonColor: 'var(--danger)',
    });
    if (reason === undefined) return; // cancelled
    api.patch(`/api/prom-assignments/${task.id}`, { status: 'declined', deferReason: reason || null })
      .then(() => { notifySuccess(t('clerkTasks.taskDeclined')); reload(); })
      .catch(() => notifyError(t('clerkTasks.updateFailed')));
  };

  const handleStart = (task) => {
    navigate(`/assessment?patient=${task.patient_id}&promAssignment=${task.id}&bodyArea=${encodeURIComponent(task.bodyArea)}&respondent=${task.respondentType}`);
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>{t('clerkTasks.title')}</h1>
          <p>{t('clerkTasks.subtitle')}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><ClipboardList size={20} /></div>
            <div><div className="stat-value">{tasks.length}</div><div className="stat-label">{t('clerkTasks.totalTasks')}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Users2 size={20} /></div>
            <div><div className="stat-value">{tasks.filter((task) => task.status === 'overdue').length}</div><div className="stat-label">{t('clerkTasks.statusOverdue')}</div></div>
          </div>
        </div>

        <div className="card">
          <div className="filters-row">
            <div className="search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input placeholder={t('clerkTasks.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <p className="text-muted">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>{t('clerkTasks.emptyState')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.patient')}</th>
                    <th>{t('clerkTasks.colProm')}</th>
                    <th>{t('clerkTasks.colRespondent')}</th>
                    <th>{t('clerkTasks.colAssigned')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const metaKeys = STATUS_META_KEYS[task.status];
                    const meta = metaKeys ? { label: t(metaKeys.labelKey), badgeClass: metaKeys.badgeClass } : { label: task.status, badgeClass: 'badge-pending' };
                    return (
                      <tr key={task.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="patient-avatar" style={{ background: task.patientAvatar, width: 32, height: 32, fontSize: 12 }}>
                              {task.patientName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{task.patientName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.patientMrn}</div>
                            </div>
                          </div>
                        </td>
                        <td>{task.bodyArea}{task.promName ? ` — ${task.promName}` : ''}</td>
                        <td>{RESPONDENT_LABEL_KEYS[task.respondentType] ? t(RESPONDENT_LABEL_KEYS[task.respondentType]) : task.respondentType}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.assignedAt ? task.assignedAt.slice(0, 10) : '—'}</td>
                        <td><span className={`badge ${meta.badgeClass}`}><span className="badge-dot" />{meta.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleStart(task)}>
                              <PlayCircle size={13} /> {t('clerkTasks.start')}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDecline(task)}>
                              <XCircle size={13} /> {t('clerkTasks.decline')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
