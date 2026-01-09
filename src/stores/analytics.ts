import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Fixed categories for phrase organization
export type PhraseCategory =
  | 'greetings'
  | 'needs'
  | 'responses'
  | 'feelings'
  | 'requests'
  | 'social'
  | 'medical'
  | 'other';

// Phrase usage tracking
export interface PhraseUsage {
  text: string;
  useCount: number;
  lastUsed: number;
  hourlyUsage: { [hour: number]: number }; // 0-23
  category?: PhraseCategory; // LLM-assigned category
}

// Suggestion feedback
export interface SuggestionFeedback {
  accepted: number;
  rejected: number;
  editedBeforeSpeaking: number;
}

interface AnalyticsState {
  // Phrase usage tracking
  phraseUsage: { [phraseKey: string]: PhraseUsage };
  recordPhraseUsage: (text: string) => void;

  // Get top phrases for a specific hour (±1 hour window)
  getTopPhrasesForHour: (hour: number, limit?: number) => PhraseUsage[];

  // Get overall top phrases
  getTopPhrases: (limit?: number) => PhraseUsage[];

  // Category management
  setCategoryForPhrase: (text: string, category: PhraseCategory) => void;
  setCategoriesForPhrases: (categories: { [phrase: string]: PhraseCategory }) => void;
  getUncategorizedPhrases: () => PhraseUsage[];
  getPhrasesByCategory: () => { [category in PhraseCategory]?: PhraseUsage[] };

  // Style learning - recent phrases for few-shot prompting
  recentPhrases: string[];
  getRecentPhrases: (limit?: number) => string[];

  // Suggestion feedback
  suggestionFeedback: SuggestionFeedback;
  recordSuggestionAccepted: () => void;
  recordSuggestionRejected: () => void;
  recordSuggestionEdited: () => void;

  // Time period helpers
  getTimeOfDay: () => 'morning' | 'afternoon' | 'evening' | 'night';

  // Reset analytics
  resetAnalytics: () => void;
}

// Normalize phrase for consistent keying
function normalizePhraseKey(text: string): string {
  return text.toLowerCase().trim();
}

