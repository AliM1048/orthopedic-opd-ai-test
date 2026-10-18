import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PatientRecordPanel from '../components/patient/PatientRecordPanel';
import { useLanguage } from '../hooks/useLanguage';
import { Skeleton, SkeletonList } from '../components/common/Skeleton';

export default function PatientProfile({ patients, loading }) {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patients.find((p) => p.id === id);

  // Still fetching the patient list (e.g. right after a page refresh) —
  // show the page's shape instead of flashing "patient not found".
  if (!patient && loading) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width={180} height={18} />
            <Skeleton width={70} height={11} />
          </div>
        </div>
        <div className="page-body" aria-busy="true">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
              <Skeleton width={56} height={56} circle />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width="30%" height={16} />
                <Skeleton width="45%" height={11} />
              </div>
            </div>
            <div className="grid-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={56} style={{ borderRadius: 'var(--radius)' }} />)}
            </div>
          </div>
          <div className="card"><SkeletonList rows={4} /></div>
        </div>
      </>
    );
  }

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>{t('patientProfile.patientNotFound')}</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <p>{t('patientProfile.noPatientFoundId')}</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>{t('patientProfile.backToDashboard')}</button>
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
            <h1>{t('patientProfile.pageTitle')}</h1>
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
