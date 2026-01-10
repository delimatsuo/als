'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider, hasValidConfig } from '@/lib/firebase';
import { useAppStore, PatientProfile } from '@/stores/app';
import { VoiceProvider } from '@/services/voice';

interface UserData {
  // Voice settings
  voiceProvider: VoiceProvider;
  voiceId: string | null;
  voiceName: string | null;
  // Patient profile
  patientProfile: PatientProfile;
  // UI settings
  highContrast: boolean;
  largeText: boolean;
  inputMode: 'keyboard' | 'eyegaze' | 'switch' | 'voice';
  // Metadata
  updatedAt: number;
  createdAt: number;
}

// Session timeout: 30 minutes of inactivity
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  resetActivity: () => void; // Call this on user interactions to prevent timeout
}

const AuthContext = createContext<AuthContextType | null>(null);

// Detect if we're on a mobile device (iOS/Android)
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Detect if we're specifically on iPhone/iPod (not iPad)
// iPad should use popup (works better in Chrome on iOS), only iPhone needs redirect
function isIPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPod/i.test(navigator.userAgent) && !/iPad/i.test(navigator.userAgent);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset activity timestamp (call on user interactions)
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!user) return;

    const checkTimeout = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > IDLE_TIMEOUT_MS) {
        console.log('[Auth] Session timeout - logging out due to inactivity');
        if (auth) {
          firebaseSignOut(auth).catch(console.error);
        }
        // Show message to user
        if (typeof window !== 'undefined') {
          alert('Your session has expired due to inactivity. Please sign in again.');
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkTimeout, 60000);

    // Also check immediately
    checkTimeout();

    return () => clearInterval(interval);
  }, [user, lastActivity]);

  // Track activity on window events
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      resetActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetActivity]);

  const {
    voiceProvider,
    setVoiceProvider,
    voiceId,
    setVoiceId,
    voiceName,
    setVoiceName,
    patientProfile,
    setPatientProfile,
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    inputMode,
    setInputMode,
  } = useAppStore();

  // Load user data from Firestore
  const loadUserData = useCallback(async (uid: string) => {
    if (!db) return;

    setSyncing(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;

        // Apply loaded settings to store
        if (data.voiceProvider) setVoiceProvider(data.voiceProvider);
        if (data.voiceId !== undefined) setVoiceId(data.voiceId);
        if (data.voiceName !== undefined) setVoiceName(data.voiceName);
        if (data.patientProfile) setPatientProfile(data.patientProfile);
        if (data.highContrast !== undefined) setHighContrast(data.highContrast);
        if (data.largeText !== undefined) setLargeText(data.largeText);
        if (data.inputMode) setInputMode(data.inputMode);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setSyncing(false);
    }
  }, [setVoiceProvider, setVoiceId, setVoiceName, setPatientProfile, setHighContrast, setLargeText, setInputMode]);

  // Save user data to Firestore
  const saveUserData = useCallback(async (uid: string) => {
    if (!db) return;

    try {
      const userData: UserData = {
        voiceProvider,
        voiceId,
        voiceName,
        patientProfile,
        highContrast,
        largeText,
        inputMode,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };

      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          ...userData,
          createdAt: userDoc.data().createdAt || Date.now(),
        });
      } else {
        await setDoc(userRef, userData);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }, [voiceProvider, voiceId, voiceName, patientProfile, highContrast, largeText, inputMode]);

  // Manual sync to cloud
  const syncToCloud = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    await saveUserData(user.uid);
    setSyncing(false);
  }, [user, saveUserData]);

  // Check for redirect result on mount (for mobile sign-in)
  useEffect(() => {
    if (!auth) return;

    const authInstance = auth; // Capture for TypeScript narrowing
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(authInstance);
        if (result?.user) {
          console.log('Redirect sign-in successful:', result.user.email);
          // User will be set by onAuthStateChanged
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    checkRedirectResult();
  }, []);

  // Auth state listener
  useEffect(() => {
    // If Firebase is not configured, don't set up auth listener
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadUserData(user.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserData]);

  // Auto-save when settings change (debounced)
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      saveUserData(user.uid);
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timeoutId);
  }, [user, voiceProvider, voiceId, voiceName, patientProfile, highContrast, largeText, inputMode, saveUserData]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      alert('Firebase auth not initialized. Please refresh the page.');
      return;
    }
    try {
      setLoading(true);
      console.log('[Auth] Starting Google sign-in, iPhone:', isIPhone(), 'mobile:', isMobileDevice());

      // Only iPhone uses redirect (required for iOS in-app browsers)
      // iPad, Android, and Desktop use popup (works better in Chrome on iOS)
      if (isIPhone()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          console.log('[Auth] Sign-in successful:', result.user.email);
        } catch (popupError) {
          // If popup blocked, try redirect as fallback
          const errorCode = (popupError as { code?: string })?.code;
          if (errorCode === 'auth/popup-blocked') {
            console.log('[Auth] Popup blocked, falling back to redirect');
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as { code?: string })?.code || 'unknown';
      alert(`Sign-in failed: ${errorCode}\n${errorMessage}`);
      throw error;
    }
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      return;
    }
    try {
      setLoading(true);
      console.log('[Auth] Starting Apple sign-in, iPhone:', isIPhone(), 'mobile:', isMobileDevice());

      // Only iPhone uses redirect, iPad and Desktop use popup
      if (isIPhone()) {
        await signInWithRedirect(auth, appleProvider);
      } else {
        try {
          await signInWithPopup(auth, appleProvider);
        } catch (popupError) {
          const errorCode = (popupError as { code?: string })?.code;
          if (errorCode === 'auth/popup-blocked') {
            console.log('[Auth] Popup blocked, falling back to redirect');
            await signInWithRedirect(auth, appleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error) {
      console.error('Apple sign-in error:', error);
      setLoading(false);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      return;
    }
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncing,
        isConfigured: hasValidConfig,
        signInWithGoogle,
        signInWithApple,
        signOut,
        syncToCloud,
        resetActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
