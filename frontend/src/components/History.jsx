import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const LANG_INFO = {
  en: { flag: '🇬🇧', name: 'English' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fr: { flag: '🇫🇷', name: 'French' },
};

function formatTime(isoStr) {
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function History({ refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/history`);
      setItems(res.data.transcriptions || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const handleClear = async () => {
    if (!window.confirm('Clear all transcription history?')) return;
    try {
      await axios.delete(`${API_BASE}/history`);
      setItems([]);
    } catch {
      alert('Failed to clear history.');
    }
  };

  return (
    <div className="history-section">
      <div className="history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="history-title">Transcription History</h2>
          <span className="history-count">{items.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="copy-btn" onClick={fetchHistory} title="Refresh">
            ↻ Refresh
          </button>
          {items.length > 0 && (
            <button className="clear-btn" onClick={handleClear}>
              🗑 Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="history-empty">
          <div className="history-empty-icon">📜</div>
          <p>No transcriptions yet. Start recording!</p>
        </div>
      )}

      <div className="history-list">
        {items.map((item) => {
          const lang = LANG_INFO[item.language] || { flag: '🌐', name: item.language };
          const isArabic = item.language === 'ar';
          return (
            <div key={item.id} className="history-item">
              <div className="history-lang-icon">{lang.flag}</div>
              <div className="history-content">
                <p className={`history-text ${isArabic ? 'arabic' : ''}`}>{item.text}</p>
                <div className="history-meta">
                  <span className="history-meta-tag lang">{lang.name}</span>
                  <span className="history-meta-tag">·</span>
                  <span className="history-meta-tag">{formatTime(item.timestamp)}</span>
                  {item.duration_seconds > 0 && (
                    <>
                      <span className="history-meta-tag">·</span>
                      <span className="history-meta-tag">{Math.round(item.duration_seconds)}s</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
