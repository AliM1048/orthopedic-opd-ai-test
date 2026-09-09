import { useLanguage } from '../hooks/useLanguage';

// Asked before any clinical document is printed — the insurance layout is a
// placeholder for now (just a visible flag) until the real insurance
// template is provided; see PrintDocModal.jsx / ReviewPrintView for how the
// choice is used.
export default function PrintTypeModal({ onChoose, onClose }) {
  const { t } = useLanguage();
  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3>{t('components.printTypeModal.title')}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 16px' }}>
          {t('components.printTypeModal.subtitle')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => onChoose('standard')}
          >
            📄 {t('components.printTypeModal.standardDocument')}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => onChoose('insurance')}
          >
            🏷 {t('components.printTypeModal.insuranceDocument')}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>{t('components.printTypeModal.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
