import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function AllPatients({ patients }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || p.bodyArea.toLowerCase().includes(q)
    );
  }, [patients, search]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>All Patients</h1>
          <p>{patients.length} patient records</p>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Patient Records</div>
            <div className="search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input placeholder="Search by name, MRN, or body area…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <p>No patients found.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Body Area</th>
                  <th>Assessments</th>
                  <th>Evaluations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/patient/${p.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="patient-avatar" style={{ background: p.avatar, width: 36, height: 36, fontSize: 13 }}>
                          {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="fw-600">{p.name}</div>
                          <div className="text-muted">{p.age}y · {p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{p.mrn}</td>
                    <td className="text-sm fw-600">{p.bodyArea}</td>
                    <td className="text-sm">{p.assessments.length}</td>
                    <td className="text-sm">{p.evaluations.length}</td>
                    <td><StatusBadge status={p.status} /></td>
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
