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

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewTimerRef = useRef(null);
  const previewBusyRef = useRef(false);

  // Live "what the mic is hearing" caption: re-transcribes the recording-so-far
  // every few seconds while the doctor is still talking, so they get on-screen
  // feedback well before they click stop. Stays local — it hits our own
  // faster-whisper backend, nothing leaves the machine.
  const sendPreview = useCallback(async (mimeType) => {
    if (previewBusyRef.current || chunksRef.current.length < PREVIEW_MIN_CHUNKS) return;
    previewBusyRef.current = true;
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('ogg') ? '.ogg' : '.webm';
      const formData = new FormData();
      formData.append('audio', blob, `preview${ext}`);

      const res = await axios.post(`${API_BASE}/transcribe/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.text) setLiveCaption(res.data.text);
    } catch {
      // Best-effort only — a failed preview just means the caption doesn't
      // update this tick, nothing else depends on it.
    } finally {
      previewBusyRef.current = false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Fire-and-forget: starts loading the Ollama model now so it's warm by
      // the time the doctor finishes talking, instead of paying a cold-start
      // reload (which can exceed the extraction timeout) on the real call.
      axios.post(`${API_BASE}/llm/warmup`).catch(() => {});

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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
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
  }, [sendPreview]);

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

  return { isRecording, isProcessing, elapsedSeconds, liveCaption, startRecording, stopRecording };
}
