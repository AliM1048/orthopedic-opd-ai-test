import { Check, Circle, Clock, Minus } from 'lucide-react';

const STATUS_META = {
  completed:   { label: 'Completed',   icon: Check,   cls: 'sis-completed'  },
  'in-progress':{ label: 'In Progress', icon: Clock,   cls: 'sis-inprogress' },
  pending:     { label: 'Pending',      icon: Minus,   cls: 'sis-pending'    },
  'not-started':{ label: 'Not Started', icon: Circle,  cls: 'sis-notstarted' },
};

export default function SectionStatusItem({ section, status, isActive, questionCount, answeredCount, onClick }) {
  const meta = STATUS_META[status] || STATUS_META['not-started'];
  const Icon = meta.icon;

  return (
    <button
      className={`sis-item ${meta.cls} ${isActive ? 'sis-active' : ''}`}
      onClick={onClick}
    >
      <div className="sis-icon-wrap">
        <Icon size={14} />
      </div>
      <div className="sis-content">
        <div className="sis-title">{section.title}</div>
        <div className="sis-meta">
          {answeredCount}/{questionCount} questions
        </div>
      </div>
      {isActive && <div className="sis-active-dot" />}
    </button>
  );
}
