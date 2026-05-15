import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { TREATMENT_OPTIONS } from '../data/mockData';

export default function TreatmentPathway({ patients, onAddTreatment }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient = patients.find((p) => p.id === patientId);

  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState('');
  const [details, setDetails] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    const option = TREATMENT_OPTIONS.find((t) => t.id === selected);
    const treatment = {
      id: `t${Date.now()}`,
      type: option.name,
      date: new Date().toISOString().split('T')[0],
      physician: 'Dr. Khalid Mansour',
      duration: duration || 'TBD',
      details: details.trim(),
      followUpDate: followUpDate || null,
      status: 'active'
    };
    if (onAddTreatment) onAddTreatment(patientId, treatment);
    setSubmitted(true);
  };

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Treatment Plan</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">💊</div>
            <p>No patient selected.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Treatment Plan Saved</h1></div></div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Treatment Plan Created</h2>
            <p className="text-muted mb-4">Treatment plan for {patient.name} has been saved successfully.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>Dashboard</button>
            </div>
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
            <h1>Create Treatment Plan</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Patient Summary */}
          <div className="card mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="patient-avatar" style={{ background: patient.avatar, width: 48, height: 48 }}>
                {patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="fw-700">{patient.name}</div>
                <div className="text-muted">{patient.age}y · {patient.gender} · {patient.bodyArea}</div>
              </div>
              {patient.evaluations.length > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-sm">Latest Diagnosis</div>
                  <div className="fw-600 text-sm">{patient.evaluations[patient.evaluations.length - 1].diagnosis}</div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Treatments */}
          {patient.treatments.length > 0 && (
            <div className="card mb-4">
              <div className="card-title" style={{ marginBottom: 12 }}>Active Treatments</div>
              {patient.treatments.map((t) => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="fw-600">{t.type}</span>
                      <span className="text-muted"> — {t.duration}</span>
                    </div>
                    <span className="badge badge-active"><span className="badge-dot" />{t.status}</span>
                  </div>
                  <div className="text-sm text-muted mt-2">{t.details}</div>
                </div>
              ))}
            </div>
          )}

          {/* Select Treatment */}
          <div className="card mb-4">
            <div className="card-title" style={{ marginBottom: 4 }}>Select Treatment Type</div>
            <p className="text-muted mb-4">Choose the appropriate treatment pathway for this patient.</p>
            <div className="treatment-grid">
              {TREATMENT_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className={`treatment-card ${selected === opt.id ? 'selected' : ''}`}
                  onClick={() => setSelected(opt.id)}
                >
                  <div className="treatment-card-header">
                    <span className="treatment-icon">{opt.icon}</span>
                    <span className="treatment-name">{opt.name}</span>
                  </div>
                  <div className="treatment-desc">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Details */}
          {selected && (
            <div className="card mb-4">
              <div className="card-title" style={{ marginBottom: 16 }}>Treatment Details</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input className="form-control" placeholder="e.g., 3 months, 6 weeks" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-Up Date</label>
                  <input className="form-control" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Instructions & Details</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Medication schedule, recovery plan, physician instructions…"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!selected}>
              <Save size={18} /> Save Treatment Plan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
