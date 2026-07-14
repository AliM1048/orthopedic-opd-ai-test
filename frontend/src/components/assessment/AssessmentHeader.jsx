import { ClipboardList } from 'lucide-react';

export default function AssessmentHeader({ config, overallProgress, totalQuestions, answeredQuestions }) {
  return (
    <div className="asmh-header">
      <div className="asmh-left">
        <div className="asmh-icon">
          <ClipboardList size={20} />
        </div>
        <div>
          <div className="asmh-title">{config?.title || 'PROM Intake'}</div>
          <div className="asmh-desc">{config?.description}</div>
        </div>
      </div>
      <div className="asmh-right">
        <div className="asmh-progress-label">
          <span className="asmh-pct">{overallProgress}%</span>
          <span className="asmh-pct-label">&nbsp;Complete</span>
        </div>
        <div className="asmh-progress-info">
          {answeredQuestions} of {totalQuestions} questions answered
        </div>
        <div className="asmh-progress-bar">
          <div
            className="asmh-progress-fill"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
