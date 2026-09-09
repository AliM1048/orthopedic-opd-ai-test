import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, Calendar, Users, Clock, CheckCircle, AlertTriangle, PhoneCall, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api';
import { useLanguage } from '../hooks/useLanguage';

// Top-center, fading in/out rather than the library's default slide-and-pop —
// see the .opd-toast* rules in index.css for the actual look.
const notifyToast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 6000,
  timerProgressBar: true,
  showClass: { popup: 'opd-toast-in' },
  hideClass: { popup: 'opd-toast-out' },
  customClass: { popup: 'opd-toast' },
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export default function NurseDashboard({ patients, onUpdateStatus, createPatient }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', mrn: '', age: 30, gender: 'Male', dob: '', bodyArea: 'Knee', appointmentDate: '', appointmentTime: '', phone: '', email: '', address: '', bloodType: 'O+', allergies: '', avatar: '#7c3aed'
  });
  const navigate = useNavigate();

  // Pre-visit call reminders — covers both the very first pre-visit PROM
  // (patient still "pending" with an upcoming appointment) and the
  // recurring 3/6/9-month follow-up check-ins, so either one shows here
  // whether a nurse calls it in or the patient self-completes it via the
  // mobile app. Full follow-up management lives on /followups; this is just
  // the "look here today" prompt. See backend/routers/followups.py:list_due_followups.
  const [dueCalls, setDueCalls] = useState([]);
  useEffect(() => {
    api.get('/api/followups/due').then((res) => setDueCalls(res.data)).catch(() => setDueCalls([]));
  }, []);

  // Pop a toast for each unread staff notification (e.g. "patient completed
  // their pre-visit questionnaire via the app") on dashboard load, then mark
  // them read — the same lightweight "surfaced on next load" pattern as the
  // due-calls reminder above, no live push infrastructure needed.
  useEffect(() => {
    api.get('/api/staff/notifications').then((res) => {
      const unread = res.data.filter((n) => !n.isRead);
      unread.forEach((n) => notifyToast.fire({ icon: 'success', title: n.title, text: n.body || undefined }));
      if (unread.length) api.patch('/api/staff/notifications/read-all').catch(() => {});
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = patients;
    if (filter !== 'all') list = list.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)
      );
    }
    return list;
  }, [patients, filter, search]);

  const stats = useMemo(() => ({
    total:     patients.length,
    pending:   patients.filter((p) => p.status === 'pending').length,
    completed: patients.filter((p) => p.status === 'completed' || p.status === 'assessment-completed').length,
    followUp:  patients.filter((p) => p.status === 'follow-up').length,
  }), [patients]);

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>{t('nurseDashboard.pageTitle')}</h1>
          <p>{t('nurseDashboard.todaysAppointments')} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Users size={24} /></div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">{t('nurseDashboard.statTotalPatients')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Clock size={24} /></div>
            <div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">{t('nurseDashboard.statPendingCall')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={24} /></div>
            <div>
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">{t('nurseDashboard.statCompleted')}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><AlertTriangle size={24} /></div>
            <div>
              <div className="stat-value">{stats.followUp}</div>
              <div className="stat-label">{t('nurseDashboard.statFollowUp')}</div>
            </div>
          </div>
        </div>

        {/* Pre-Visit Call Reminders — the very first pre-visit PROM for a
            patient with an upcoming appointment, or a recurring 3/6/9-month
            follow-up check-in. Either can be closed out by the nurse calling
            it in here, or by the patient self-completing it via the mobile
            app beforehand — this list just reflects whatever's still open. */}
        {dueCalls.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 4%, var(--surface))' }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <PhoneCall size={15} style={{ color: 'var(--danger)' }} />
                  {t('nurseDashboard.preVisitCallsDue')}
                </div>
                <div className="card-subtitle">{t('nurseDashboard.preVisitSubtitle', { count: dueCalls.length, plural: dueCalls.length !== 1 ? 's' : '' })}</div>
              </div>
              {/* <button className="btn btn-outline btn-sm" onClick={() => navigate('/followups')}>
                View All <ArrowRight size={14} />
              </button> */}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dueCalls.slice(0, 4).map((call) => (
                <div key={call.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div className="patient-avatar" style={{ background: call.patientAvatar, width: 32, height: 32, fontSize: 12 }}>
                    {call.patientName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{call.patientName} <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 11 }}>· {call.patientMrn}</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {call.intervalMonths ? t('nurseDashboard.monthsCheckIn', { months: call.intervalMonths }) : t('nurseDashboard.initialPreVisitQuestionnaire')} · {call.intervalMonths ? t('nurseDashboard.scheduledLabel') : t('nurseDashboard.appointmentLabel')} {call.scheduledDate} · <Phone size={10} style={{ verticalAlign: -1 }} /> {call.patientPhone}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/assessment?patient=${call.patient_id}${call.intervalMonths ? '&type=followup' : ''}`)}
                  >
                    {t('nurseDashboard.startCall')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('nurseDashboard.scheduledPatients')}</div>
              <div className="card-subtitle">{t('nurseDashboard.patientsFound', { count: filtered.length, plural: filtered.length !== 1 ? 's' : '' })}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => navigate('/patients')}>{t('nurseDashboard.viewAllRecords')}</button>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{t('nurseDashboard.addPatient')}</button>
              <div className="search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input
                placeholder={t('nurseDashboard.searchPatientsPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              </div>
            </div>
          </div>

          {showAdd && (
            <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{t('nurseDashboard.addNewPatient')}</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldName')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderFullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.mrn')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderMrn')} value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAge')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderAge')} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldGender')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderGender')} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldDob')}</label>
                    <input className="form-control" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.bodyArea')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderBodyArea')} value={form.bodyArea} onChange={(e) => setForm({ ...form, bodyArea: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAppointmentDate')}</label>
                    <input className="form-control" type="date" value={form.appointmentDate} onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAvatarColor')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderAvatarColor')} value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAppointmentTime')}</label>
                    <input className="form-control" type="time" value={form.appointmentTime} onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldPhone')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderPhone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldEmail')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderEmail')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAddress')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderAddress')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldBloodType')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderBloodType')} value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('nurseDashboard.fieldAllergies')}</label>
                    <input className="form-control" placeholder={t('nurseDashboard.placeholderAllergies')} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" onClick={async () => {
                    try {
                      // ensure minimal required fields
                      if (!form.name || !form.mrn || !form.dob || !form.appointmentDate) return alert(t('nurseDashboard.missingFieldsAlert'));
                      await createPatient(form);
                      setShowAdd(false);
                    } catch (e) {
                      console.error(e);
                      const msg = e?.response?.data?.detail || e?.response?.data || e?.message || t('nurseDashboard.createPatientFailed');
                      alert(msg);
                    }
                  }}>{t('nurseDashboard.createPatient')}</button>
                </div>
              </div>
            </div>
          )}

          <div className="filters-row">
            {['all', 'pending', 'assessment-completed', 'follow-up', 'completed'].map((f) => (
              <button
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? t('nurseDashboard.filterAll') : f === 'assessment-completed' ? t('nurseDashboard.filterAssessed') : f === 'follow-up' ? t('nurseDashboard.statFollowUp') : f === 'pending' ? t('nurseDashboard.filterPending') : t('nurseDashboard.statCompleted')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>{t('nurseDashboard.noPatientsMatchFilter')}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.patient')}</th>
                  <th>{t('nurseDashboard.mrn')}</th>
                  <th>{t('nurseDashboard.tableHeaderAppointment')}</th>
                  <th>{t('nurseDashboard.bodyArea')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('nurseDashboard.tableHeaderAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/patient/${p.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="patient-avatar" style={{ background: p.avatar }}>
                          {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="fw-600">{p.name}</div>
                          <div className="text-muted">{t('nurseDashboard.ageYears', { age: p.age })} · {p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{p.mrn}</td>
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} color="var(--text-muted)" />
                        {p.appointmentTime}
                      </div>
                    </td>
                    <td className="text-sm fw-600">{p.bodyArea}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/assessment?patient=${p.id}`); }}
                        >
                          <Phone size={14} /> {t('nurseDashboard.startCall')}
                        </button>
                      )}
                      {p.status === 'follow-up' && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/assessment?patient=${p.id}&type=followup`); }}
                        >
                          {t('nurseDashboard.statFollowUp')}
                        </button>
                      )}
                      {(p.status === 'assessment-completed' || p.status === 'completed') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/patient/${p.id}`); }}
                        >
                          {t('nurseDashboard.viewAction')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
