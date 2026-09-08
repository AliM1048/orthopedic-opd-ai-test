import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Phone, Mail, MapPin, Droplets, AlertCircle, ClipboardList, Stethoscope, FileText, Pill, LayoutGrid, CalendarClock, Plus, Trash2, Settings2, PhoneCall, Scissors, Paperclip, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../api';
import { useLookup } from '../../hooks/useLookupData';
import StatusBadge from '../common/StatusBadge';
import FollowUpScheduleModal from './FollowUpScheduleModal';
import PromAssignmentModal from '../PromAssignmentModal';

function latestByDate(items) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'assessments', label: 'Assessments', icon: ClipboardList },
  { key: 'evaluations', label: 'Evaluations', icon: Stethoscope },
  { key: 'surgery', label: 'Surgery', icon: Scissors },
  { key: 'diagnostics', label: 'Diagnostics', icon: FileText },
  { key: 'treatments', label: 'Treatments', icon: Pill },
  { key: 'followups', label: 'Follow-Ups', icon: CalendarClock },
];

const successToast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, timerProgressBar: true,
  didOpen: (el) => { el.addEventListener('mouseenter', Swal.stopTimer); el.addEventListener('mouseleave', Swal.resumeTimer); },
});
const notifySuccess = (title) => successToast.fire({ icon: 'success', title });
const notifyError = (title) => successToast.fire({ icon: 'error', title, timer: 3000 });

const REMINDER_LEAD_DAYS = 2;
function todayIso() { return new Date().toISOString().split('T')[0]; }
function addDaysIso(iso, days) { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]; }
function callBucket(call) {
  if (call.status === 'completed') return 'completed';
  return call.scheduledDate <= addDaysIso(todayIso(), REMINDER_LEAD_DAYS) ? 'due' : 'upcoming';
}
const BUCKET_META = {
  due:       { label: 'Due Soon',  badgeClass: 'badge-danger' },
  upcoming:  { label: 'Upcoming',  badgeClass: 'badge-completed' },
  completed: { label: 'Completed', badgeClass: 'badge-active' },
};

