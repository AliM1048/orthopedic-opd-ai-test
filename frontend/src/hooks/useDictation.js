import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

// One-take physician dictation: records a single clip covering diagnosis,
// diagnostics to order, and treatment plan, then sends it to /dictate which
// transcribes it and returns AI-structured fields ready to pre-fill the form.
const PREVIEW_INTERVAL_MS = 4000;
const PREVIEW_MIN_CHUNKS = 5; // ~0.5s at the 100ms timeslice below — skip near-empty previews

export function useDictation({ patientId, onResult, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveCaption, setLiveCaption] = useState('');
  // No more up-front language picker — this is identified from the first
  // words spoken (see sendPreview) and then reused/forced for the rest of
  // the recording, both for later live-preview chunks and the final /dictate
  // call. Reset to null at the start of every new recording.
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewTimerRef = useRef(null);
  const previewBusyRef = useRef(false);
  // Mirrors detectedLanguage for synchronous reads inside sendPreview/sendAudio
  // callbacks, which close over state from whenever they were created —
  // a ref always has the latest value without needing to resubscribe them.
  const detectedLanguageRef = useRef(null);

  // Web Audio graph for the live waveform visualization — runs in parallel
  // with (not instead of) MediaRecorder; createMediaStreamSource taps the
  // stream non-destructively so both can consume it at once. Exposed via
  // analyserRef so a consumer (DictationRecordingModal) can read live
  // frequency data in its own rAF loop without this hook re-rendering on
  // every audio frame.
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Live "what the mic is hearing" caption: re-transcribes the recording-so-far
  // every few seconds while the doctor is still talking, so they get on-screen
  // feedback well before they click stop. Stays local — it hits our own
  // backend, nothing leaves the machine except the audio itself.
  const sendPreview = useCallback(async (mimeType) => {
    if (previewBusyRef.current || chunksRef.current.length < PREVIEW_MIN_CHUNKS) return;
    previewBusyRef.current = true;
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('ogg') ? '.ogg' : '.webm';
      const formData = new FormData();
      formData.append('audio', blob, `preview${ext}`);
      // Empty until detected — the backend then auto-detects from this
      // chunk's text and hands the result back, which we lock in below so
      // every later preview (and the final /dictate call) forces it.
      formData.append('language', detectedLanguageRef.current || '');

      const res = await axios.post(`${API_BASE}/transcribe/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.text) setLiveCaption(res.data.text);
      if (!detectedLanguageRef.current && res.data?.language) {
        detectedLanguageRef.current = res.data.language;
        setDetectedLanguage(res.data.language);
      }
    } catch {
      // Best-effort only — a failed preview just means the caption doesn't
      // update this tick, nothing else depends on it.
    } finally {
      previewBusyRef.current = false;
    }
  }, []);

  const teardownAudioGraph = useCallback(() => {
    analyserRef.current = null;
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setLiveCaption('');
      detectedLanguageRef.current = null;
      setDetectedLanguage(null);

      // A fresh AudioContext/AnalyserNode per recording — never reused across
      // cycles (a doctor may record multiple takes per visit).
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop the live waveform before the tracks stop (once stopped, the
        // analyser goes silent anyway) and tear down the audio graph.
        teardownAudioGraph();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await sendAudio(blob, mimeType);
      };

      recorder.start(100);
      setIsRecording(true);
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      previewTimerRef.current = setInterval(() => {
        sendPreview(mimeType);
      }, PREVIEW_INTERVAL_MS);
    } catch (err) {
      onError('Microphone access denied. Please allow mic permissions.');
    }
  }, [sendPreview, teardownAudioGraph]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      clearInterval(previewTimerRef.current);
      setIsRecording(false);
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const sendAudio = async (blob, mimeType) => {
    try {
      const ext = mimeType.includes('ogg') ? '.ogg' : '.webm';
      const formData = new FormData();
      formData.append('audio', blob, `dictation${ext}`);
      if (patientId) formData.append('patient_id', patientId);
      // Whatever was detected from the first preview chunk, if any — see
      // sendPreview. Left empty on a recording too short for a preview to
      // have fired; the backend detects it from the full transcript instead.
      formData.append('language', detectedLanguageRef.current || '');

      const res = await axios.post(`${API_BASE}/dictate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Dictation processing failed';
      onError(msg);
    } finally {
      setIsProcessing(false);
      setElapsedSeconds(0);
    }
  };

  return { isRecording, isProcessing, elapsedSeconds, liveCaption, detectedLanguage, analyserRef, startRecording, stopRecording };
}
