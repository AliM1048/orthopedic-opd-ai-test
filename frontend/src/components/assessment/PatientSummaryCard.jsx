import { User, Phone, Calendar, Activity, Hash } from 'lucide-react';

export default function PatientSummaryCard({ patient }) {
  if (!patient) return null;

  const initials = patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const statusMap = {
    pending: { label: 'Pending Call', color: '#f59e0b', bg: '#fef3c7' },
    'assessment-completed': { label: 'Assessed', color: '#10b981', bg: '#d1fae5' },
    'follow-up': { label: 'Follow-Up', color: '#8b5cf6', bg: '#ede9fe' },
    completed: { label: 'Completed', color: '#0ea5e9', bg: '#e0f2fe' },
  };
  const status = statusMap[patient.status] || statusMap.pending;

  return (
    <div className="psc-card">
      <div className="psc-header">
        <div className="psc-avatar" style={{ background: patient.avatar }}>
          {initials}
        </div>
        <div className="psc-identity">
          <div className="psc-name">{patient.name}</div>
          <div className="psc-sub">{patient.age}y · {patient.gender}</div>
          <div className="psc-status-badge" style={{ background: status.bg, color: status.color }}>
            <span className="psc-status-dot" style={{ background: status.color }} />
            {status.label}
          </div>
        </div>
      </div>
      <div className="psc-meta">
        <div className="psc-meta-item">
          <Hash size={13} />
          <span>{patient.mrn}</span>
        </div>
        <div className="psc-meta-item">
          <Phone size={13} />
          <span>{patient.phone}</span>
        </div>
        <div className="psc-meta-item">
          <Activity size={13} />
          <span>{patient.bloodType} · {patient.allergies}</span>
        </div>
      </div>
    </div>
  );
}
