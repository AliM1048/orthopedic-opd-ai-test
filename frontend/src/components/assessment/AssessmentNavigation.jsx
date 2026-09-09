import { ChevronLeft, ChevronRight, Save, Send, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function AssessmentNavigation({
  canGoPrev,
  canGoNext,
  isLastSection,
  isSaving,
  hasErrors,
  onPrev,
  onNext,
  onSaveDraft,
  onSubmit
}) {
  const { t } = useLanguage();
  return (
    <div className="anav-bar">
      <div className="anav-left">
        <button
          className="btn btn-ghost"
          onClick={onPrev}
          disabled={!canGoPrev}
        >
          <ChevronLeft size={16} /> {t('assessment.navigation.previous')}
        </button>
      </div>

      <div className="anav-center">
        <button
          className="anav-save-btn"
          onClick={onSaveDraft}
          disabled={isSaving}
        >
          <Save size={14} />
          {isSaving ? t('assessment.navigation.saving') : t('assessment.navigation.saveDraft')}
        </button>
      </div>

      <div className="anav-right">
        {hasErrors && (
          <div className="anav-error-hint">
            <AlertCircle size={13} />
            {t('assessment.navigation.answerRequired')}
          </div>
        )}
        {isLastSection ? (
          <button
            className="btn btn-primary"
            onClick={onSubmit}
          >
            {t('assessment.navigation.reviewSubmit')} <Send size={15} />
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onNext}
          >
            {t('assessment.navigation.nextSection')} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
