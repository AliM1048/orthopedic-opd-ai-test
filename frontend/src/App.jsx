import { useState } from 'react';
import './index.css';
import Recorder from './components/Recorder';
import TranscriptDisplay from './components/TranscriptDisplay';
import History from './components/History';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

export default function App() {
  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleTranscriptReceived = (data) => {
    setTranscript(data);
    setIsProcessing(false);
    setError(null);
    // Trigger history refresh
    setHistoryRefresh((r) => r + 1);
  };

  const handleError = (msg) => {
    setError(msg);
    setIsProcessing(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-badge">
          <span className="dot" />
          Whisper AI · Quality Test
        </div>
        <h1>Voice Transcription</h1>
        <p>Record speech in Arabic, English, or French and test Whisper accuracy in real time</p>
      </header>

      <main>
        {/* Language Selector */}
        <div className="lang-section">
          <p className="section-label">Select Language</p>
          <div className="lang-tabs">
            {LANGUAGES.map(({ code, flag, label }) => (
              <button
                key={code}
                id={`lang-${code}`}
                className={`lang-btn ${language === code ? 'active' : ''}`}
                onClick={() => setLanguage(code)}
              >
                <span className="lang-flag">{flag}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recorder */}
        <Recorder
          language={language}
          onTranscriptReceived={handleTranscriptReceived}
          onError={handleError}
        />

        {/* Error Toast */}
        {error && (
          <div className="error-toast">
            ⚠️ {error}
          </div>
        )}

        {/* Transcript */}
        <TranscriptDisplay transcript={transcript} isProcessing={isProcessing} />

        {/* History */}
        <History refreshTrigger={historyRefresh} />
      </main>

      <footer className="footer">
        Powered by <span>OpenAI Whisper</span> · FastAPI · MongoDB · React
      </footer>
    </div>
  );
}
