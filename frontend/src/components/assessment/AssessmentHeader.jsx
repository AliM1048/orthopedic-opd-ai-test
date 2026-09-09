import { ClipboardList } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function AssessmentHeader({ config, overallProgress, totalQuestions, answeredQuestions }) {
  const { t } = useLanguage();
  return (
    <div className="asmh-header">
      <div className="asmh-left">
        <div className="asmh-icon">
          <ClipboardList size={20} />
        </div>
        <div>
          <div className="asmh-title">{config?.title || t('assessment.header.defaultTitle')}</div>
          <div className="asmh-desc">{config?.description}</div>
        </div>
      </div>
      <div className="asmh-right">
        <div className="asmh-progress-label">
          <span className="asmh-pct">{overallProgress}%</span>
          <span className="asmh-pct-label">&nbsp;{t('assessment.header.complete')}</span>
        </div>
        <div className="asmh-progress-info">
          {t('assessment.header.questionsAnswered', { answered: answeredQuestions, total: totalQuestions })}
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
