import { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLookup } from '../../hooks/useLookupData';

export default function RegionPicker({ patient, onConfirm }) {
  const { bodyAreas, loaded } = useLookup();
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Pre-select the patient's existing region only once it's confirmed to be
  // one of the real, currently-selectable instruments — a legacy value
  // (e.g. the retired "Spine" config) is left unselected instead, forcing
  // an explicit choice rather than silently carrying it forward.
  useEffect(() => {
    if (loaded && patient?.bodyArea && bodyAreas.some((r) => r.bodyArea === patient.bodyArea)) {
      setSelected(patient.bodyArea);
    }
  }, [loaded, patient?.bodyArea, bodyAreas]);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirming(true);
    Promise.resolve(onConfirm(selected)).finally(() => setConfirming(false));
  };

  return (
    <div className="page-body">
      <div className="rp-wrapper">
        <div className="rp-header">
          <h2>Select Anatomical Region</h2>
          <p>Choose the body area for {patient?.name || 'this patient'} — the matching PROM questionnaire will load automatically.</p>
        </div>

        {!loaded ? (
          <div className="empty-state"><p>Loading regions…</p></div>
        ) : (
          <div className="rp-grid">
            {bodyAreas.map((r) => {
              const isSelected = selected === r.bodyArea;
              return (
                <button
                  key={r.bodyArea}
                  type="button"
                  className={`rp-card ${isSelected ? 'rp-card-selected' : ''}`}
                  onClick={() => setSelected(r.bodyArea)}
                >
                  {isSelected && <CheckCircle2 size={18} className="rp-card-check" />}
                  <span className="rp-card-icon">{r.icon || '🩺'}</span>
                  <span className="rp-card-label">{r.bodyArea}</span>
                  <span className="rp-card-prom">{r.promName || '—'}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="rp-footer">
          <button
            className="btn btn-primary btn-lg"
            disabled={!selected || confirming}
            onClick={handleConfirm}
          >
            {confirming ? 'Loading…' : 'Continue'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
