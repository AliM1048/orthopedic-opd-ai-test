import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PatientRecordPanel from '../components/patient/PatientRecordPanel';

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
      </div>

      <div className="page-body">
        <PatientRecordPanel patient={patient} />
      </div>
    </>
  );
}
