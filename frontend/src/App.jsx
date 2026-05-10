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

    // Google command detection across languages
    if (data && data.text) {
      console.log("Raw Transcript:", data.text);
      const text = data.text.toLowerCase().replace(/[.,!?;:'"()[\]{}¿¡]/g, '');
      console.log("Cleaned Transcript:", text);
      
      const googleCommands = [
        "go to google",
        "open google",
        "aller sur google",
        "ouvre google",
        "ouvrir google",
        "allez sur google",
        "اذهب الى جوجل",
        "اذهب إلى جوجل",
        "افتح جوجل",
        "إفتح جوجل",
        "روح على جوجل"
      ];

      const shouldOpenGoogle = googleCommands.some(cmd => text.includes(cmd));
      console.log("Detected Google command?", shouldOpenGoogle);
      
      if (shouldOpenGoogle) {
        // Try opening in a new tab first
        const newWin = window.open('https://www.google.com', '_blank');
        
        // If the browser blocks the popup (because it happens after an async fetch), 
        // fallback to redirecting the current tab.
        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
          console.log("Popup blocked! Redirecting current tab instead.");
          window.location.href = 'https://www.google.com';
        }
      }
    }
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
