/**
 * Speech recognition hook using MediaRecorder + Whisper/Google Cloud Speech API.
 *
 * Web Speech API does not work in Electron (no Google API keys in Chromium).
 * Instead, we capture audio via MediaRecorder in 5-second chunks, send each
 * to the main process via IPC for transcription, and return results in order.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MicStatus } from "../lib/types";
import { transcribeAudio } from "../lib/electron-api";

type SpeechResult = {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  isForced?: boolean;
};

type UseSpeechRecognitionOptions = {
  language: string;
  onResult: (result: SpeechResult) => void;
  onError?: (error: string) => void;
};

type UseSpeechRecognitionReturn = {
  start: () => void;
  stop: () => void;
  micStatus: MicStatus;
  isSupported: boolean;
};

const CHUNK_DURATION_MS = 5000;
const MIN_AUDIO_SIZE = 1000;
const STATUS_INTERVAL_MS = 600;

export function useSpeechRecognition({
  language,
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");

  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const streamRef = useRef<MediaStream | null>(null);
  const shouldRecordRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTranscribingRef = useRef(false);
  // Suppress status timer while showing recognized text
  const showingResultRef = useRef(false);

  // Sequential processing queue to maintain result order
  const chunkQueueRef = useRef<Blob[]>([]);
  const isProcessingQueueRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // --- Status indicator: sends interim results to show recording/processing state ---
  const startStatusUpdates = useCallback(() => {
    // Send initial status immediately
    onResultRef.current({ transcript: "Listening...", isFinal: false, confidence: 0 });

    statusTimerRef.current = setInterval(() => {
      if (!shouldRecordRef.current) return;
      if (showingResultRef.current) return; // Don't override recognized text
      const text = isTranscribingRef.current ? "Transcribing..." : "Listening...";
      onResultRef.current({ transcript: text, isFinal: false, confidence: 0 });
    }, STATUS_INTERVAL_MS);
  }, []);

  const stopStatusUpdates = useCallback(() => {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  // --- Chunk processing ---
  const processChunk = useCallback(async (blob: Blob) => {
    if (blob.size < MIN_AUDIO_SIZE) return;

    showingResultRef.current = false; // Allow status updates while transcribing
    isTranscribingRef.current = true;
    try {
      const buffer = await blob.arrayBuffer();
      const text = await transcribeAudio(buffer, languageRef.current);

      if (text && text.trim()) {
        const trimmed = text.trim();

        // Show recognized text as interim (visible while translation runs)
        showingResultRef.current = true;
        onResultRef.current({
          transcript: trimmed,
          isFinal: false,
          confidence: 0.9,
        });

        // Send final to trigger translation
        onResultRef.current({
          transcript: trimmed,
          isFinal: true,
          confidence: 0.9,
          isForced: false,
        });

        // Auto-release after 4s so status timer can resume
        setTimeout(() => { showingResultRef.current = false; }, 4000);
      }
    } catch (err) {
      showingResultRef.current = false;
      onErrorRef.current?.(
        `Transcription error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      isTranscribingRef.current = false;
    }
  }, []);

  // Process chunks one at a time to maintain order
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      const blob = chunkQueueRef.current.shift()!;
      await processChunk(blob);
    }

    isProcessingQueueRef.current = false;
  }, [processChunk]);

  const enqueueChunk = useCallback((blob: Blob) => {
    chunkQueueRef.current.push(blob);
    processQueue();
  }, [processQueue]);

  // --- Recording lifecycle ---
  const startNewChunk = useCallback(() => {
    if (!shouldRecordRef.current || !streamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      enqueueChunk(blob);
      startNewChunk(); // Start next chunk immediately
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    setTimeout(() => {
      if (recorder.state === "recording" && shouldRecordRef.current) {
        recorder.stop();
      }
    }, CHUNK_DURATION_MS);
  }, [enqueueChunk]);

  const stop = useCallback(() => {
    shouldRecordRef.current = false;
    stopStatusUpdates();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setMicStatus("stopped");
  }, [stopStatusUpdates]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setMicStatus("error");
      onErrorRef.current?.("Audio recording is not supported in this environment.");
      return;
    }

    // Reset queue
    chunkQueueRef.current = [];
    isProcessingQueueRef.current = false;
    isTranscribingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      shouldRecordRef.current = true;

      startNewChunk();
      startStatusUpdates();
      setMicStatus("listening");
    } catch {
      setMicStatus("error");
      onErrorRef.current?.("Microphone access was denied. Please allow microphone access.");
    }
  }, [isSupported, startNewChunk, startStatusUpdates]);

  useEffect(() => {
    return () => {
      shouldRecordRef.current = false;
      stopStatusUpdates();
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopStatusUpdates]);

  return { start, stop, micStatus, isSupported };
}
