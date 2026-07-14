import { Check } from 'lucide-react';

export default function CheckboxQuestion({ question, value = [], onChange, error }) {
  const toggle = (opt) => {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(opt)) {
      onChange(current.filter(v => v !== opt));
    } else {
      onChange([...current, opt]);
    }
  };

  return (
    <div className="rq-group">
      {question.options.map((opt, idx) => {
        const checked = Array.isArray(value) && value.includes(opt);
        return (
          <button
            key={idx}
            id={`cbq-${question.id}-${idx}`}
            className={`rq-option ${checked ? 'rq-selected' : ''}`}
            onClick={() => toggle(opt)}
            type="button"
          >
            <span className={`cbq-box ${checked ? 'cbq-box-active' : ''}`}>
              {checked && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="rq-label">{opt}</span>
          </button>
        );
      })}
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
