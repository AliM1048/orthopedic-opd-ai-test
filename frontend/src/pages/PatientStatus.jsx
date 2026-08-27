import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import PatientRecordPanel from '../components/patient/PatientRecordPanel';

// Master-detail patient lookup: search/select on the left, full record on
// the right — reuses the exact same PatientRecordPanel the /patient/:id
// profile page renders, so switching patients here never navigates away.
export default function PatientStatus({ patients }) {
  const [searchParams] = useSearchParams();
  const preselectId = searchParams.get('patient');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(preselectId || null);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || p.bodyArea.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const selectedPatient = patients.find((p) => p.id === selectedId) || null;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Patient Status</h1>
          <p>Select a patient to view their full record</p>
        </div>
      </div>

      <div className="page-body">
        <div className="ps-layout">
          {/* Left — searchable patient list */}
          <div className="card ps-list-col">
            <div className="search-bar" style={{ marginBottom: 12 }}>
              <Search size={16} color="var(--text-muted)" />
              <input placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <p>No patients found.</p>
              </div>
            ) : (
              <div className="ps-patient-list">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`ps-patient-row ${selectedId === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <div className="patient-avatar" style={{ background: p.avatar, width: 36, height: 36, fontSize: 13 }}>
                      {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ps-patient-name">{p.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{p.mrn} · {p.bodyArea}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — selected patient's record */}
          <div className="ps-detail-col">
            {selectedPatient ? (
              <PatientRecordPanel patient={selectedPatient} />
            ) : (
              <div className="card empty-state" style={{ padding: 64 }}>
                <div className="empty-state-icon"><Users size={40} /></div>
                <p>Select a patient from the list to view their record.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
