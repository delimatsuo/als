// Voice service supporting both ElevenLabs and Web Speech API
// ElevenLabs provides high-quality cloned voices
// Web Speech API is the fallback when ElevenLabs is not configured

import { getAuthHeaders } from '@/lib/authToken';

let currentAudio: HTMLAudioElement | null = null;
let _currentUtterance: SpeechSynthesisUtterance | null = null;

// Global AudioContext for iOS compatibility (reuse instead of creating new ones)
let globalAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

export type VoiceProvider = 'elevenlabs' | 'browser';

export interface ElevenLabsVoice {
  id: string;
  name: string;
  labels?: Record<string, string>;
}

interface SpeakOptions {
  text: string;
  provider?: VoiceProvider;
  voiceId?: string; // ElevenLabs voice ID
  rate?: number; // 0.1 to 10, default 1 (browser only)
  pitch?: number; // 0 to 2, default 1 (browser only)
  volume?: number; // 0 to 1, default 1
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Audio cache for ElevenLabs responses
const audioCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

function getCacheKey(text: string, voiceId?: string): string {
  return `${voiceId || 'default'}:${text}`;
}

function addToCache(key: string, audioUrl: string): void {
  // Evict oldest if cache is full
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) {
      const url = audioCache.get(firstKey);
      if (url) URL.revokeObjectURL(url);
      audioCache.delete(firstKey);
    }
  }
  audioCache.set(key, audioUrl);
}

// Get or create the global AudioContext
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!globalAudioContext) {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioContext = new AudioContextClass();
      }
    } catch (error) {
      console.warn('[Voice] Failed to create AudioContext:', error);
    }
  }

  return globalAudioContext;
}

// Resume AudioContext if suspended (required for iOS after user gesture)
async function ensureAudioContextResumed(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
      console.log('[Voice] AudioContext resumed');
    } catch (error) {
      console.warn('[Voice] Failed to resume AudioContext:', error);
    }
  }
}

// Detect iOS/iPadOS
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Play an empty/silent buffer through Web Audio API to unlock it
// This is the key technique used by Howler.js and other audio libraries
// We use a gain node set to 0 to ensure absolute silence
function playEmptyBuffer(ctx: AudioContext): void {
  try {
    // Create a longer buffer to avoid click/pop artifacts
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * 0.1, sampleRate); // 100ms of silence

    // Fill with zeros (silence)
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = 0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Use a gain node set to 0 for absolute silence
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    console.log('[Voice] Silent buffer played through Web Audio API');
  } catch (e) {
    console.warn('[Voice] Failed to play empty buffer:', e);
  }
}

// Unlock audio on iOS - must be called from a user gesture handler
// Based on solutions from Howler.js and web-audio-touch-unlock
// See: https://github.com/goldfire/howler.js
// See: https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos
export async function unlockAudio(): Promise<void> {
  if (isAudioUnlocked) return;

  const isIOS = isIOSDevice();
  console.log('[Voice] Attempting to unlock audio, iOS:', isIOS);

  try {
    // Get or create AudioContext
    const ctx = getAudioContext();

    if (ctx) {
      // Resume AudioContext if suspended
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
          console.log('[Voice] AudioContext resumed, state:', ctx.state);
        } catch (e) {
          console.warn('[Voice] Failed to resume AudioContext:', e);
        }
      }

      // Play empty buffer through Web Audio API
      // This is the technique Howler.js uses to unlock iOS audio
      playEmptyBuffer(ctx);

      // Check if we're running now
      if (ctx.state === 'running') {
        console.log('[Voice] AudioContext is running');
        isAudioUnlocked = true;
      }
    }

    // Also try HTML5 Audio unlock as backup
    // Create and play a short silent audio with volume at 0
    const silentAudio = document.createElement('audio');
    // Minimal silent WAV (44 bytes) - truly empty
    silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    silentAudio.volume = 0; // Completely silent
    silentAudio.muted = true; // Also mute for safety
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
    silentAudio.style.display = 'none';
    document.body.appendChild(silentAudio);

    try {
      await silentAudio.play();
      console.log('[Voice] HTML5 Audio unlocked');
    } catch (e) {
      // This is expected to fail sometimes, but the attempt itself can unlock
      console.log('[Voice] HTML5 Audio play attempt:', e);
    }

    silentAudio.pause();
    silentAudio.remove();

    isAudioUnlocked = true;
    console.log('[Voice] Audio unlock complete');
  } catch (error) {
    console.warn('[Voice] Failed to unlock audio:', error);
    // Still mark as attempted to avoid blocking
    isAudioUnlocked = true;
  }
}

