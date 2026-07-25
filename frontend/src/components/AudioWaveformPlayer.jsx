import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

const BUCKET_COUNT = 100;

// Decoded audio (waveform peaks + the raw channel data used for the live
// playback pulse below) is cached per audioUrl (module-level, survives
// across re-mounts/navigations within the session) so reopening an
// evaluation doesn't re-decode the same recording every time.
const decodedCache = new Map();

async function decodeAudio(audioUrl) {
  if (decodedCache.has(audioUrl)) return decodedCache.get(audioUrl);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const bucketSize = Math.floor(channelData.length / BUCKET_COUNT) || 1;
    const peaks = new Array(BUCKET_COUNT).fill(0);
    for (let i = 0; i < BUCKET_COUNT; i++) {
      let max = 0;
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, channelData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks[i] = max;
    }
    const result = { peaks, channelData, sampleRate: audioBuffer.sampleRate };
    decodedCache.set(audioUrl, result);
    return result;
  } finally {
    audioContext.close().catch(() => {});
  }
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

const PULSE_BAR_COUNT = 32;

/** Live playback equalizer — reacts to the actual audio as it plays, not a
 * generic canned animation. Re-samples the already-decoded channel data
 * around the current playhead position on every frame (rather than routing
 * the <audio> element through a live AnalyserNode), so it stays in sync with
 * real amplitude without touching the audio graph or React state. */
function PlaybackPulse({ audioRef, decodedRef, isPlaying }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
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

      const decoded = decodedRef.current;
      const audio = audioRef.current;
      const barWidth = width / PULSE_BAR_COUNT;
      const gap = barWidth * 0.35;

      if (decoded && audio) {
        const { channelData, sampleRate } = decoded;
        const centerIdx = Math.floor(audio.currentTime * sampleRate);
        const windowSize = Math.max(1, Math.floor(sampleRate * 0.03)); // ~30ms per bar
        for (let i = 0; i < PULSE_BAR_COUNT; i++) {
          const start = Math.max(0, centerIdx + (i - PULSE_BAR_COUNT / 2) * windowSize);
          const end = Math.min(channelData.length, start + windowSize);
          let max = 0;
          for (let j = start; j < end; j += 4) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
          }
          const level = Math.min(1, max * 3.2); // typical speech is quiet — boost for a livelier look
          const barHeight = Math.max(3, level * height);
          const x = i * barWidth + gap / 2;
          const y = (height - barHeight) / 2;
          // Canvas fillStyle can't resolve CSS custom properties, so this
          // mirrors the same hardcoded blue gradient the live *recording*
          // waveform (DictationRecordingModal's LiveWaveform) uses, for a
          // consistent look between the two.
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#5eb3ff');
          gradient.addColorStop(1, '#1a6fdb');
          ctx.fillStyle = gradient;
          roundRect(ctx, x, y, barWidth - gap, barHeight, 2.5);
          ctx.fill();
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audioRef, decodedRef]);

  if (!isPlaying) return null;
  return <canvas ref={canvasRef} className="awp-pulse-canvas" />;
}

/** Doctor Voice Note player — a decoded, click-to-seek waveform (not just a
 * flat progress bar) with a played/unplayed two-tone fill, plus a live
 * amplitude-reactive pulse strip while actually playing. Owns the <audio>
 * element itself since it needs the ref anyway; audioRef/isPlaying/etc. are
 * still driven by the parent (shared with ReviewPrintView, which renders its
 * own instance of this component against the same state). */
export default function AudioWaveformPlayer({
  audioUrl, audioRef, isPlaying, togglePlay,
  audioProgress, audioCurrentTime, audioDuration, formatAudioTime,
  handleTimeUpdate, handleLoadedMetadata, handleAudioEnd,
}) {
  const [peaks, setPeaks] = useState(null);
  const decodedRef = useRef(null);
  const waveformRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    decodedRef.current = null;
    if (!audioUrl) return undefined;
    decodeAudio(audioUrl)
      .then((d) => { if (!cancelled) { setPeaks(d.peaks); decodedRef.current = d; } })
      .catch(() => { if (!cancelled) setPeaks(null); });
    return () => { cancelled = true; };
  }, [audioUrl]);

  const handleSeekClick = (e) => {
    if (!audioRef.current || !audioDuration || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = percent * audioDuration;
  };

  return (
    <div className="awp-player">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          // Without this, the browser's cache treats this element's own GET
          // for the file as a plain (non-CORS) request — then decodeAudio()'s
          // fetch() of that same URL below gets served that cached response
          // instead of hitting the network again, and fails outright since a
          // fetch() *requires* CORS headers a plain media load never checked
          // for. Marking this request CORS-aware too keeps both consistent.
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnd}
        />
      )}
      <div className="awp-header">
        <span className="awp-label"><Mic size={12} /> Doctor Voice Note</span>
        <span className="awp-time">
          {audioUrl ? `${formatAudioTime(audioCurrentTime)} / ${formatAudioTime(audioDuration)}` : 'No recording yet'}
        </span>
      </div>

      {isPlaying && (
        <div className="awp-pulse-row">
          <PlaybackPulse audioRef={audioRef} decodedRef={decodedRef} isPlaying={isPlaying} />
        </div>
      )}

      <div className="awp-body">
        <button className="awp-play-btn" onClick={togglePlay} disabled={!audioUrl}>
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <div className="awp-waveform" ref={waveformRef} onClick={handleSeekClick}>
          {peaks ? (
            peaks.map((p, i) => {
              const barPercent = ((i + 0.5) / peaks.length) * 100;
              const played = barPercent <= (audioProgress || 0);
              return (
                <div
                  key={i}
                  className={`awp-bar ${played ? 'played' : ''}`}
                  style={{ height: `${Math.max(10, p * 100)}%` }}
                />
              );
            })
          ) : (
            <div className="awp-waveform-placeholder" />
          )}
        </div>
      </div>
    </div>
  );
}
