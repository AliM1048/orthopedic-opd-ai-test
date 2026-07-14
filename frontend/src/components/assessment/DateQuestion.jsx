export default function DateQuestion({ question, value = '', onChange, error }) {
  return (
    <div className="tq-wrap">
      <input
        id={`dq-${question.id}`}
        className={`tq-input ${error ? 'tq-error-border' : ''}`}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
