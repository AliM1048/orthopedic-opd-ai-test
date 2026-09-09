import { Check, AlertCircle, Send, ArrowLeft, BarChart2 } from 'lucide-react';
import { calculateQuickDASH, calculateSectionScore } from '../../utils/scoring';
import { useLanguage } from '../../hooks/useLanguage';

function formatAnswer(question, value) {
  if (value === undefined || value === null || value === '') return null;
  if (question.type === 'radio' && question.options) {
    return question.options[value] ?? String(value);
  }
  if (question.type === 'checkbox') {
    return Array.isArray(value) ? value.join(', ') : value;
  }
  return String(value);
}

function SectionSummary({ section, answers }) {
  const { t } = useLanguage();
  const allAnswered = section.questions.every(q => {
    if (!q.required) return true;
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  });

  // Calculate score if applicable
  let scoreDisplay = null;
  if (section.scoring) {
    if (section.scoreCalculation === 'quickdash') {
      const score = calculateQuickDASH(answers, section.questions);
      if (score !== null) {
        const severity = score < 25 ? t('assessment.summary.severityLow') : score < 50 ? t('assessment.summary.severityModerate') : score < 75 ? t('assessment.summary.severityHigh') : t('assessment.summary.severitySevere');
        const color = score < 25 ? 'var(--success)' : score < 50 ? 'var(--warning)' : score < 75 ? 'var(--danger)' : 'color-mix(in srgb, var(--danger) 70%, black)';
        scoreDisplay = (
          <div className="smp-score" style={{ borderColor: color }}>
            <BarChart2 size={14} style={{ color }} />
            <span style={{ color }}>{t('assessment.summary.quickDashScore', { score, severity })}</span>
          </div>
        );
      }
    } else {
      const result = calculateSectionScore(answers, section.questions);
      if (result) {
        scoreDisplay = (
          <div className="smp-score">
            <BarChart2 size={14} />
            <span>{t('assessment.summary.score', { score: result.score, max: result.max })}</span>
          </div>
        );
      }
    }
  }

  return (
    <div className="smp-section">
      <div className="smp-section-header">
        <div className="smp-section-title">{section.title}</div>
        <div className={`smp-section-status ${allAnswered ? 'smp-ok' : 'smp-warn'}`}>
          {allAnswered ? <Check size={13} /> : <AlertCircle size={13} />}
          {allAnswered ? t('assessment.summary.complete') : t('assessment.summary.incomplete')}
        </div>
      </div>
      {scoreDisplay}
      <div className="smp-qa-list">
        {section.questions.map(q => {
          const display = formatAnswer(q, answers[q.id]);
          return (
            <div key={q.id} className="smp-qa-item">
              <div className="smp-q-text">{q.text}</div>
              <div className={`smp-a-text ${!display ? 'smp-a-empty' : ''}`}>
                {display || (q.required ? t('assessment.summary.notAnswered') : t('assessment.summary.notProvided'))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SummaryPage({ config, answers, patient, isFollowUp, onBack, onSubmit, isSubmitting, submitError }) {
  const { t } = useLanguage();
  const totalRequired = config.sections.flatMap(s => s.questions).filter(q => q.required).length;
  const answeredRequired = config.sections.flatMap(s => s.questions).filter(q => {
    if (!q.required) return false;
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;
  const canSubmit = answeredRequired === totalRequired;

  return (
    <div className="smp-wrapper">
      <div className="smp-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> {t('assessment.summary.backToAssessment')}
        </button>
        <div className="smp-header-title">{t('assessment.summary.reviewAndSubmit')}</div>
        <div className="smp-completion">
          <div className={`smp-completion-badge ${canSubmit ? 'smp-complete' : 'smp-incomplete'}`}>
            {t('assessment.summary.requiredAnswered', { answered: answeredRequired, total: totalRequired })}
          </div>
        </div>
      </div>

      {!canSubmit && (
        <div className="smp-warning">
          <AlertCircle size={16} />
          {t('assessment.summary.completeRequiredWarning')}
        </div>
      )}

      {submitError && (
        <div className="smp-warning">
          <AlertCircle size={16} />
          {t('assessment.summary.submitError')}
        </div>
      )}

      <div className="smp-patient-banner">
        <div className="smp-patient-avatar" style={{ background: patient?.avatar }}>
          {patient?.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div className="smp-patient-name">{patient?.name}</div>
          <div className="smp-patient-sub">
            {patient?.mrn} · {isFollowUp ? t('assessment.summary.followUp') : t('assessment.summary.initialVisit')} · {patient?.bodyArea}
          </div>
        </div>
        <div className="smp-date">
          {t('assessment.summary.submittedPrefix')} {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="smp-sections">
        {config.sections.map(section => (
          <SectionSummary key={section.id} section={section} answers={answers} />
        ))}
      </div>

      <div className="smp-actions">
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> {t('assessment.summary.editAnswers')}
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          <Send size={16} />
          {isSubmitting ? t('assessment.summary.submitting') : t('assessment.summary.submitAssessment')}
        </button>
      </div>
    </div>
  );
}