// Setup automatic audio unlock on user interaction
// This should be called once on app startup
// Uses touchend (required for iOS 9+), touchstart, mousedown, and keydown
export function setupAudioUnlock(): void {
  if (typeof document === 'undefined') return;

  const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];

  const handleUnlock = () => {
    unlockAudio();
    // Only remove listeners after AudioContext is running
    const ctx = getAudioContext();
    if (ctx?.state === 'running' || isAudioUnlocked) {
      events.forEach(e => document.body.removeEventListener(e, handleUnlock));
      console.log('[Voice] Auto-unlock listeners removed');
    }
  };

  events.forEach(e => document.body.addEventListener(e, handleUnlock, false));
  console.log('[Voice] Auto-unlock listeners attached');
}

// Force reset audio unlock state (for retry scenarios)
export function resetAudioUnlock(): void {
  isAudioUnlocked = false;
}

// Speak using ElevenLabs API
async function speakWithElevenLabs(options: SpeakOptions): Promise<void> {
  const { text, voiceId, volume = 1, onStart, onEnd, onError } = options;

  const isIOS = isIOSDevice();
  console.log('[Voice] speakWithElevenLabs called, iOS:', isIOS);

  // Stop any current playback first
  stop();

  // Create audio element IMMEDIATELY (during user gesture)
  // This is crucial for iOS - the element must exist before async work
  const audio = document.createElement('audio');
  audio.volume = volume;
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';
  audio.style.display = 'none';
  document.body.appendChild(audio);
  currentAudio = audio;

  // Ensure audio is unlocked
  await unlockAudio();

  let audioUrl: string;
  try {
    console.log('[Voice] Fetching audio from ElevenLabs...');
    const headers = await getAuthHeaders();
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Check for quota exceeded error
      if (errorData.detail?.status === 'quota_exceeded' || errorData.error?.includes('quota')) {
        throw new Error('ElevenLabs quota exceeded. Please add credits or use browser voice.');
      }
      throw new Error(errorData.error || errorData.detail?.message || 'Failed to generate speech');
    }

    // Get audio as ArrayBuffer first, then create blob with explicit MIME type
    const arrayBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    audioUrl = URL.createObjectURL(audioBlob);
    console.log('[Voice] Audio blob created, size:', audioBlob.size);
  } catch (error) {
    console.error('[Voice] Fetch error:', error);
    // Clean up the audio element we created
    if (audio.parentNode) {
      document.body.removeChild(audio);
    }
    currentAudio = null;
    throw error;
  }

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      if (audio.parentNode) {
        document.body.removeChild(audio);
      }
      URL.revokeObjectURL(audioUrl);
    };

    audio.oncanplaythrough = () => {
      console.log('[Voice] Audio can play through');
    };

    audio.onplay = () => {
      console.log('[Voice] Audio started playing');
      onStart?.();
    };

    audio.onended = () => {
      console.log('[Voice] Audio ended');
      currentAudio = null;
      cleanup();
      onEnd?.();
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[Voice] Audio error:', e, audio.error);
      currentAudio = null;
      cleanup();
      onError?.(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
      resolve();
    };

    // Set source and load
    audio.src = audioUrl;
    audio.load();

    // Play with retry logic
    const attemptPlay = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Voice] Play attempt ${i + 1}...`);

          // On iOS, try to resume AudioContext before each play attempt
          if (isIOS) {
            await ensureAudioContextResumed();
          }

          await audio.play();
          console.log('[Voice] Play succeeded on attempt', i + 1);
          return;
        } catch (error) {
          console.warn(`[Voice] Play attempt ${i + 1} failed:`, error);

          if (i < retries - 1) {
            // Wait before retrying
            await new Promise(r => setTimeout(r, 150));
          } else {
            // Final attempt failed
            console.error('[Voice] All play attempts failed');
            currentAudio = null;
            cleanup();
            onError?.(error instanceof Error ? error : new Error('Audio playback failed'));
            resolve();
          }
        }
      }
    };

    // Wait a tiny bit for the audio to be ready, then play
    setTimeout(() => attemptPlay(), 50);
  });
}

// Speak using Web Speech API (fallback)
function speakWithBrowser(options: SpeakOptions): void {
  const { text, rate = 0.9, pitch = 1, volume = 1, onStart, onEnd, onError } = options;

  if (!('speechSynthesis' in window)) {
    onError?.(new Error('Speech synthesis not supported in this browser'));
    return;
  }

  const isIOS = isIOSDevice();
  console.log('[Voice] speakWithBrowser called, iOS:', isIOS);

  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();

  // On iOS, prefer system voices which are more reliable
  let preferredVoice;
  if (isIOS) {
    preferredVoice = voices.find(
      (voice) => voice.lang.startsWith('en') && voice.localService
    );
  } else {
    preferredVoice = voices.find(
      (voice) =>
        voice.lang.startsWith('en') &&
        (voice.name.includes('Google') || voice.name.includes('Premium') || voice.localService)
    );
  }

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    console.log('[Voice] Using voice:', preferredVoice.name);
  }

  utterance.onstart = () => {
    console.log('[Voice] Browser speech started');
    onStart?.();
  };
  utterance.onend = () => {
    console.log('[Voice] Browser speech ended');
    _currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = (event) => {
    console.error('[Voice] Speech synthesis error:', event.error);
    _currentUtterance = null;
    // On iOS, 'interrupted' is common and not a real error
    if (event.error !== 'interrupted') {
      onError?.(new Error(`Speech synthesis error: ${event.error}`));
    } else {
      onEnd?.(); // Treat interrupted as ended
    }
  };

  _currentUtterance = utterance;

  // iOS Safari bug: speechSynthesis can get stuck. Cancel first.
  window.speechSynthesis.cancel();

  // On iOS, use a longer delay and ensure voices are loaded
  const delay = isIOS ? 100 : 50;
  setTimeout(() => {
    // Double-check voices are loaded on iOS
    if (isIOS && !utterance.voice) {
      const iosVoices = window.speechSynthesis.getVoices();
      const iosVoice = iosVoices.find(v => v.lang.startsWith('en') && v.localService);
      if (iosVoice) {
        utterance.voice = iosVoice;
      }
    }
    window.speechSynthesis.speak(utterance);
    console.log('[Voice] Speech synthesis speak() called');
  }, delay);
}

// Main speak function - automatically selects provider with fallback
export async function speak(options: SpeakOptions): Promise<void> {
  const provider = options.provider || (options.voiceId ? 'elevenlabs' : 'browser');

  // Always try to unlock audio first (safe to call multiple times)
  await unlockAudio();

  if (provider === 'elevenlabs') {
    try {
      await speakWithElevenLabs(options);
    } catch (error) {
      console.warn('[Voice] ElevenLabs failed, falling back to browser voice:', error);
      // Fallback to browser voice if ElevenLabs fails
      speakWithBrowser({
        ...options,
        onError: (browserError) => {
          // If both fail, report the original ElevenLabs error
          options.onError?.(error instanceof Error ? error : new Error('Speech synthesis failed'));
        },
      });
    }
  } else {
    speakWithBrowser(options);
  }
}

export function stop(): void {
  // Stop ElevenLabs audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // Stop Web Speech API
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  _currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (currentAudio && !currentAudio.paused) {
    return true;
  }
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    return true;
  }
  return false;
}

// Get available browser voices
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if ('speechSynthesis' in window) {
    return window.speechSynthesis.getVoices();
  }
  return [];
}

// Fetch ElevenLabs voices
export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch('/api/speak');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.voices || [];
  } catch {
    return [];
  }
}

// Initialize voices (needed for some browsers)
export function initVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };

    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}

// Clear audio cache
export function clearAudioCache(): void {
  audioCache.forEach((url) => URL.revokeObjectURL(url));
  audioCache.clear();
}
