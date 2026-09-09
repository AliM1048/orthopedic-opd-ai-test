// Asked before any clinical document is printed — the insurance layout is a
// placeholder for now (just a visible flag) until the real insurance
// template is provided; see PrintDocModal.jsx / ReviewPrintView for how the
// choice is used.
export default function PrintTypeModal({ onChoose, onClose }) {
  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3>Choose Document Type</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 16px' }}>
          Select which version of this document to print.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => onChoose('standard')}
          >
            📄 Standard Document
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => onChoose('insurance')}
          >
            🏷 Insurance Document
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
