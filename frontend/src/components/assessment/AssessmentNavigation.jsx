import { ChevronLeft, ChevronRight, Save, Send, AlertCircle } from 'lucide-react';

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
  return (
    <div className="anav-bar">
      <div className="anav-left">
        <button
          className="btn btn-ghost"
          onClick={onPrev}
          disabled={!canGoPrev}
        >
          <ChevronLeft size={16} /> Previous
        </button>
      </div>

      <div className="anav-center">
        <button
          className="anav-save-btn"
          onClick={onSaveDraft}
          disabled={isSaving}
        >
          <Save size={14} />
          {isSaving ? 'Saving…' : 'Save Draft'}
        </button>
      </div>

      <div className="anav-right">
        {hasErrors && (
          <div className="anav-error-hint">
            <AlertCircle size={13} />
            Answer required questions
          </div>
        )}
        {isLastSection ? (
          <button
            className="btn btn-primary"
            onClick={onSubmit}
          >
            Review & Submit <Send size={15} />
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onNext}
          >
            Next Section <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
