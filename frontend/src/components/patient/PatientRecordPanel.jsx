import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Phone, Mail, MapPin, Droplets, AlertCircle, ClipboardList, Stethoscope, FileText, Pill, LayoutGrid, CalendarClock, Plus, Trash2, Settings2, PhoneCall, Scissors, Paperclip, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import api, { withAuthToken } from '../../api';
import { useLookup } from '../../hooks/useLookupData';
import StatusBadge from '../common/StatusBadge';
import FollowUpScheduleModal from './FollowUpScheduleModal';
import PromAssignmentModal from '../PromAssignmentModal';
import { useLanguage } from '../../hooks/useLanguage';

function latestByDate(items) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

const TABS = [
  { key: 'overview', labelKey: 'patientRecordPanel.tabOverview', icon: LayoutGrid },
  { key: 'assessments', labelKey: 'patientRecordPanel.tabAssessments', icon: ClipboardList },
  { key: 'evaluations', labelKey: 'patientRecordPanel.tabEvaluations', icon: Stethoscope },
  { key: 'surgery', labelKey: 'patientRecordPanel.tabSurgery', icon: Scissors },
  { key: 'diagnostics', labelKey: 'patientRecordPanel.tabDiagnostics', icon: FileText },
  { key: 'treatments', labelKey: 'patientRecordPanel.tabTreatments', icon: Pill },
  { key: 'followups', labelKey: 'patientRecordPanel.tabFollowUps', icon: CalendarClock },
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
  due:       { labelKey: 'patientRecordPanel.bucketDueSoon',  badgeClass: 'badge-danger' },
  upcoming:  { labelKey: 'patientRecordPanel.bucketUpcoming',  badgeClass: 'badge-completed' },
  completed: { labelKey: 'patientRecordPanel.bucketCompleted', badgeClass: 'badge-active' },
};

