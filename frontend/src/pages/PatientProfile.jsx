import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Phone, Mail, MapPin, Droplets, AlertCircle, ClipboardList, Stethoscope, FileText, Pill } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function PatientProfile({ patients }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find((p) => p.id === id);

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Patient Not Found</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <p>No patient found with this ID.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Back to Dashboard</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1>Patient Profile</h1>
            <p>{patient.mrn}</p>
          </div>
        </div>
        <div className="topbar-right">
          <StatusBadge status={patient.status} />
        </div>
      </div>

      <div className="page-body">
        {/* Patient Info Card */}
        <div className="card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div className="patient-avatar" style={{ background: patient.avatar, width: 64, height: 64, fontSize: 22 }}>
              {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{patient.name}</h2>
              <p className="text-muted">{patient.age} years old · {patient.gender} · {patient.bodyArea}</p>
            </div>
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

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate(`/assessment?patient=${patient.id}`)}>
            <ClipboardList size={16} /> New Assessment
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/evaluation?patient=${patient.id}`)}>
            <Stethoscope size={16} /> Physician Evaluation
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/diagnostics?patient=${patient.id}`)}>
            <FileText size={16} /> Request Diagnostics
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/treatment?patient=${patient.id}`)}>
            <Pill size={16} /> Treatment Plan
          </button>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Assessments */}
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

          {/* Evaluations */}
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

          {/* Diagnostics */}
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

          {/* Treatments */}
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
        </div>
      </div>
    </>
  );
}
