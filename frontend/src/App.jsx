import { useState } from 'react';
import './index.css';
import Recorder from './components/Recorder';
import TranscriptDisplay from './components/TranscriptDisplay';
import History from './components/History';

export default function App() {
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
        <p>Record speech in any language and get automatic transcription with language detection</p>
      </header>

      <main>
        {/* Recorder */}
        <Recorder
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
