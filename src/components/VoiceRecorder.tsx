'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceRecorderProps {
  onVoiceCloned: (voiceId: string, voiceName: string) => void;
  onCancel: () => void;
}

interface Recording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
}

const SAMPLE_PHRASES = [
  "The quick brown fox jumps over the lazy dog.",
  "Hello, my name is... and I'm recording my voice today.",
  "I enjoy spending time with my family and friends.",
  "The weather today is quite nice for a walk outside.",
  "Thank you for helping me preserve my voice.",
];

export function VoiceRecorder({ onVoiceCloned, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [voiceName, setVoiceName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - startTimeRef.current) / 1000;

        setRecordings((prev) => [
          ...prev,
          {
            id: `recording-${Date.now()}`,
            blob,
            url,
            duration,
          },
        ]);

        // Move to next phrase
        setCurrentPhraseIndex((prev) =>
          prev < SAMPLE_PHRASES.length - 1 ? prev + 1 : prev
        );

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time every 100ms
      timerRef.current = setInterval(() => {
        setRecordingTime((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone permissions.');
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const recording = prev.find((r) => r.id === id);
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      setError('Please enter a name for your voice');
      return;
    }

    if (recordings.length === 0) {
      setError('Please record at least one audio sample');
      return;
    }

    setIsCloning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('description', 'Voice cloned via ALS Communicator');

      // Add all recordings as files
      for (let i = 0; i < recordings.length; i++) {
        const recording = recordings[i];
        const file = new File([recording.blob], `sample-${i + 1}.webm`, {
          type: 'audio/webm',
        });
        formData.append('files', file);
      }

      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone voice');
      }

      onVoiceCloned(data.voiceId, data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone voice');
    } finally {
      setIsCloning(false);
    }
  };

  const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);
  const hasEnoughSamples = totalDuration >= 10; // At least 10 seconds recommended

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-purple-500 to-indigo-500">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Record Your Voice
          </h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Record a few samples to create your personal voice
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Voice Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Voice Name
          </label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g., My Voice, Dad's Voice"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Sample Phrase */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Read this phrase ({currentPhraseIndex + 1}/{SAMPLE_PHRASES.length})
          </p>
          <p className="text-lg text-gray-900 dark:text-white font-medium">
            &ldquo;{SAMPLE_PHRASES[currentPhraseIndex]}&rdquo;
          </p>
        </div>

        {/* Record Button */}
        <div className="flex flex-col items-center py-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-lg
              ${isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-indigo-500 hover:bg-indigo-600'
              }
            `}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
              </svg>
            )}
          </button>
          {isRecording && (
            <p className="mt-3 text-red-500 font-medium">
              Recording: {recordingTime.toFixed(1)}s
            </p>
          )}
          {!isRecording && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Tap to {recordings.length > 0 ? 'record another sample' : 'start recording'}
            </p>
          )}
        </div>

        {/* Recordings List */}
        {recordings.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recordings ({recordings.length}) - {totalDuration.toFixed(1)}s total
            </p>
            <div className="space-y-2">
              {recordings.map((recording, index) => (
                <div
                  key={recording.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{index + 1}
                  </span>
                  <audio src={recording.url} controls className="flex-1 h-8" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {recording.duration.toFixed(1)}s
                  </span>
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Delete recording"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {recordings.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Recording progress</span>
              <span className={hasEnoughSamples ? 'text-green-500' : 'text-amber-500'}>
                {hasEnoughSamples ? 'Ready to clone' : `Need ${(10 - totalDuration).toFixed(0)}s more`}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${hasEnoughSamples ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min((totalDuration / 10) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum 10 seconds recommended for best results
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Clone Button */}
        <button
          onClick={handleCloneVoice}
          disabled={isCloning || recordings.length === 0 || !voiceName.trim()}
          className="
            w-full py-4 rounded-xl
            bg-gradient-to-r from-purple-500 to-indigo-500
            text-white font-semibold text-lg
            hover:from-purple-600 hover:to-indigo-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          {isCloning ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating your voice...
            </>
          ) : (
            'Create My Voice'
          )}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Your voice will be securely processed by ElevenLabs to create a personalized voice clone.
        </p>
      </div>
    </div>
  );
}
