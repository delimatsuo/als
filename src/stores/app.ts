import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VoiceProvider } from '@/services/voice';

export interface Suggestion {
  id: string;
  text: string;
}

// Updated to track both the patient and the other person in conversation
export interface ConversationMessage {
  role: 'patient' | 'other'; // patient = ALS user, other = person they're talking to
  content: string;
  timestamp: number;
}

export interface QuickPhrase {
  id: string;
  text: string;
  category: string;
}

// Equipment that the patient uses
export interface PatientEquipment {
  respirator: boolean;
  suctionMachine: boolean;
  feedingTube: boolean;
  wheelchair: boolean;
  hospitalBed: boolean;
  custom: string[]; // custom equipment names
}

// Emergency contact for alerts
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string; // E.164 format: +1234567890
  relationship: string; // e.g., "spouse", "caregiver", "nurse"
}

// Patient profile for personalized responses
export interface PatientProfile {
  name: string;
  personality: string; // e.g., "friendly and warm", "formal and professional"
  interests: string; // comma-separated interests
  commonTopics: string; // things they often talk about
  relationships: string; // e.g., "spouse: Maria, children: John and Sarah"
  additionalContext: string; // any other relevant context
  equipment: PatientEquipment; // medical equipment the patient uses
  emergencyContacts: EmergencyContact[]; // people to alert in emergency
}

interface AppState {
  // Input
  inputText: string;
  setInputText: (text: string) => void;

  // Suggestions
  suggestions: Suggestion[];
  setSuggestions: (suggestions: Suggestion[]) => void;
  clearSuggestions: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Conversation history (for context)
  conversationHistory: ConversationMessage[];
  addToHistory: (message: ConversationMessage) => void;
  clearHistory: () => void;

  // Voice settings (persisted)
  voiceProvider: VoiceProvider;
  setVoiceProvider: (provider: VoiceProvider) => void;
  voiceId: string | null; // ElevenLabs voice ID
  setVoiceId: (id: string | null) => void;
  voiceName: string | null; // Display name for the voice
  setVoiceName: (name: string | null) => void;

  // Currently speaking
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;

  // Listening mode
  isListening: boolean;
  setIsListening: (listening: boolean) => void;

  // Conversation mode (continuous conversation with auto-listen)
  isInConversationMode: boolean;
  setConversationMode: (active: boolean) => void;
  conversationStartTime: number | null;
  lastOtherPersonMessage: string | null; // What they just said
  setLastOtherPersonMessage: (message: string | null) => void;
  endConversation: () => void;

  // Accessibility
  inputMode: 'keyboard' | 'eyegaze' | 'switch' | 'voice';
  setInputMode: (mode: 'keyboard' | 'eyegaze' | 'switch' | 'voice') => void;

  // Quick phrases (persisted)
  quickPhrases: QuickPhrase[];
  addQuickPhrase: (phrase: Omit<QuickPhrase, 'id'>) => void;
  removeQuickPhrase: (id: string) => void;

  // Patient profile (persisted)
  patientProfile: PatientProfile;
  setPatientProfile: (profile: Partial<PatientProfile>) => void;

  // UI settings (persisted)
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  largeText: boolean;
  setLargeText: (enabled: boolean) => void;

  // Onboarding (persisted)
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Voice banner (persisted)
  dismissedVoiceBanner: boolean;
  setDismissedVoiceBanner: (dismissed: boolean) => void;
}

// Default quick phrases
const DEFAULT_QUICK_PHRASES: QuickPhrase[] = [
  { id: 'qp-1', text: 'Yes', category: 'Basic' },
  { id: 'qp-2', text: 'No', category: 'Basic' },
  { id: 'qp-3', text: 'Thank you', category: 'Basic' },
  { id: 'qp-4', text: 'I need help', category: 'Needs' },
  { id: 'qp-5', text: 'I need to go to the bathroom', category: 'Needs' },
  { id: 'qp-6', text: 'I am in pain', category: 'Needs' },
  { id: 'qp-7', text: 'I am thirsty', category: 'Needs' },
  { id: 'qp-8', text: 'I am hungry', category: 'Needs' },
  { id: 'qp-9', text: 'I love you', category: 'Social' },
  { id: 'qp-10', text: 'How are you?', category: 'Social' },
];

