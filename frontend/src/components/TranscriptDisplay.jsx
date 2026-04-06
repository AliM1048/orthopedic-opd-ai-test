import { useCopy } from '../hooks/useCopy';

const LANG_INFO = {
  en: { flag: '🇬🇧', name: 'English' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fr: { flag: '🇫🇷', name: 'French' },
};

export default function TranscriptDisplay({ transcript, isProcessing }) {
  const { copied, copy } = useCopy();

  const isEmpty = !transcript && !isProcessing;
  const isArabic = transcript?.language === 'ar';

  return (
    <div className="glass-card transcript-section">
      <div className="transcript-header">
        <span className="transcript-title">Live Transcription</span>
        {transcript && (
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="lang-tag">
              <span>{LANG_INFO[transcript.language]?.flag || '🌐'}</span>
              {LANG_INFO[transcript.language]?.name || transcript.language_name || 'Unknown'}
            </span>
            <span className="speaker-tag">
              👤 {transcript.speaker_id || 'Unknown'}
            </span>
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={() => copy(transcript.text)}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {isEmpty && (
        <p className="transcript-text empty">
          Press the mic button above and start speaking…
        </p>
      )}

      {isProcessing && !transcript && (
        <p className="transcript-text empty" style={{ color: '#a5b4fc' }}>
          ✨ Transcribing your audio…
        </p>
      )}

      {transcript && (
        <p className={`transcript-text ${isArabic ? 'arabic' : ''}`}>
          {transcript.text}
          {isProcessing && <span className="typing-cursor" />}
        </p>
      )}
    </div>
  );
}
