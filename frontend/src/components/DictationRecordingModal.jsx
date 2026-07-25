import { useEffect, useRef } from 'react';
import { Mic, Square, X, RotateCcw, Sparkles, Globe2 } from 'lucide-react';

const LANGUAGE_LABELS = { en: 'English', ar: 'العربية', fr: 'Français' };

function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Real-time audio-reactive waveform bars, driven by the live mic input via
 * the AnalyserNode useDictation() sets up alongside MediaRecorder. Runs its
 * own requestAnimationFrame loop reading frequency data directly — never
 * touches React state, so this animates at full frame rate with zero
 * re-renders of the surrounding modal. */
function LiveWaveform({ analyserRef, active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const BAR_COUNT = 40;
    let rafId;

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      if (analyser && data) analyser.getByteFrequencyData(data);

      const barWidth = width / BAR_COUNT;
      const gap = barWidth * 0.4;
      const step = data ? Math.max(1, Math.floor(data.length / BAR_COUNT)) : 1;

      for (let i = 0; i < BAR_COUNT; i++) {
        const raw = data ? data[i * step] || 0 : 0;
        const level = raw / 255;
        const barHeight = Math.max(4, level * height);
        const x = i * barWidth + gap / 2;
        const y = (height - barHeight) / 2;
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#5eb3ff');
        gradient.addColorStop(1, '#1a6fdb');
        ctx.fillStyle = gradient;
        roundRect(ctx, x, y, barWidth - gap, barHeight, 3);
        ctx.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [active, analyserRef]);

  return <canvas ref={canvasRef} className="live-waveform-canvas" />;
}

// Shows recording progress with a live audio-reactive waveform, then closes
// itself as soon as transcription lands (the parent applies it straight to
// the chart fields) — no separate review/confirm step here, the doctor
// confirms by seeing the filled chart.
export default function DictationRecordingModal({
  open,
  isRecording,
  isProcessing,
  elapsedSeconds,
  liveCaption,
  error,
  detectedLanguage,
  analyserRef,
  onStartRecording,
  onStopRecording,
  onCancel,
  onRetry,
  onClose,
}) {
  if (!open) return null;

  const showError = error && !isRecording && !isProcessing;
  const idle = !isRecording && !isProcessing && !showError;

  return (
    <div className="modal-backdrop">
      <div className="modal dictation-modal">
        <div className="dictation-modal-header" style={{ position: 'relative' }}>
          {(showError || idle) && (
            <button type="button" className="dictation-modal-close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          )}

          <div className="dictation-modal-brand">
            <span className="dictation-modal-mark"><Mic size={16} /></span>
            <h3>Visit Dictation</h3>
          </div>
          <p>
            Say &ldquo;Diagnosis&hellip;&rdquo;, then &ldquo;Diagnostics&hellip;&rdquo;, then &ldquo;Treatment plan&hellip;&rdquo; — click stop when done and it fills the chart automatically.
            {idle && ' Speak in English, Arabic, or French — it’s detected automatically from what you say.'}
          </p>

          {!showError && (
            <>
              <button
                type="button"
                className={`record-btn-medical ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? onStopRecording : idle ? onStartRecording : undefined}
                disabled={isProcessing}
                style={{ marginTop: 20 }}
              >
                {isProcessing ? (
                  <span className="dictation-processing-orb" />
                ) : isRecording ? (
                  <Square size={28} />
                ) : (
                  <Mic size={28} />
                )}
              </button>

              {idle && (
                <div className="record-status-medical">Tap the mic to start recording</div>
              )}

              {isRecording && (
                <>
                  <div className="record-timer-medical">{formatTimer(elapsedSeconds)}</div>
                  <div className="record-status-medical">
                    Recording the full visit… Click to stop
                    {detectedLanguage && (
                      <span className="dictation-lang-badge">
                        <Globe2 size={11} /> {LANGUAGE_LABELS[detectedLanguage] || detectedLanguage}
                      </span>
                    )}
                  </div>
                  <div className="live-waveform-wrap">
                    <LiveWaveform analyserRef={analyserRef} active={isRecording} />
                  </div>
                  <button type="button" className="dictation-cancel-btn" onClick={onCancel}>
                    <X size={13} /> Cancel
                  </button>
                </>
              )}

              {isProcessing && (
                <>
                  <div className="dictation-processing-status">
                    <span className="dictation-processing-dot" />
                    <span className="dictation-processing-dot" />
                    <span className="dictation-processing-dot" />
                    <span style={{ marginLeft: 8 }}>Transcribing &amp; filling the chart&hellip;</span>
                  </div>
                  <button type="button" className="dictation-cancel-btn" onClick={onCancel}>
                    <X size={13} /> Cancel
                  </button>
                </>
              )}

              {isRecording && (
                <div className="transcript-result">
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={12} /> Live — what the mic is hearing
                  </div>
                  {liveCaption || <span style={{ opacity: 0.5 }}>Listening…</span>}
                </div>
              )}
            </>
          )}
        </div>

        {showError && (
          <div className="dictation-modal-body">
            <div style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--surface))', border: '1px solid color-mix(in srgb, var(--danger) 35%, var(--surface))', borderRadius: 8, padding: 12, marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
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
