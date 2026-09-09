import { ChevronDown } from 'lucide-react';

export default function DropdownQuestion({ question, value = '', onChange, error }) {
  return (
    <div className="dq-wrap">
      <div className="dq-select-wrap">
        <select
          id={`dq-${question.id}`}
          className={`dq-select ${error ? 'tq-error-border' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select an option…</option>
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
