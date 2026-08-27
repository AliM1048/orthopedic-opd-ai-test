import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Calendar } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().split('T')[0];
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

// Worklist of patients with a scheduled/upcoming surgery — a Treatment row
// of type "Surgery" whose date hasn't passed yet. Reuses the already-loaded
// `patients` list (each carries its own `treatments`) rather than a new
// backend endpoint, same pattern as PatientStatus/Analytics.
function getUpcomingSurgeries(patients) {
  const today = todayIso();
  const rows = [];
  for (const p of patients) {
    for (const t of p.treatments || []) {
      if (t.type === 'Surgery' && t.date >= today) {
        rows.push({ patient: p, treatment: t });
      }
    }
  }
  return rows.sort((a, b) => a.treatment.date.localeCompare(b.treatment.date));
}

export default function Surgeries({ patients }) {
  const navigate = useNavigate();
  const rows = useMemo(() => getUpcomingSurgeries(patients), [patients]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Surgeries</h1>
          <p>Patients with a scheduled or upcoming surgery</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Scissors size={32} /></div>
              <p>No scheduled surgeries.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Surgery Date</th>
                  <th>Details</th>
                  <th>Status</th>
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
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} color="var(--text-muted)" />
                        {treatment.date}
                      </div>
                    </td>
                    <td className="text-sm">{treatment.details || '—'}</td>
                    <td><StatusPill status={treatment.status} /></td>
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
