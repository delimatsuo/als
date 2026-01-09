// Speech Recognition Service using Web Speech API
// Used to transcribe what the other person says in conversation

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

let recognition: SpeechRecognition | null = null;
let isListening = false;

export interface ListenOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function isSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export function startListening(options: ListenOptions): boolean {
  if (!isSupported()) {
    options.onError?.('Speech recognition is not supported in this browser');
    return false;
  }

  // Stop any existing recognition
  stopListening();

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.continuous = options.continuous ?? true;
  recognition.interimResults = options.interimResults ?? true;
  recognition.lang = options.language ?? 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    options.onStart?.();
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      options.onResult(finalTranscript.trim(), true);
    } else if (interimTranscript) {
      options.onResult(interimTranscript.trim(), false);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try again.',
      'audio-capture': 'No microphone was found or microphone access was denied.',
      'not-allowed': 'Microphone access was denied. Please allow microphone access.',
      'network': 'A network error occurred. Please check your connection.',
      'aborted': 'Speech recognition was aborted.',
      'language-not-supported': 'The selected language is not supported.',
      'service-not-allowed': 'Speech recognition service is not allowed.',
    };

    const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
    options.onError?.(message);
  };

  recognition.onend = () => {
    isListening = false;
    options.onEnd?.();

    // Auto-restart if continuous mode and not manually stopped
    if (options.continuous && recognition) {
      try {
        recognition.start();
      } catch {
        // Ignore restart errors
      }
    }
  };

  try {
    recognition.start();
    return true;
  } catch {
    options.onError?.('Failed to start speech recognition');
    return false;
  }
}

export function stopListening(): void {
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Ignore stop errors
    }
    recognition = null;
  }
  isListening = false;
}

export function getIsListening(): boolean {
  return isListening;
}
