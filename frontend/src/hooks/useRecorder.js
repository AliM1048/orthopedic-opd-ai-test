import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export function useRecorder({ language, onTranscriptReceived, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try webm first, fallback to ogg
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

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
    } catch (err) {
      onError('Microphone access denied. Please allow mic permissions.');
    }
  }, [language]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const sendAudio = async (blob, mimeType) => {
    try {
      const ext = mimeType.includes('ogg') ? '.ogg' : '.webm';
      const formData = new FormData();
      formData.append('audio', blob, `recording${ext}`);
      formData.append('language', language);

      const res = await axios.post(`${API_BASE}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onTranscriptReceived(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Transcription failed';
      onError(msg);
    } finally {
      setIsProcessing(false);
      setElapsedSeconds(0);
    }
  };

  return { isRecording, isProcessing, elapsedSeconds, startRecording, stopRecording };
}