const DEFAULT_EQUIPMENT: PatientEquipment = {
  respirator: false,
  suctionMachine: false,
  feedingTube: false,
  wheelchair: false,
  hospitalBed: false,
  custom: [],
};

const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  name: '',
  personality: '',
  interests: '',
  commonTopics: '',
  relationships: '',
  additionalContext: '',
  equipment: DEFAULT_EQUIPMENT,
  emergencyContacts: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Input
      inputText: '',
      setInputText: (text) => set({ inputText: text }),

      // Suggestions
      suggestions: [],
      setSuggestions: (suggestions) => set({ suggestions }),
      clearSuggestions: () => set({ suggestions: [] }),

      // Loading state
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Error state
      error: null,
      setError: (error) => set({ error }),

      // Conversation history
      conversationHistory: [],
      addToHistory: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory.slice(-20), message],
        })),
      clearHistory: () => set({ conversationHistory: [] }),

      // Voice settings
      voiceProvider: 'browser',
      setVoiceProvider: (provider) => set({ voiceProvider: provider }),
      voiceId: null,
      setVoiceId: (id) => set({ voiceId: id }),
      voiceName: null,
      setVoiceName: (name) => set({ voiceName: name }),

      // Currently speaking
      isSpeaking: false,
      setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

      // Listening mode
      isListening: false,
      setIsListening: (listening) => set({ isListening: listening }),

      // Conversation mode
      isInConversationMode: false,
      setConversationMode: (active) =>
        set({
          isInConversationMode: active,
          conversationStartTime: active ? Date.now() : null,
        }),
      conversationStartTime: null,
      lastOtherPersonMessage: null,
      setLastOtherPersonMessage: (message) => set({ lastOtherPersonMessage: message }),
      endConversation: () =>
        set({
          isInConversationMode: false,
          conversationStartTime: null,
          lastOtherPersonMessage: null,
          isListening: false,
        }),

      // Accessibility
      inputMode: 'keyboard',
      setInputMode: (mode) => set({ inputMode: mode }),

      // Quick phrases
      quickPhrases: DEFAULT_QUICK_PHRASES,
      addQuickPhrase: (phrase) =>
        set((state) => ({
          quickPhrases: [
            ...state.quickPhrases,
            { ...phrase, id: `qp-${Date.now()}` },
          ],
        })),
      removeQuickPhrase: (id) =>
        set((state) => ({
          quickPhrases: state.quickPhrases.filter((p) => p.id !== id),
        })),

      // Patient profile
      patientProfile: DEFAULT_PATIENT_PROFILE,
      setPatientProfile: (profile) =>
        set((state) => ({
          patientProfile: { ...state.patientProfile, ...profile },
        })),

      // UI settings
      highContrast: false,
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      largeText: false,
      setLargeText: (enabled) => set({ largeText: enabled }),

      // Onboarding
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),

      // Voice banner
      dismissedVoiceBanner: false,
      setDismissedVoiceBanner: (dismissed) => set({ dismissedVoiceBanner: dismissed }),
    }),
    {
      name: 'als-communicator-storage',
      partialize: (state) => ({
        voiceProvider: state.voiceProvider,
        voiceId: state.voiceId,
        voiceName: state.voiceName,
        quickPhrases: state.quickPhrases,
        patientProfile: state.patientProfile,
        highContrast: state.highContrast,
        largeText: state.largeText,
        inputMode: state.inputMode,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        dismissedVoiceBanner: state.dismissedVoiceBanner,
      }),
    }
  )
);
