import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Phone, Mail, MapPin, Droplets, AlertCircle, ClipboardList, Stethoscope, FileText, Pill, LayoutGrid } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

function latestByDate(items) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0];
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'assessments', label: 'Assessments', icon: ClipboardList },
  { key: 'evaluations', label: 'Evaluations', icon: Stethoscope },
  { key: 'diagnostics', label: 'Diagnostics', icon: FileText },
  { key: 'treatments', label: 'Treatments', icon: Pill },
];

// The patient-record body shared by the /patient/:id profile page and the
// Patient Status master-detail page — assumes `patient` is always a real
// record; callers handle their own "no patient" / "not found" states before
// rendering this.
export default function PatientRecordPanel({ patient }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

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
      </div>

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
    </>
  );
}
