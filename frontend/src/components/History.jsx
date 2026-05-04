import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from "sweetalert2";

const API_BASE = 'http://localhost:8000';

const LANG_INFO = {
  en: { flag: '🇬🇧', name: 'English' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fr: { flag: '🇫🇷', name: 'French' },
};

// Distinct, accessible color palette for speaker badges
const SPEAKER_COLORS = [
  { bg: 'rgba(99,  102, 241, 0.18)', border: '#6366f1', text: '#a5b4fc' }, // indigo
  { bg: 'rgba(20,  184, 166, 0.18)', border: '#14b8a6', text: '#5eead4' }, // teal
  { bg: 'rgba(249, 115,  22, 0.18)', border: '#f97316', text: '#fdba74' }, // orange
  { bg: 'rgba(236,  72, 153, 0.18)', border: '#ec4899', text: '#f9a8d4' }, // pink
  { bg: 'rgba(234, 179,   8, 0.18)', border: '#eab308', text: '#fde047' }, // yellow
  { bg: 'rgba( 34, 197,  94, 0.18)', border: '#22c55e', text: '#86efac' }, // green
  { bg: 'rgba(168,  85, 247, 0.18)', border: '#a855f7', text: '#d8b4fe' }, // purple
  { bg: 'rgba( 59, 130, 246, 0.18)', border: '#3b82f6', text: '#93c5fd' }, // blue
];

/** Extract numeric index from "Speaker_3" → 3 */
function speakerIndex(speakerId = '') {
  const m = speakerId.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) - 1 : 0;
}

function getSpeakerColor(speakerId) {
  const idx = speakerIndex(speakerId);
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
}

function SpeakerBadge({ speakerId }) {
  const color = getSpeakerColor(speakerId);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
      }}
    >
      🎙 {speakerId || 'Unknown'}
    </span>
  );
}

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
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Clear all transcription history?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, clear it!',
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE}/history`);
      setItems([]);
    } catch {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Failed to clear history.' });
    }
  };

  const handleClearSpeakers = async () => {
    const result = await Swal.fire({
      title: 'Reset Speakers?',
      text: 'This will delete all stored voice prints so speakers are re-learned from scratch.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset!',
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_BASE}/speakers`);
      Swal.fire({ icon: 'success', title: 'Speakers reset!', text: 'Voice prints cleared. New recordings will create fresh speaker IDs.', timer: 2000, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Failed to reset speakers.' });
    }
  };

  return (
    <div className="history-section">
      <div className="history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="history-title">Transcription History</h2>
          <span className="history-count">{items.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="copy-btn" onClick={fetchHistory} title="Refresh">
            ↻ Refresh
          </button>
          <button
            className="copy-btn"
            onClick={handleClearSpeakers}
            title="Reset all stored speaker voice prints"
            style={{ borderColor: '#a855f7', color: '#d8b4fe' }}
          >
            🎙 Reset Speakers
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
                  <SpeakerBadge speakerId={item.speaker_id} />
                  {item.similarity_score !== undefined && (
                    <>
                      <span className="history-meta-tag">·</span>
                      <span
                        className="history-meta-tag"
                        title="Voice similarity score vs. stored voiceprint"
                        style={{ opacity: 0.7, fontSize: 11 }}
                      >
                        {item.is_new_speaker ? '🆕 New' : `${Math.round(item.similarity_score * 100)}% match`}
                      </span>
                    </>
                  )}
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
