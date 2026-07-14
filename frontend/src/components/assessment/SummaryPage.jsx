import { Check, AlertCircle, Send, ArrowLeft, BarChart2 } from 'lucide-react';
import { calculateQuickDASH, calculateSectionScore } from '../../data/mockData';

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
        const severity = score < 25 ? 'Low' : score < 50 ? 'Moderate' : score < 75 ? 'High' : 'Severe';
        const color = score < 25 ? '#10b981' : score < 50 ? '#f59e0b' : score < 75 ? '#ef4444' : '#7f1d1d';
        scoreDisplay = (
          <div className="smp-score" style={{ borderColor: color }}>
            <BarChart2 size={14} style={{ color }} />
            <span style={{ color }}>QuickDASH: {score}/100 — {severity}</span>
          </div>
        );
      }
    } else {
      const result = calculateSectionScore(answers, section.questions);
      if (result) {
        scoreDisplay = (
          <div className="smp-score">
            <BarChart2 size={14} />
            <span>Score: {result.score}/{result.max}</span>
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
          {allAnswered ? 'Complete' : 'Incomplete'}
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
                {display || (q.required ? '⚠ Not answered' : '— Not provided')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SummaryPage({ config, answers, patient, isFollowUp, onBack, onSubmit, isSubmitting }) {
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
          <ArrowLeft size={16} /> Back to Assessment
        </button>
        <div className="smp-header-title">Review & Submit</div>
        <div className="smp-completion">
          <div className={`smp-completion-badge ${canSubmit ? 'smp-complete' : 'smp-incomplete'}`}>
            {answeredRequired}/{totalRequired} required answered
          </div>
        </div>
      </div>

      {!canSubmit && (
        <div className="smp-warning">
          <AlertCircle size={16} />
          Please complete all required questions before submitting.
        </div>
      )}

      <div className="smp-patient-banner">
        <div className="smp-patient-avatar" style={{ background: patient?.avatar }}>
          {patient?.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div className="smp-patient-name">{patient?.name}</div>
          <div className="smp-patient-sub">
            {patient?.mrn} · {isFollowUp ? 'Follow-Up' : 'Initial Visit'} · {patient?.bodyArea}
          </div>
        </div>
        <div className="smp-date">
          Submitted: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="smp-sections">
        {config.sections.map(section => (
          <SectionSummary key={section.id} section={section} answers={answers} />
        ))}
      </div>

      <div className="smp-actions">
        <button className="btn btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> Edit Answers
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          <Send size={16} />
          {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}
