import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

const BUCKET_COUNT = 100;

// Decoded waveform peaks are cached per audioUrl (module-level, survives
// across re-mounts/navigations within the session) so reopening an
// evaluation doesn't re-decode the same recording every time.
const peaksCache = new Map();

async function decodePeaks(audioUrl) {
  if (peaksCache.has(audioUrl)) return peaksCache.get(audioUrl);
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
    peaksCache.set(audioUrl, peaks);
    return peaks;
  } finally {
    audioContext.close().catch(() => {});
  }
}

/** Doctor Voice Note player — a decoded, click-to-seek waveform (not just a
 * flat progress bar) with a played/unplayed two-tone fill. Owns the <audio>
 * element itself since it needs the ref anyway; audioRef/isPlaying/etc. are
 * still driven by the parent (shared with ReviewPrintView, which renders its
 * own instance of this component against the same state). */
export default function AudioWaveformPlayer({
  audioUrl, audioRef, isPlaying, togglePlay,
  audioProgress, audioCurrentTime, audioDuration, formatAudioTime,
  handleTimeUpdate, handleLoadedMetadata, handleAudioEnd,
}) {
  const [peaks, setPeaks] = useState(null);
  const waveformRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    if (!audioUrl) return undefined;
    decodePeaks(audioUrl)
      .then((p) => { if (!cancelled) setPeaks(p); })
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