// The patient-record body shared by the /patient/:id profile page and the
// Patient Status master-detail page — assumes `patient` is always a real
// record; callers handle their own "no patient" / "not found" states before
// rendering this.
export default function PatientRecordPanel({ patient }) {
  const { t } = useLanguage();
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
      .then(() => { notifySuccess(t('patientRecordPanel.toastRescheduled')); reloadFollowUps(); })
      .catch(() => notifyError(t('patientRecordPanel.toastRescheduleFailed')));
  };

  const handleAddCall = () => {
    if (!newCallDate) return;
    api.post(`/api/patients/${patient.id}/followups`, { scheduledDate: newCallDate })
      .then(() => { notifySuccess(t('patientRecordPanel.toastCallAdded')); setShowAddCall(false); setNewCallDate(''); reloadFollowUps(); })
      .catch(() => notifyError(t('patientRecordPanel.toastAddCallFailed')));
  };

  const handleDeleteCall = async (call) => {
    const confirmed = await Swal.fire({
      icon: 'warning',
      title: t('patientRecordPanel.removeCallConfirmTitle'),
      text: call.scheduledDate,
      showCancelButton: true,
      confirmButtonText: t('patientRecordPanel.removeConfirmButton'),
      confirmButtonColor: 'var(--danger)',
    }).then((r) => r.isConfirmed);
    if (!confirmed) return;
    api.delete(`/api/followups/${call.id}`)
      .then(() => { notifySuccess(t('patientRecordPanel.toastCallRemoved')); reloadFollowUps(); })
      .catch(() => notifyError(t('patientRecordPanel.toastRemoveCallFailed')));
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
            <p className="text-muted">{t('patientRecordPanel.ageYearsOld', { age: patient.age })} · {patient.gender} · {patient.bodyArea}</p>
          </div>
        </div>

        {/* At-a-glance summary — the key things a physician needs before seeing the patient */}
        <div className="profile-summary-banner">
          <div className="summary-chip">
            <label>{t('patientRecordPanel.currentDiagnosis')}</label>
            <span>{latestEvaluation ? latestEvaluation.diagnosis : t('patientRecordPanel.noneOnFile')}</span>
          </div>
          <div className="summary-chip">
            <label>{t('patientRecordPanel.activeTreatment')}</label>
            <span>{latestTreatment ? `${latestTreatment.type} · ${latestTreatment.duration}` : t('patientRecordPanel.noneOnFile')}</span>
          </div>
          <div className={`summary-chip ${hasAllergies ? 'danger' : ''}`}>
            <label>{t('patientRecordPanel.allergies')}</label>
            <span>{patient.allergies || t('common.none')}</span>
          </div>
          <div className="summary-chip">
            <label>{t('patientRecordPanel.lastVisit')}</label>
            <span>{lastVisit ? lastVisit.date : t('patientRecordPanel.noVisitsYet')}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/assessment?patient=${patient.id}`)}>
          <ClipboardList size={16} /> {t('patientRecordPanel.newAssessment')}
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/evaluation?patient=${patient.id}`)}>
          <Stethoscope size={16} /> {t('patientRecordPanel.physicianEvaluation')}
        </button>
        <button className="btn btn-outline" onClick={() => navigate(`/messages?patient=${encodeURIComponent(patient.id)}`)}>
          <MessageCircle size={16} /> {t('patientRecordPanel.message')}
        </button>
        <button className="btn btn-outline" onClick={() => setShowPromSendModal(true)}>
          <ClipboardList size={16} /> {t('patientRecordPanel.sendResendPatientForm')}
        </button>
      </div>

      {showPromSendModal && (
        <PromAssignmentModal
          patient={patient}
          bodyAreas={bodyAreas}
          selfCompletionOnly
          onClose={() => setShowPromSendModal(false)}
          onAssigned={() => { setShowPromSendModal(false); notifySuccess(t('patientRecordPanel.toastPatientFormSent')); }}
        />
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">{t('patientRecordPanel.contactDetails')}</div>
            </div>
            <div className="info-grid">
              <div className="info-item"><label><Calendar size={12} /> {t('patientRecordPanel.dateOfBirth')}</label><span>{patient.dob}</span></div>
              <div className="info-item"><label><Phone size={12} /> {t('patientRecordPanel.phone')}</label><span>{patient.phone}</span></div>
              <div className="info-item"><label><Mail size={12} /> {t('patientRecordPanel.email')}</label><span>{patient.email}</span></div>
              <div className="info-item"><label><MapPin size={12} /> {t('patientRecordPanel.address')}</label><span>{patient.address}</span></div>
              <div className="info-item"><label><Droplets size={12} /> {t('patientRecordPanel.bloodType')}</label><span>{patient.bloodType}</span></div>
              <div className="info-item"><label><AlertCircle size={12} /> {t('patientRecordPanel.allergies')}</label><span>{patient.allergies || t('common.none')}</span></div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">{t('patientRecordPanel.latestSummary')}</div>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot green" />
                <div className="timeline-date">{t('patientRecordPanel.lastAssessment')}</div>
                <div className="timeline-title">
                  {latestAssessment ? `${latestAssessment.type} — ${latestAssessment.bodyArea} (${latestAssessment.date})` : t('patientRecordPanel.noAssessmentsYet')}
                </div>
                {latestAssessment && <div className="timeline-body">{t('patientRecordPanel.scoreFraction', { score: latestAssessment.score, maxScore: latestAssessment.maxScore })}</div>}
              </div>
              <div className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-date">{t('patientRecordPanel.lastEvaluation')}</div>
                <div className="timeline-title">{latestEvaluation ? latestEvaluation.diagnosis : t('patientRecordPanel.noEvaluationsYet')}</div>
                {latestEvaluation && <div className="timeline-body">{latestEvaluation.notes}</div>}
              </div>
              <div className="timeline-item" style={{ marginBottom: 0 }}>
                <div className="timeline-dot purple" />
                <div className="timeline-date">{t('patientRecordPanel.activeTreatment')}</div>
                <div className="timeline-title">
                  {latestTreatment ? `${latestTreatment.type} — ${latestTreatment.duration}` : t('patientRecordPanel.noTreatmentsYet')}
                </div>
                {latestTreatment?.followUpDate && <div className="timeline-body">{t('patientRecordPanel.followUpLabel', { date: latestTreatment.followUpDate })}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ClipboardList size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.tabAssessments')}</div>
          </div>
          {patient.assessments.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noAssessmentsYetPeriod')}</p>
          ) : (
            <div className="timeline">
              {patient.assessments.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <div className="timeline-dot green" />
                  <div className="timeline-date">{a.date} · {a.completedBy}</div>
                  <div className="timeline-title">{t('patientRecordPanel.assessmentEntryTitle', { type: a.type, bodyArea: a.bodyArea })}</div>
                  <div className="timeline-body">{t('patientRecordPanel.scoreFraction', { score: a.score, maxScore: a.maxScore })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluations' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Stethoscope size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.physicianEvaluationsTitle')}</div>
          </div>
          {patient.evaluations.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noEvaluationsYetPeriod')}</p>
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
                          href={withAuthToken(`${api.defaults.baseURL}/documents/${doc.filename}`)}
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
            <div className="card-title"><Scissors size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.surgeryEvaluationsTitle')}</div>
          </div>
          {(patient.surgeryEvaluations || []).length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noSurgeriesYet')}</p>
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
            <div className="card-title"><FileText size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.diagnosticTestsTitle')}</div>
          </div>
          {patient.diagnostics.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noDiagnosticTestsYet')}</p>
          ) : (
            <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>{t('patientRecordPanel.tableHeaderTest')}</th><th>{t('common.date')}</th><th>{t('common.status')}</th><th>{t('patientRecordPanel.tableHeaderResult')}</th></tr></thead>
              <tbody>
                {patient.diagnostics.map((d) => (
                  <tr key={d.id} style={{ cursor: 'default' }}>
                    <td className="fw-600">{d.type}</td>
                    <td className="text-sm">{d.date}</td>
                    <td><span className={`badge ${d.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}><span className="badge-dot" />{d.status === 'completed' ? t('patientRecordPanel.diagnosticStatusCompleted') : d.status === 'pending' ? t('patientRecordPanel.diagnosticStatusPending') : d.status}</span></td>
                    <td className="text-sm">{d.result || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'treatments' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Pill size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.treatmentPlansTitle')}</div>
          </div>
          {patient.treatments.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noTreatmentsYetPeriod')}</p>
          ) : (
            <div className="timeline">
              {patient.treatments.map((tr) => (
                <div className="timeline-item" key={tr.id}>
                  <div className="timeline-dot purple" />
                  <div className="timeline-date">{tr.date} · {tr.physician}</div>
                  <div className="timeline-title">{tr.type} — {tr.duration}</div>
                  <div className="timeline-body">{tr.details}</div>
                  {tr.followUpDate && <div className="timeline-body" style={{ marginTop: 4 }}>{t('patientRecordPanel.followUpLabel', { date: tr.followUpDate })}</div>}
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
              <div className="card-title"><CalendarClock size={16} style={{ display: 'inline', marginRight: 6 }} />{t('patientRecordPanel.followUpCallsTitle')}</div>
              <div className="card-subtitle">{t('patientRecordPanel.followUpCallsSubtitle', { days: REMINDER_LEAD_DAYS })}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowScheduleModal(true)}>
                <Settings2 size={14} /> {t('patientRecordPanel.scheduleInterval')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCall((s) => !s)}>
                <Plus size={14} /> {t('patientRecordPanel.addCall')}
              </button>
            </div>
          </div>

          {showAddCall && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <input type="date" className="form-control" style={{ maxWidth: 200 }} value={newCallDate} onChange={(e) => setNewCallDate(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={handleAddCall} disabled={!newCallDate}>{t('common.save')}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddCall(false); setNewCallDate(''); }}>{t('common.cancel')}</button>
            </div>
          )}

          {!followUpsLoaded ? (
            <p className="text-muted">{t('patientRecordPanel.loadingFollowUps')}</p>
          ) : followUps.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>{t('patientRecordPanel.noFollowUpCallsScheduled')}</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>{t('patientRecordPanel.tableHeaderCheckIn')}</th><th>{t('patientRecordPanel.tableHeaderScheduledDate')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr>
                </thead>
                <tbody>
                  {followUps.map((call) => {
                    const bucket = callBucket(call);
                    const meta = BUCKET_META[bucket];
                    return (
                      <tr key={call.id} style={{ cursor: 'default' }}>
                        <td>{call.intervalMonths ? t('patientRecordPanel.monthInterval', { months: call.intervalMonths }) : t('patientRecordPanel.customInterval')}</td>
                        <td>
                          {call.status === 'pending' ? (
                            <input type="date" className="form-control" style={{ width: 150, padding: '6px 10px', fontSize: 13 }} value={call.scheduledDate} onChange={(e) => handleReschedule(call.id, e.target.value)} />
                          ) : (
                            <span className="text-sm">{call.scheduledDate}</span>
                          )}
                        </td>
                        <td><span className={`badge ${meta.badgeClass}`}><span className="badge-dot" />{t(meta.labelKey)}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {call.status === 'pending' && (
                              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/assessment?patient=${patient.id}&type=followup`)}>
                                <PhoneCall size={13} /> {t('patientRecordPanel.startCall')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCall(call)}
                              title={t('patientRecordPanel.removeTitle')}
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
