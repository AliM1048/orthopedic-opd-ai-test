import { useRecorder } from '../hooks/useRecorder';

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Recorder({ language, onTranscriptReceived, onError }) {
  const { isRecording, isProcessing, elapsedSeconds, startRecording, stopRecording } =
    useRecorder({ language, onTranscriptReceived, onError });

  const handleClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div className="glass-card recorder-section">
      <button
        id="record-btn"
        className={`record-btn ${isRecording ? 'recording' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
        title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
      >
        {isRecording && <span className="ripple-ring" />}
        {isProcessing ? '⏳' : isRecording ? '⏹' : '🎙'}
      </button>

      {isRecording ? (
        <>
          <p className="record-status">Recording… Click to stop</p>
          <div className="record-timer">{formatTimer(elapsedSeconds)}</div>
        </>
      ) : isProcessing ? (
        <div className="processing-indicator">
          <span className="spin" />
          Transcribing audio with Whisper…
        </div>
      ) : (
        <p className="record-status">Click the mic to start recording</p>
      )}
    </div>
  );
}
