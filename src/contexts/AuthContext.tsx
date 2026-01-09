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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Detect if we're on a mobile device (iOS/Android)
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
      return;
    }
    try {
      setLoading(true);
      // Use redirect on mobile for better compatibility
      if (isMobileDevice()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoading(false);
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
      // Use redirect on mobile for better compatibility (especially iOS)
      if (isMobileDevice()) {
        await signInWithRedirect(auth, appleProvider);
      } else {
        await signInWithPopup(auth, appleProvider);
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
