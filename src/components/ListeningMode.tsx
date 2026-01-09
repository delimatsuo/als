'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startListening,
  stopListening,
  isSupported as isWebSpeechSupported,
  getIsListening,
} from '@/services/speechRecognition';

interface ListeningModeProps {
  onTranscriptReady: (transcript: string) => void;
  onCancel: () => void;
  onEndConversation?: () => void; // End entire conversation
  isGenerating?: boolean;
  autoSubmit?: boolean;
  silenceTimeout?: number;
}

export function ListeningMode({
  onTranscriptReady,
  onCancel,
  onEndConversation,
  isGenerating,
  autoSubmit = false,
  silenceTimeout = 2000,
}: ListeningModeProps) {
  const webSpeechSupported = isWebSpeechSupported();
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef(false);

  // MediaRecorder refs for fallback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceDetectorRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceCountdown(null);
  }, []);

  const startSilenceTimer = useCallback(() => {
    if (!autoSubmit || hasSubmittedRef.current) return;
    clearSilenceTimer();

    if (transcript.trim()) {
      setSilenceCountdown(silenceTimeout / 1000);
      silenceTimerRef.current = setTimeout(() => {
        if (transcript.trim() && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          stopListening();
          onTranscriptReady(transcript.trim());
        }
      }, silenceTimeout);
    }
  }, [autoSubmit, silenceTimeout, transcript, onTranscriptReady, clearSilenceTimer]);

  // Transcribe audio using Gemini API
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      return data.transcript || '';
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try again.');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Stop MediaRecorder and process audio
  const stopMediaRecorder = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (silenceDetectorRef.current) {
      clearInterval(silenceDetectorRef.current);
      silenceDetectorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Start MediaRecorder for audio capture (fallback for iOS)
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis for silence detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0 && !hasSubmittedRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          const transcriptText = await transcribeAudio(audioBlob);
          if (transcriptText.trim()) {
            setTranscript(transcriptText);
            // Auto-submit if enabled
            if (autoSubmit && !hasSubmittedRef.current) {
              hasSubmittedRef.current = true;
              onTranscriptReady(transcriptText.trim());
            }
          }
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setError(null);

      // Silence detection
      let silentFrames = 0;
      const silenceThreshold = 10; // Adjust based on testing
      const requiredSilentFrames = Math.ceil((silenceTimeout / 1000) * 10); // frames for silence duration
      let hasDetectedSpeech = false;

      silenceDetectorRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > silenceThreshold) {
          hasDetectedSpeech = true;
          silentFrames = 0;
          setSilenceCountdown(null);
        } else if (hasDetectedSpeech) {
          silentFrames++;
          const secondsRemaining = Math.ceil((requiredSilentFrames - silentFrames) / 10);
          if (secondsRemaining > 0 && secondsRemaining <= silenceTimeout / 1000) {
            setSilenceCountdown(secondsRemaining);
          }

          if (silentFrames >= requiredSilentFrames) {
            // Silence detected after speech - stop and transcribe
            stopMediaRecorder();
          }
        }
      }, 100);

    } catch (err) {
      console.error('MediaRecorder error:', err);
      // Check if it's a secure context issue (iOS requires HTTPS for getUserMedia)
      const isSecureContext = window.isSecureContext;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (!isSecureContext && !isLocalhost) {
        setError('Microphone requires HTTPS on iOS. Please access via https:// or use localhost.');
      } else if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else {
        setError('Could not access microphone. Please check permissions.');
      }
    }
  }, [autoSubmit, silenceTimeout, onTranscriptReady, transcribeAudio, stopMediaRecorder]);

  // Initialize: use Web Speech API if supported, otherwise MediaRecorder
  useEffect(() => {
    hasSubmittedRef.current = false;

    if (webSpeechSupported) {
      // Use Web Speech API (works on desktop Chrome/Edge)
      const started = startListening({
        continuous: true,
        interimResults: true,
        onResult: (text, isFinal) => {
          clearSilenceTimer();
          if (isFinal) {
            setTranscript((prev) => (prev ? `${prev} ${text}` : text));
            setInterimTranscript('');
          } else {
            setInterimTranscript(text);
          }
        },
        onError: (err) => {
          setError(err);
          setIsListening(false);
        },
        onStart: () => {
          setIsListening(true);
          setError(null);
        },
        onEnd: () => {
          setIsListening(getIsListening());
        },
      });

      if (!started) {
        setError('Failed to start. Check microphone permissions.');
      }
    } else {
      // Use MediaRecorder + Gemini transcription (works on iOS)
      startMediaRecorder();
    }

    return () => {
      if (webSpeechSupported) {
        stopListening();
      } else {
        stopMediaRecorder();
      }
      clearSilenceTimer();
    };
  }, [webSpeechSupported, clearSilenceTimer, startMediaRecorder, stopMediaRecorder]);

  // Start silence timer when we have a final transcript (Web Speech API only)
  useEffect(() => {
    if (!webSpeechSupported) return;

    const shouldStartTimer =
      !!transcript.trim() && !interimTranscript && autoSubmit && !hasSubmittedRef.current;

    if (shouldStartTimer) {
      queueMicrotask(() => {
        startSilenceTimer();
      });
    }
  }, [webSpeechSupported, transcript, interimTranscript, autoSubmit, startSilenceTimer]);

  useEffect(() => {
    if (silenceCountdown === null || silenceCountdown <= 0) return;
    const interval = setInterval(() => {
      setSilenceCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [silenceCountdown]);

  const handleDone = useCallback(async () => {
    if (webSpeechSupported) {
      stopListening();
      if (transcript.trim()) {
        onTranscriptReady(transcript.trim());
      }
    } else {
      // Stop recording and wait for transcription
      hasSubmittedRef.current = true;
      await stopMediaRecorder();
      // The onstop handler will call onTranscriptReady
    }
  }, [webSpeechSupported, transcript, onTranscriptReady, stopMediaRecorder]);

  const handleClear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    audioChunksRef.current = [];
  }, []);

  const handleCancel = useCallback(() => {
    hasSubmittedRef.current = true; // Prevent auto-submit
    if (webSpeechSupported) {
      stopListening();
    } else {
      stopMediaRecorder();
    }
    onCancel();
  }, [webSpeechSupported, onCancel, stopMediaRecorder]);

  // End entire conversation (one tap to exit everything)
  const handleEndConversation = useCallback(() => {
    hasSubmittedRef.current = true;
    if (webSpeechSupported) {
      stopListening();
    } else {
      stopMediaRecorder();
    }
    if (onEndConversation) {
      onEndConversation();
    } else {
      onCancel();
    }
  }, [webSpeechSupported, onCancel, onEndConversation, stopMediaRecorder]);

  const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '');
  const hasTranscript = fullTranscript.trim().length > 0;
  const isActive = webSpeechSupported ? isListening : isRecording;
  const isProcessing = isGenerating || isTranscribing;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          )}
          <p className="font-semibold text-white">
            {isTranscribing ? 'Processing...' : isActive ? 'Listening...' : 'Paused'}
          </p>
        </div>
        <button
          onClick={handleCancel}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Transcript */}
      <div className="p-5 min-h-[140px]">
        {isTranscribing ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="font-medium">Transcribing audio...</p>
          </div>
        ) : hasTranscript ? (
          <p className="text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-gray-400 dark:text-gray-500">
                {' '}{interimTranscript}
              </span>
            )}
          </p>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <p className="font-medium">Listening for their response...</p>
            {!webSpeechSupported && (
              <p className="text-sm mt-1">Speak clearly near the microphone</p>
            )}
          </div>
        )}
      </div>

      {/* Auto-submit progress */}
      {silenceCountdown !== null && silenceCountdown > 0 && (
        <div className="px-5 pb-3">
          <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-1000"
              style={{ width: `${(silenceCountdown / (silenceTimeout / 1000)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            Processing in {silenceCountdown}s...
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 space-y-3">
        {/* Primary action row */}
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            disabled={!hasTranscript || isProcessing}
            className="
              min-w-[56px] min-h-[56px] px-5 rounded-2xl
              bg-gray-100 dark:bg-gray-700
              text-gray-600 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-40 disabled:pointer-events-none
              font-semibold text-[17px]
              transition-all duration-150
            "
          >
            Clear
          </button>

          <button
            onClick={handleDone}
            disabled={(!hasTranscript && !isRecording) || isProcessing}
            className="
              flex-1 min-h-[56px] px-6 rounded-2xl
              bg-indigo-500 text-white
              hover:bg-indigo-600 active:bg-indigo-700
              disabled:bg-gray-200 dark:disabled:bg-gray-700
              disabled:text-gray-400 dark:disabled:text-gray-500
              disabled:pointer-events-none
              font-bold text-lg
              transition-all duration-150
              flex items-center justify-center gap-2
              shadow-lg shadow-indigo-500/30
            "
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isTranscribing ? 'Transcribing...' : 'Generating...'}
              </>
            ) : (
              'Get Responses'
            )}
          </button>
        </div>

        {/* End Conversation button - ONE TAP TO EXIT */}
        <button
          onClick={handleEndConversation}
          className="
            w-full min-h-[56px] px-6 rounded-2xl
            bg-red-500 text-white
            hover:bg-red-600 active:bg-red-700
            font-bold text-lg
            transition-all duration-150
            flex items-center justify-center gap-2
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          End Conversation
        </button>
      </div>
    </div>
  );
}
