import { Minus, Plus } from 'lucide-react';

export default function NumericQuestion({ question, value, onChange, error }) {
  const min = question.min ?? 0;
  const max = question.max ?? 100;
  const step = question.step ?? 1;
  const current = value ?? min;

  const handleChange = (newVal) => {
    const clamped = Math.max(min, Math.min(max, newVal));
    onChange(clamped);
  };

  // Build scale dots for 0-10 pain scale
  const isScale = max <= 10;

  return (
    <div className="nq-wrap">
      {isScale ? (
        <>
          <div className="nq-scale">
            {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
              <button
                key={n}
                className={`nq-dot ${current === n ? 'nq-dot-active' : ''} ${
                  n <= 3 ? 'nq-low' : n <= 6 ? 'nq-mid' : 'nq-high'
                }`}
                onClick={() => onChange(n)}
                type="button"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="nq-scale-labels">
            <span>No Pain</span>
            <span>Worst Pain</span>
          </div>
          <div className="nq-current">
            Selected: <strong>{current}</strong>/10
          </div>
        </>
      ) : (
        <div className="nq-stepper">
          <button
            className="nq-step-btn"
            onClick={() => handleChange(current - step)}
            disabled={current <= min}
            type="button"
          >
            <Minus size={16} />
          </button>
          <div className="nq-value">{current}</div>
          <button
            className="nq-step-btn"
            onClick={() => handleChange(current + step)}
            disabled={current >= max}
            type="button"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      {error && <div className="qr-error">{error}</div>}
    </div>
  );
}
