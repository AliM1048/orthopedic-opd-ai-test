import { useState } from 'react';
import { Calendar, Clock, Stethoscope, Pencil, Check, X } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function VisitSummaryCard({ patient, isFollowUp, chiefComplaint, onChangeComplaint }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chiefComplaint);

  const handleSave = () => {
    onChangeComplaint(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(chiefComplaint);
    setEditing(false);
  };

  return (
    <div className="psc-card">
      <div className="psc-card-title">
        <Stethoscope size={16} />
        {t('assessment.visitCard.visitInformation')}
      </div>

      <div className="vsc-row">
        <div className="vsc-field">
          <div className="vsc-label">{t('assessment.visitCard.visitType')}</div>
          <div className="vsc-value">
            <span className={`vsc-type-badge ${isFollowUp ? 'followup' : 'initial'}`}>
              {isFollowUp ? t('assessment.visitCard.followUp') : t('assessment.visitCard.initialVisit')}
            </span>
          </div>
        </div>
        <div className="vsc-field">
          <div className="vsc-label">{t('assessment.visitCard.bodyArea')}</div>
          <div className="vsc-value fw-600">{patient?.bodyArea}</div>
        </div>
      </div>

      <div className="vsc-row">
        <div className="vsc-field">
          <div className="vsc-label"><Calendar size={12} /> {t('assessment.visitCard.date')}</div>
          <div className="vsc-value">{patient?.appointmentDate}</div>
        </div>
        <div className="vsc-field">
          <div className="vsc-label"><Clock size={12} /> {t('assessment.visitCard.time')}</div>
          <div className="vsc-value">{patient?.appointmentTime}</div>
        </div>
      </div>

      <div className="vsc-complaint">
        <div className="vsc-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('assessment.visitCard.chiefComplaint')}
          {!editing && (
            <button className="vsc-edit-btn" onClick={() => { setDraft(chiefComplaint); setEditing(true); }}>
              <Pencil size={12} /> {t('assessment.visitCard.edit')}
            </button>
          )}
        </div>
        {editing ? (
          <div className="vsc-edit-group">
            <input
              className="vsc-input"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              placeholder={t('assessment.visitCard.complaintPlaceholder')}
            />
            <div className="vsc-edit-actions">
              <button className="vsc-btn-save" onClick={handleSave}><Check size={14} /></button>
              <button className="vsc-btn-cancel" onClick={handleCancel}><X size={14} /></button>
            </div>
          </div>
        ) : (
          <div className="vsc-complaint-text">{chiefComplaint || t('assessment.visitCard.notSpecified')}</div>
        )}
      </div>
    </div>
  );
}
