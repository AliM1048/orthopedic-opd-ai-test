import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, ArrowLeft } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { useLanguage } from '../hooks/useLanguage';

export default function AllPatients({ patients }) {
  const { t } = useLanguage();
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
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{t('allPatients.pageTitle')}</h1>
            <p>{t('allPatients.patientRecordsCount', { count: patients.length })}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('allPatients.patientRecords')}</div>
            <div className="search-bar">
              <Search size={16} color="var(--text-muted)" />
              <input placeholder={t('allPatients.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <p>{t('allPatients.noPatientsFound')}</p>
            </div>
          ) : (
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.patient')}</th>
                  <th>{t('allPatients.tableHeaderMrn')}</th>
                  <th>{t('allPatients.tableHeaderBodyArea')}</th>
                  <th>{t('allPatients.tableHeaderAssessments')}</th>
                  <th>{t('allPatients.tableHeaderEvaluations')}</th>
                  <th>{t('common.status')}</th>
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
                          <div className="text-muted">{t('allPatients.ageYears', { age: p.age })} · {p.gender}</div>
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
