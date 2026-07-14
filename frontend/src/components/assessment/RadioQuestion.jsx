export default function RadioQuestion({ question, value, onChange, error }) {
  return (
    <div className="rq-group">
      {question.options.map((opt, idx) => (
        <button
          key={idx}
          id={`rq-${question.id}-${idx}`}
          className={`rq-option ${value === idx ? 'rq-selected' : ''}`}
          onClick={() => onChange(idx)}
          type="button"
        >
          <span className={`rq-radio ${value === idx ? 'rq-radio-active' : ''}`}>
            {value === idx && <span className="rq-radio-dot" />}
          </span>
          <span className="rq-label">{opt}</span>
        </button>
      ))}
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
