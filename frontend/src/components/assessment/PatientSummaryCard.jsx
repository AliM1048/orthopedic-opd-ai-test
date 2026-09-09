import { User, Phone, Calendar, Activity, Hash } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function PatientSummaryCard({ patient }) {
  const { t } = useLanguage();
  if (!patient) return null;

  const initials = patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const statusMap = {
    pending: { label: t('assessment.patientCard.statusPendingCall'), color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 15%, var(--surface))' },
    'assessment-completed': { label: t('assessment.patientCard.statusAssessed'), color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 15%, var(--surface))' },
    'follow-up': { label: t('assessment.patientCard.statusFollowUp'), color: 'var(--info)', bg: 'color-mix(in srgb, var(--info) 15%, var(--surface))' },
    completed: { label: t('assessment.patientCard.statusCompleted'), color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 15%, var(--surface))' },
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
