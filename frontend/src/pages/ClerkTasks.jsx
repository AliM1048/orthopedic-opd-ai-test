import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, PlayCircle, XCircle, Users2 } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../api';

const successToast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, timerProgressBar: true,
  didOpen: (el) => { el.addEventListener('mouseenter', Swal.stopTimer); el.addEventListener('mouseleave', Swal.resumeTimer); },
});
const notifySuccess = (title) => successToast.fire({ icon: 'success', title });
const notifyError = (title) => successToast.fire({ icon: 'error', title, timer: 3000 });

const STATUS_META = {
  assigned_to_clerk: { label: 'Assigned', badgeClass: 'badge-completed' },
  overdue:           { label: 'Overdue',  badgeClass: 'badge-danger' },
};

const RESPONDENT_LABEL = { patient: 'Patient', parent_caregiver: 'Parent / Caregiver' };

// Clerk-assisted PROM queue — the clerk records only the patient's answers
// (no history re-taken) via the exact same question flow the nurse uses for
// pre-visit calls; see PreVisitAssessment.jsx's promAssignment handling and
// backend/routers/prom_assignments.py for the full workflow this closes out.
export default function ClerkTasks() {
  const navigate = useNavigate();
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
      title: 'Decline this PROM task?',
      input: 'text',
      inputPlaceholder: 'Reason (optional)',
      showCancelButton: true,
      confirmButtonText: 'Decline',
      confirmButtonColor: 'var(--danger)',
    });
    if (reason === undefined) return; // cancelled
    api.patch(`/api/prom-assignments/${task.id}`, { status: 'declined', deferReason: reason || null })
      .then(() => { notifySuccess('Task declined'); reload(); })
      .catch(() => notifyError('Failed to update'));
  };

  const handleStart = (task) => {
    navigate(`/assessment?patient=${task.patient_id}&promAssignment=${task.id}&bodyArea=${encodeURIComponent(task.bodyArea)}&respondent=${task.respondentType}`);
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Clerk Tasks</h1>
          <p>PROM questionnaires assigned by a physician — record the patient&rsquo;s answers only, no history needed</p>
        </div>
      </div>

      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><ClipboardList size={20} /></div>
            <div><div className="stat-value">{tasks.length}</div><div className="stat-label">Total Tasks</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Users2 size={20} /></div>
            <div><div className="stat-value">{tasks.filter((t) => t.status === 'overdue').length}</div><div className="stat-label">Overdue</div></div>
          </div>
        </div>

        <div className="card">
          <div className="filters-row">
            <div className="search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input placeholder="Search by patient or MRN…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No PROM tasks assigned right now.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>PROM</th>
                    <th>Respondent</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const meta = STATUS_META[task.status] || { label: task.status, badgeClass: 'badge-pending' };
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
                        <td>{RESPONDENT_LABEL[task.respondentType] || task.respondentType}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.assignedAt ? task.assignedAt.slice(0, 10) : '—'}</td>
                        <td><span className={`badge ${meta.badgeClass}`}><span className="badge-dot" />{meta.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleStart(task)}>
                              <PlayCircle size={13} /> Start
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDecline(task)}>
                              <XCircle size={13} /> Decline
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
