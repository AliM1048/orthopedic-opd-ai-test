import RadioQuestion from './RadioQuestion';
import CheckboxQuestion from './CheckboxQuestion';
import TextQuestion from './TextQuestion';
import DropdownQuestion from './DropdownQuestion';
import NumericQuestion from './NumericQuestion';
import DateQuestion from './DateQuestion';
import { HelpCircle, AlertCircle } from 'lucide-react';

export default function QuestionRenderer({ question, sectionIdx, questionIdx, totalSectionQuestions, value, onChange, error }) {
  const renderInput = () => {
    switch (question.type) {
      case 'radio':
        return <RadioQuestion question={question} value={value} onChange={onChange} error={error} />;
      case 'checkbox':
        return <CheckboxQuestion question={question} value={value} onChange={onChange} error={error} />;
      case 'text':
      case 'textarea':
        return <TextQuestion question={question} value={value} onChange={onChange} error={error} />;
      case 'dropdown':
        return <DropdownQuestion question={question} value={value} onChange={onChange} error={error} />;
      case 'numeric':
        return <NumericQuestion question={question} value={value} onChange={onChange} error={error} />;
      case 'date':
        return <DateQuestion question={question} value={value} onChange={onChange} error={error} />;
      default:
        return <TextQuestion question={question} value={value} onChange={onChange} error={error} />;
    }
  };

  return (
    <div className={`qr-card ${error ? 'qr-card-error' : ''}`}>
      <div className="qr-counter">
        Question {questionIdx + 1} <span className="qr-counter-of">of {totalSectionQuestions}</span>
      </div>

      <div className="qr-question-text">
        {question.text}
        {question.required && <span className="qr-required">*</span>}
      </div>

      {question.description && (
        <div className="qr-description">
          <HelpCircle size={13} />
          {question.description}
        </div>
      )}

      <div className="qr-input-area">
        {renderInput()}
      </div>

      {error && (
        <div className="qr-error-msg">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