// Get time of day category
function getTimeOfDayCategory(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const DEFAULT_FEEDBACK: SuggestionFeedback = {
  accepted: 0,
  rejected: 0,
  editedBeforeSpeaking: 0,
};

// Maximum recent phrases to store for style learning
const MAX_RECENT_PHRASES = 20;

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Phrase usage
      phraseUsage: {},

      // Recent phrases for style learning (ordered, most recent first)
      recentPhrases: [],

      recordPhraseUsage: (text: string) => {
        const key = normalizePhraseKey(text);
        const hour = new Date().getHours();
        const now = Date.now();
        const trimmedText = text.trim();

        set((state) => {
          const existing = state.phraseUsage[key];
          const hourlyUsage = existing?.hourlyUsage || {};

          // Update recent phrases for style learning
          // Remove duplicate if exists, then add to front
          const filteredRecent = state.recentPhrases.filter(
            (p) => normalizePhraseKey(p) !== key
          );
          const newRecentPhrases = [trimmedText, ...filteredRecent].slice(0, MAX_RECENT_PHRASES);

          return {
            phraseUsage: {
              ...state.phraseUsage,
              [key]: {
                text: trimmedText, // Keep original casing
                useCount: (existing?.useCount || 0) + 1,
                lastUsed: now,
                hourlyUsage: {
                  ...hourlyUsage,
                  [hour]: (hourlyUsage[hour] || 0) + 1,
                },
              },
            },
            recentPhrases: newRecentPhrases,
          };
        });
      },

      getRecentPhrases: (limit = 5) => {
        const { recentPhrases } = get();
        return recentPhrases.slice(0, limit);
      },

      getTopPhrasesForHour: (hour: number, limit = 10) => {
        const { phraseUsage } = get();
        const phrases = Object.values(phraseUsage);

        // Score phrases by their usage in the hour window (hour ± 1)
        const scored = phrases.map((phrase) => {
          const hourlyUsage = phrase.hourlyUsage || {};
          const windowScore =
            (hourlyUsage[(hour - 1 + 24) % 24] || 0) +
            (hourlyUsage[hour] || 0) * 2 + // Weight current hour more
            (hourlyUsage[(hour + 1) % 24] || 0);

          // Combine with recency (decay over 7 days)
          const daysSinceUse = (Date.now() - phrase.lastUsed) / (1000 * 60 * 60 * 24);
          const recencyBoost = Math.max(0, 1 - daysSinceUse / 7);

          return {
            ...phrase,
            score: windowScore * (1 + recencyBoost) + phrase.useCount * 0.1,
          };
        });

        return scored
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },

      getTopPhrases: (limit = 10) => {
        const { phraseUsage } = get();
        const phrases = Object.values(phraseUsage);

        return phrases
          .sort((a, b) => {
            // Sort by use count, then by recency
            if (b.useCount !== a.useCount) {
              return b.useCount - a.useCount;
            }
            return b.lastUsed - a.lastUsed;
          })
          .slice(0, limit);
      },

      // Category management
      setCategoryForPhrase: (text: string, category: PhraseCategory) => {
        const key = normalizePhraseKey(text);
        set((state) => {
          const existing = state.phraseUsage[key];
          if (!existing) return state;

          return {
            phraseUsage: {
              ...state.phraseUsage,
              [key]: {
                ...existing,
                category,
              },
            },
          };
        });
      },

      setCategoriesForPhrases: (categories: { [phrase: string]: PhraseCategory }) => {
        set((state) => {
          const updatedPhraseUsage = { ...state.phraseUsage };

          for (const [phrase, category] of Object.entries(categories)) {
            const key = normalizePhraseKey(phrase);
            if (updatedPhraseUsage[key]) {
              updatedPhraseUsage[key] = {
                ...updatedPhraseUsage[key],
                category,
              };
            }
          }

          return { phraseUsage: updatedPhraseUsage };
        });
      },

      getUncategorizedPhrases: () => {
        const { phraseUsage } = get();
        return Object.values(phraseUsage).filter((phrase) => !phrase.category);
      },

      getPhrasesByCategory: () => {
        const { phraseUsage } = get();
        const grouped: { [category in PhraseCategory]?: PhraseUsage[] } = {};

        for (const phrase of Object.values(phraseUsage)) {
          const category = phrase.category || 'other';
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category]!.push(phrase);
        }

        // Sort each category by use count
        for (const category of Object.keys(grouped) as PhraseCategory[]) {
          grouped[category]!.sort((a, b) => b.useCount - a.useCount);
        }

        return grouped;
      },

      // Suggestion feedback
      suggestionFeedback: DEFAULT_FEEDBACK,

      recordSuggestionAccepted: () => {
        set((state) => ({
          suggestionFeedback: {
            ...state.suggestionFeedback,
            accepted: state.suggestionFeedback.accepted + 1,
          },
        }));
      },

      recordSuggestionRejected: () => {
        set((state) => ({
          suggestionFeedback: {
            ...state.suggestionFeedback,
            rejected: state.suggestionFeedback.rejected + 1,
          },
        }));
      },

      recordSuggestionEdited: () => {
        set((state) => ({
          suggestionFeedback: {
            ...state.suggestionFeedback,
            editedBeforeSpeaking: state.suggestionFeedback.editedBeforeSpeaking + 1,
          },
        }));
      },

      // Time of day helper
      getTimeOfDay: () => {
        const hour = new Date().getHours();
        return getTimeOfDayCategory(hour);
      },

      // Reset
      resetAnalytics: () => {
        set({
          phraseUsage: {},
          recentPhrases: [],
          suggestionFeedback: DEFAULT_FEEDBACK,
        });
      },
    }),
    {
      name: 'als-communicator-analytics',
      partialize: (state) => ({
        phraseUsage: state.phraseUsage,
        recentPhrases: state.recentPhrases,
        suggestionFeedback: state.suggestionFeedback,
      }),
    }
  )
);
