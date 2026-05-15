import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { DIAGNOSTIC_TESTS } from '../data/mockData';

export default function DiagnosticRequests({ patients, onAddDiagnostic }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const patient = patients.find((p) => p.id === patientId);

  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTest = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    selected.forEach((testId) => {
      const test = DIAGNOSTIC_TESTS.find((t) => t.id === testId);
      const diagnostic = {
        id: `d${Date.now()}-${testId}`,
        type: test.name,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        result: null
      };
      if (onAddDiagnostic) onAddDiagnostic(patientId, diagnostic);
    });
    setSubmitted(true);
  };

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Diagnostic Requests</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
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
        <div className="topbar"><div className="topbar-left"><h1>Diagnostics Requested</h1></div></div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧪</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Tests Requested</h2>
            <p className="text-muted mb-4">{selected.length} diagnostic test{selected.length !== 1 ? 's' : ''} requested for {patient.name}.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
              <button className="btn btn-outline" onClick={() => navigate(`/treatment?patient=${patient.id}`)}>Create Treatment Plan</button>
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
            <h1>Request Diagnostic Tests</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Existing Tests */}
          {patient.diagnostics.length > 0 && (
            <div className="card mb-4">
              <div className="card-title" style={{ marginBottom: 12 }}>Existing Diagnostic Tests</div>
              <table className="data-table">
                <thead><tr><th>Test</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {patient.diagnostics.map((d) => (
                    <tr key={d.id} style={{ cursor: 'default' }}>
                      <td className="fw-600">{d.type}</td>
                      <td className="text-sm">{d.date}</td>
                      <td><span className={`badge ${d.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}><span className="badge-dot" />{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Select Tests */}
          <div className="card mb-4">
            <div className="card-title" style={{ marginBottom: 4 }}>Select Tests</div>
            <p className="text-muted mb-4">Click to select the tests you'd like to request.</p>
            <div className="diag-grid">
              {DIAGNOSTIC_TESTS.map((test) => (
                <div
                  key={test.id}
                  className={`diag-card ${selected.includes(test.id) ? 'selected' : ''}`}
                  onClick={() => toggleTest(test.id)}
                >
                  <div className="diag-card-icon">{test.icon}</div>
                  <div className="diag-card-name">{test.name}</div>
                  <div className="diag-card-desc">{test.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="card mb-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Special instructions or areas of focus…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={selected.length === 0}>
              <Send size={18} /> Request {selected.length} Test{selected.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
