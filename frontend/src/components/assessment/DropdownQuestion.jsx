import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function DropdownQuestion({ question, value = '', onChange, error }) {
  const { t } = useLanguage();
  return (
    <div className="dq-wrap">
      <div className="dq-select-wrap">
        <select
          id={`dq-${question.id}`}
          className={`dq-select ${error ? 'tq-error-border' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">{t('assessment.dropdown.selectOption')}</option>
          {question.options.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} className="dq-chevron" />
      </div>
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