// The patient-record body shared by the /patient/:id profile page and the
// Patient Status master-detail page — assumes `patient` is always a real
// record; callers handle their own "no patient" / "not found" states before
// rendering this.
export default function PatientRecordPanel({ patient }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Recurring PROM follow-up calls (e.g. 3/6/9 months out) for this patient —
  // see backend/routers/followups.py. Fetched here (not in a page-level
  // component) so both the /patient/:id profile and the Patient Status
  // master-detail view get it automatically.
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoaded, setFollowUpsLoaded] = useState(false);
  const [showAddCall, setShowAddCall] = useState(false);
  const [newCallDate, setNewCallDate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPromSendModal, setShowPromSendModal] = useState(false);
  const { bodyAreas } = useLookup();

  const reloadFollowUps = useCallback(() => {
    api.get(`/api/patients/${patient.id}/followups`)
      .then((res) => setFollowUps(res.data))
      .catch(() => setFollowUps([]))
      .finally(() => setFollowUpsLoaded(true));
  }, [patient.id]);

  useEffect(() => { reloadFollowUps(); }, [reloadFollowUps]);

  const handleReschedule = (callId, newDate) => {
    if (!newDate) return;
    api.patch(`/api/followups/${callId}`, { scheduledDate: newDate })
      .then(() => { notifySuccess('Rescheduled'); reloadFollowUps(); })
      .catch(() => notifyError('Failed to reschedule'));
  };

  const handleAddCall = () => {
    if (!newCallDate) return;
    api.post(`/api/patients/${patient.id}/followups`, { scheduledDate: newCallDate })
      .then(() => { notifySuccess('Call added'); setShowAddCall(false); setNewCallDate(''); reloadFollowUps(); })
      .catch(() => notifyError('Failed to add call'));
  };

  const handleDeleteCall = async (call) => {
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Remove this follow-up call?',
      text: call.scheduledDate,
      showCancelButton: true,
      confirmButtonText: 'Remove',
      confirmButtonColor: 'var(--danger)',
    }).then((r) => r.isConfirmed);
    if (!confirmed) return;
    api.delete(`/api/followups/${call.id}`)
      .then(() => { notifySuccess('Call removed'); reloadFollowUps(); })
      .catch(() => notifyError('Failed to remove'));
  };

  const latestEvaluation = latestByDate(patient.evaluations);
  const latestTreatment = latestByDate(patient.treatments);
  const latestAssessment = latestByDate(patient.assessments);
  const lastVisit = latestByDate([...patient.evaluations, ...patient.assessments, ...patient.treatments]);
  const hasAllergies = patient.allergies && patient.allergies.toLowerCase() !== 'none';

  return (
    <>
      {/* Patient Info Card */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div className="patient-avatar" style={{ background: patient.avatar, width: 64, height: 64, fontSize: 22 }}>
            {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{patient.name}</h2>
              <StatusBadge status={patient.status} />
            </div>
            <p className="text-muted">{patient.age} years old · {patient.gender} · {patient.bodyArea}</p>
          </div>
        </div>

        {/* At-a-glance summary — the key things a physician needs before seeing the patient */}
        <div className="profile-summary-banner">
          <div className="summary-chip">
            <label>Current Diagnosis</label>
            <span>{latestEvaluation ? latestEvaluation.diagnosis : 'None on file'}</span>
          </div>
          <div className="summary-chip">
            <label>Active Treatment</label>
            <span>{latestTreatment ? `${latestTreatment.type} · ${latestTreatment.duration}` : 'None on file'}</span>
          </div>
          <div className={`summary-chip ${hasAllergies ? 'danger' : ''}`}>
            <label>Allergies</label>
            <span>{patient.allergies || 'None'}</span>
          </div>
          <div className="summary-chip">
            <label>Last Visit</label>
            <span>{lastVisit ? lastVisit.date : 'No visits yet'}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/assessment?patient=${patient.id}`)}>
          <ClipboardList size={16} /> New Assessment
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/evaluation?patient=${patient.id}`)}>
          <Stethoscope size={16} /> Physician Evaluation
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/messages?patient=${encodeURIComponent(patient.id)}`)}>
          <MessageCircle size={16} /> Message
        </button>
        <button className="btn btn-outline" onClick={() => setShowPromSendModal(true)}>
          <ClipboardList size={16} /> Send / Resend Patient Form
        </button>
      </div>

      {showPromSendModal && (
        <PromAssignmentModal
          patient={patient}
          bodyAreas={bodyAreas}
          selfCompletionOnly
          onClose={() => setShowPromSendModal(false)}
          onAssigned={() => { setShowPromSendModal(false); notifySuccess('Patient form sent'); }}
        />
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Contact & Details</div>
            </div>
            <div className="info-grid">
              <div className="info-item"><label><Calendar size={12} /> Date of Birth</label><span>{patient.dob}</span></div>
              <div className="info-item"><label><Phone size={12} /> Phone</label><span>{patient.phone}</span></div>
              <div className="info-item"><label><Mail size={12} /> Email</label><span>{patient.email}</span></div>
              <div className="info-item"><label><MapPin size={12} /> Address</label><span>{patient.address}</span></div>
              <div className="info-item"><label><Droplets size={12} /> Blood Type</label><span>{patient.bloodType}</span></div>
              <div className="info-item"><label><AlertCircle size={12} /> Allergies</label><span>{patient.allergies || 'None'}</span></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Latest Summary</div>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot green" />
                <div className="timeline-date">Last Assessment</div>
                <div className="timeline-title">
                  {latestAssessment ? `${latestAssessment.type} — ${latestAssessment.bodyArea} (${latestAssessment.date})` : 'No assessments yet'}
                </div>
                {latestAssessment && <div className="timeline-body">Score: {latestAssessment.score}/{latestAssessment.maxScore}</div>}
              </div>
              <div className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-date">Last Evaluation</div>
                <div className="timeline-title">{latestEvaluation ? latestEvaluation.diagnosis : 'No evaluations yet'}</div>
                {latestEvaluation && <div className="timeline-body">{latestEvaluation.notes}</div>}
              </div>
              <div className="timeline-item" style={{ marginBottom: 0 }}>
                <div className="timeline-dot purple" />
                <div className="timeline-date">Active Treatment</div>
                <div className="timeline-title">
                  {latestTreatment ? `${latestTreatment.type} — ${latestTreatment.duration}` : 'No treatments yet'}
                </div>
                {latestTreatment?.followUpDate && <div className="timeline-body">Follow-up: {latestTreatment.followUpDate}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ClipboardList size={16} style={{ display: 'inline', marginRight: 6 }} />Assessments</div>
          </div>
          {patient.assessments.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No assessments yet.</p>
          ) : (
            <div className="timeline">
              {patient.assessments.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <div className="timeline-dot green" />
                  <div className="timeline-date">{a.date} · {a.completedBy}</div>
                  <div className="timeline-title">{a.type} Assessment — {a.bodyArea}</div>
                  <div className="timeline-body">Score: {a.score}/{a.maxScore}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Stethoscope size={16} style={{ display: 'inline', marginRight: 6 }} />Physician Evaluations</div>
          </div>
          {patient.evaluations.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No evaluations yet.</p>
          ) : (
            <div className="timeline">
              {patient.evaluations.map((ev) => (
                <div className="timeline-item" key={ev.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-date">{ev.date} · {ev.physician}</div>
                  <div className="timeline-title">{ev.diagnosis}</div>
                  <div className="timeline-body">{ev.notes}</div>
                  {ev.documents?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {ev.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={`${api.defaults.baseURL}/documents/${doc.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', textDecoration: 'none' }}
                        >
                          <Paperclip size={12} /> {doc.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'surgery' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Scissors size={16} style={{ display: 'inline', marginRight: 6 }} />Surgery Evaluations</div>
          </div>
          {(patient.surgeryEvaluations || []).length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No surgeries yet.</p>
          ) : (
            <div className="timeline">
              {patient.surgeryEvaluations.map((ev) => (
                <div className="timeline-item" key={ev.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-date">{ev.date} · {ev.surgeon}</div>
                  <div className="timeline-title">{ev.diagnosis}</div>
                  <div className="timeline-body">{ev.notes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><FileText size={16} style={{ display: 'inline', marginRight: 6 }} />Diagnostic Tests</div>
          </div>
          {patient.diagnostics.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No diagnostic tests yet.</p>
          ) : (
            <table className="data-table">
              <thead><tr><th>Test</th><th>Date</th><th>Status</th><th>Result</th></tr></thead>
              <tbody>
                {patient.diagnostics.map((d) => (
                  <tr key={d.id} style={{ cursor: 'default' }}>
                    <td className="fw-600">{d.type}</td>
                    <td className="text-sm">{d.date}</td>
                    <td><span className={`badge ${d.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}><span className="badge-dot" />{d.status}</span></td>
                    <td className="text-sm">{d.result || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'treatments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Pill size={16} style={{ display: 'inline', marginRight: 6 }} />Treatment Plans</div>
          </div>
          {patient.treatments.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No treatments yet.</p>
          ) : (
            <div className="timeline">
              {patient.treatments.map((t) => (
                <div className="timeline-item" key={t.id}>
                  <div className="timeline-dot purple" />
                  <div className="timeline-date">{t.date} · {t.physician}</div>
                  <div className="timeline-title">{t.type} — {t.duration}</div>
                  <div className="timeline-body">{t.details}</div>
                  {t.followUpDate && <div className="timeline-body" style={{ marginTop: 4 }}>Follow-up: {t.followUpDate}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><CalendarClock size={16} style={{ display: 'inline', marginRight: 6 }} />PROM Follow-Up Calls</div>
              <div className="card-subtitle">Recurring check-in calls (e.g. 3/6/9 months out) — reminders surface {REMINDER_LEAD_DAYS} days before each one.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)}>
                <Settings2 size={14} /> Schedule Interval
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCall((s) => !s)}>
                <Plus size={14} /> Add Call
              </button>
            </div>
          </div>

          {showAddCall && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <input type="date" className="form-control" style={{ maxWidth: 200 }} value={newCallDate} onChange={(e) => setNewCallDate(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={handleAddCall} disabled={!newCallDate}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddCall(false); setNewCallDate(''); }}>Cancel</button>
            </div>
          )}

          {!followUpsLoaded ? (
            <p className="text-muted">Loading…</p>
          ) : followUps.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No follow-up calls scheduled yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Check-In</th><th>Scheduled Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {followUps.map((call) => {
                    const bucket = callBucket(call);
                    const meta = BUCKET_META[bucket];
                    return (
                      <tr key={call.id} style={{ cursor: 'default' }}>
                        <td>{call.intervalMonths ? `${call.intervalMonths}-month` : 'Custom'}</td>
                        <td>
                          {call.status === 'pending' ? (
                            <input type="date" className="form-control" style={{ width: 150, padding: '6px 10px', fontSize: 13 }} value={call.scheduledDate} onChange={(e) => handleReschedule(call.id, e.target.value)} />
                          ) : (
                            <span className="text-sm">{call.scheduledDate}</span>
                          )}
                        </td>
                        <td><span className={`badge ${meta.badgeClass}`}><span className="badge-dot" />{meta.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {call.status === 'pending' && (
                              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/assessment?patient=${patient.id}&type=followup`)}>
                                <PhoneCall size={13} /> Start Call
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCall(call)}
                              title="Remove"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 12%, transparent)'; e.currentTarget.style.color = 'var(--danger)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                              <Trash2 size={14} />
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
      )}

      {showScheduleModal && (
        <FollowUpScheduleModal
          patient={patient}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => { setShowScheduleModal(false); reloadFollowUps(); }}
        />
      )}
    </>
  );
}
