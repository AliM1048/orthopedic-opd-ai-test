import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, X, Printer } from 'lucide-react';
import { useLookup } from '../hooks/useLookupData';
import PrintDocModal from '../components/PrintDocModal';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

const EMPTY_FORM = { date: todayIso(), notes: '', duration: '', details: '', followUpDate: '' };

// Standalone document/print utility — deliberately not wired to
// onAddDiagnostic/onAddTreatment. It builds a PrintDocModal-shaped order
// locally and never touches the patient's real stored record; the doctor
// picks a patient purely so the printed header/signature block has their
// name and MRN on it.
export default function DocumentGenerator({ patients, user }) {
  const navigate = useNavigate();
  const { diagnosticTests, treatmentOptions } = useLookup();
  const physicianName = user?.name || 'Physician';

  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // { kind: 'diagnostic' | 'treatment', id, name, icon }
  const [form, setForm] = useState(EMPTY_FORM);
  const [printOrder, setPrintOrder] = useState(null);

  const suggestions = useMemo(() => {
    if (selectedPatient || !search.trim()) return [];
    const q = search.toLowerCase();
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 6);
  }, [patients, search, selectedPatient]);

  const handlePickPatient = (p) => {
    setSelectedPatient(p);
    setSearch('');
  };

  const handlePickType = (kind, opt) => {
    setSelectedType({ kind, ...opt });
    setForm(EMPTY_FORM);
  };

  const canGenerate = Boolean(
    selectedPatient && selectedType && (selectedType.kind === 'diagnostic' || form.duration.trim())
  );

  const handleGenerate = () => {
    if (!canGenerate) return;
    if (selectedType.kind === 'diagnostic') {
      setPrintOrder({
        printTitle: `Diagnostic Request — ${selectedType.name}`,
        printBody: [
          ['Examination', selectedType.name],
          ['Date', form.date],
          ...(form.notes.trim() ? [['Clinical Indication', form.notes.trim()]] : []),
        ],
      });
    } else {
      setPrintOrder({
        printTitle: `${selectedType.name} Order`,
        printBody: [
          ['Treatment', selectedType.name],
          ['Duration', form.duration.trim() || '—'],
          ['Details', form.details.trim() || '—'],
          ['Date', form.date],
          ...(form.followUpDate ? [['Follow-Up Date', form.followUpDate]] : []),
        ],
      });
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Generate Document</h1>
            <p>Print a signable order or request — not saved to the patient's record</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Step 1 — Patient */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Patient</label>
            {selectedPatient ? (
              <div className="dg-selected-patient">
                <div className="patient-avatar" style={{ background: selectedPatient.avatar, width: 30, height: 30, fontSize: 12 }}>
                  {selectedPatient.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedPatient.name}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{selectedPatient.mrn}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedPatient(null); setSelectedType(null); }}>
                  <X size={14} /> Change
                </button>
              </div>
            ) : (
              <>
                <div className="search-bar">
                  <Search size={16} color="var(--text-muted)" />
                  <input placeholder="Search by name or MRN…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {suggestions.length > 0 && (
                  <div className="dg-suggestions">
                    {suggestions.map((p) => (
                      <div key={p.id} className="dg-suggestion" onClick={() => handlePickPatient(p)}>
                        <div className="patient-avatar" style={{ background: p.avatar, width: 26, height: 26, fontSize: 11 }}>
                          {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{p.mrn}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 2 — Document type */}
          {selectedPatient && (
            <div style={{ marginTop: 20 }}>
              <label className="form-label">Document Type</label>
              <div className="dg-type-section-label">Diagnostic Request</div>
              <div className="dg-type-grid">
                {diagnosticTests.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`dg-type-card ${selectedType?.kind === 'diagnostic' && selectedType.id === t.id ? 'selected' : ''}`}
                    onClick={() => handlePickType('diagnostic', t)}
                  >
                    <span className="dg-type-icon">{t.icon}</span>
                    <span className="dg-type-name">{t.name}</span>
                  </button>
                ))}
              </div>

              <div className="dg-type-section-label">Treatment Order</div>
              <div className="dg-type-grid">
                {treatmentOptions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`dg-type-card ${selectedType?.kind === 'treatment' && selectedType.id === t.id ? 'selected' : ''}`}
                    onClick={() => handlePickType('treatment', t)}
                  >
                    <span className="dg-type-icon">{t.icon}</span>
                    <span className="dg-type-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Fields */}
          {selectedPatient && selectedType && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>

                {selectedType.kind === 'diagnostic' ? (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Clinical Indication / Notes (optional)</label>
                    <textarea
                      className="form-control" rows={3}
                      placeholder="Reason for the request…"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Duration</label>
                      <input className="form-control" placeholder="e.g. 6 weeks" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Follow-Up Date (optional)</label>
                      <input type="date" className="form-control" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Details / Instructions</label>
                      <textarea className="form-control" rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-primary" disabled={!canGenerate} onClick={handleGenerate}>
                  <Printer size={16} /> Generate Document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {printOrder && (
        <PrintDocModal order={printOrder} patient={selectedPatient} physicianName={physicianName} onClose={() => setPrintOrder(null)} />
      )}
    </>
  );
}
