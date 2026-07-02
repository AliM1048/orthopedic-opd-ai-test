import { Mic, Square, X, RotateCcw } from 'lucide-react';

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Shows recording progress and the live "what the mic is hearing" caption
// while the doctor dictates. Closes itself as soon as transcription lands
// (the parent applies it straight to the chart fields) — no separate
// review/confirm step here, the doctor confirms by seeing the filled chart.
export default function DictationRecordingModal({
  open,
  isRecording,
  isProcessing,
  elapsedSeconds,
  liveCaption,
  error,
  onStopRecording,
  onRetry,
  onClose,
}) {
  if (!open) return null;

  const showError = error && !isRecording && !isProcessing;

  return (
    <div className="modal-backdrop">
      <div className="modal dictation-modal">
        <div className="dictation-modal-header" style={{ position: 'relative' }}>
          {showError && (
            <button type="button" className="dictation-modal-close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          )}
          <h3>🎙 Visit Dictation — Whisper AI</h3>
          <p>
            Say “Diagnosis…”, then “Diagnostics…”, then “Treatment plan…” — click stop when done and it fills the chart automatically.
          </p>

          {!showError && (
            <>
              <button
                type="button"
                className={`record-btn-medical ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? onStopRecording : undefined}
                disabled={isProcessing}
                style={{ marginTop: 20 }}
              >
                {isProcessing ? (
                  <div className="spin-ring" style={{ width: 28, height: 28 }} />
                ) : isRecording ? (
                  <Square size={28} />
                ) : (
                  <Mic size={28} />
                )}
              </button>

              {isRecording && (
                <>
                  <div className="record-timer-medical">{formatTimer(elapsedSeconds)}</div>
                  <div className="record-status-medical">Recording the full visit… Click to stop</div>
                </>
              )}
              {isProcessing && <div className="record-status-medical">Transcribing &amp; filling the chart…</div>}

              {isRecording && (
                <div className="transcript-result">
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="spin-ring" style={{ width: 10, height: 10, borderWidth: 2, margin: 0 }} /> Live — what the mic is hearing
                  </div>
                  {liveCaption || <span style={{ opacity: 0.5 }}>Listening…</span>}
                </div>
              )}
            </>
          )}
        </div>

        {showError && (
          <div className="dictation-modal-body">
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#b91c1c', fontSize: 13 }}>
              ⚠️ {error}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={onRetry}>
                <RotateCcw size={16} /> Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
