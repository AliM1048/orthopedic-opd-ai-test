export default function TextQuestion({ question, value = '', onChange, error }) {
  const isTextarea = question.type === 'textarea';

  return (
    <div className="tq-wrap">
      {isTextarea ? (
        <textarea
          id={`tq-${question.id}`}
          className={`tq-textarea ${error ? 'tq-error-border' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || 'Type your answer here…'}
          rows={4}
        />
      ) : (
        <input
          id={`tq-${question.id}`}
          className={`tq-input ${error ? 'tq-error-border' : ''}`}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || 'Type your answer here…'}
        />
      )}
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
