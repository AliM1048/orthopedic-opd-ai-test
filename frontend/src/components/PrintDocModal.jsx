export default function PrintDocModal({ order, patient, physicianName, onClose }) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const handlePrint = () => window.print();
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        style={{
          background: '#fff', borderRadius: 16, width: 640, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
        id="print-doc-root"
      >
        {/* Header bar */}
        <div style={{ background: 'linear-gradient(135deg, #1a6fdb 0%, #6366f1 100%)', padding: '22px 32px', borderRadius: '16px 16px 0 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orthopedic OPD</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{order.printTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Patient info strip */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', gap: 32 }}>
          {[['Patient', patient?.name || '—'], ['MRN', patient?.mrn || '—'], ['Date', today], ['Age', patient?.age ? `${patient.age} yrs` : '—']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Order table */}
        <div style={{ padding: '24px 32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {order.printBody.map(([label, value], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', width: '38%', borderBottom: '1px solid #e2e8f0' }}>{label}</td>
                  <td style={{ padding: '10px 14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {order.note && (
            <div style={{ marginTop: 14, background: '#fef3c7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              {order.note}
            </div>
          )}
        </div>

        {/* Signature block */}
        <div style={{ margin: '0 32px 28px', borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <div>Generated: {today}</div>
            <div>Orthopedic OPD — Clinical Document</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 160, borderBottom: '2px solid #334155', marginBottom: 4 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{physicianName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Attending Physician</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#475569' }}>Close</button>
          <button onClick={handlePrint} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a6fdb,#6366f1)', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            🖨 Print Document
          </button>
        </div>
      </div>
    </div>
  );
}
