import { useState } from 'react';
import { Calendar, Clock, Stethoscope, Pencil, Check, X } from 'lucide-react';

export default function VisitSummaryCard({ patient, isFollowUp, chiefComplaint, onChangeComplaint }) {
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
        Visit Information
      </div>

      <div className="vsc-row">
        <div className="vsc-field">
          <div className="vsc-label">Visit Type</div>
          <div className="vsc-value">
            <span className={`vsc-type-badge ${isFollowUp ? 'followup' : 'initial'}`}>
              {isFollowUp ? 'Follow-Up' : 'Initial Visit'}
            </span>
          </div>
        </div>
        <div className="vsc-field">
          <div className="vsc-label">Body Area</div>
          <div className="vsc-value fw-600">{patient?.bodyArea}</div>
        </div>
      </div>

      <div className="vsc-row">
        <div className="vsc-field">
          <div className="vsc-label"><Calendar size={12} /> Date</div>
          <div className="vsc-value">{patient?.appointmentDate}</div>
        </div>
        <div className="vsc-field">
          <div className="vsc-label"><Clock size={12} /> Time</div>
          <div className="vsc-value">{patient?.appointmentTime}</div>
        </div>
      </div>

      <div className="vsc-complaint">
        <div className="vsc-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Chief Complaint
          {!editing && (
            <button className="vsc-edit-btn" onClick={() => { setDraft(chiefComplaint); setEditing(true); }}>
              <Pencil size={12} /> Edit
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
              placeholder="Describe chief complaint…"
            />
            <div className="vsc-edit-actions">
              <button className="vsc-btn-save" onClick={handleSave}><Check size={14} /></button>
              <button className="vsc-btn-cancel" onClick={handleCancel}><X size={14} /></button>
            </div>
          </div>
        ) : (
          <div className="vsc-complaint-text">{chiefComplaint || 'Not specified'}</div>
        )}
      </div>
    </div>
  );
}
