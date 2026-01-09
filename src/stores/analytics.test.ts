import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalyticsStore } from './analytics';

describe('Analytics Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAnalyticsStore.setState({
      phraseUsage: {},
      suggestionFeedback: {
        accepted: 0,
        rejected: 0,
        editedBeforeSpeaking: 0,
      },
    });
  });

  describe('recordPhraseUsage', () => {
    it('records a new phrase with use count of 1', () => {
      const { recordPhraseUsage } = useAnalyticsStore.getState();

      recordPhraseUsage('Hello world');

      const state = useAnalyticsStore.getState();
      const key = 'hello world'; // normalized
      expect(state.phraseUsage[key]).toBeDefined();
      expect(state.phraseUsage[key].useCount).toBe(1);
      expect(state.phraseUsage[key].text).toBe('Hello world');
    });

    it('increments use count for existing phrase', () => {
      const { recordPhraseUsage } = useAnalyticsStore.getState();

      recordPhraseUsage('Hello world');
      recordPhraseUsage('Hello world');
      recordPhraseUsage('hello world'); // same phrase, different case

      const state = useAnalyticsStore.getState();
      const key = 'hello world';
      expect(state.phraseUsage[key].useCount).toBe(3);
    });

    it('tracks hourly usage', () => {
      const { recordPhraseUsage } = useAnalyticsStore.getState();
      const currentHour = new Date().getHours();

      recordPhraseUsage('Good morning');
      recordPhraseUsage('Good morning');

      const state = useAnalyticsStore.getState();
      const key = 'good morning';
      expect(state.phraseUsage[key].hourlyUsage[currentHour]).toBe(2);
    });

    it('preserves original text casing', () => {
      const { recordPhraseUsage } = useAnalyticsStore.getState();

      recordPhraseUsage('I Need Help');

      const state = useAnalyticsStore.getState();
      const key = 'i need help';
      expect(state.phraseUsage[key].text).toBe('I Need Help');
    });
  });

  describe('getTopPhrasesForHour', () => {
    it('returns empty array when no phrases recorded', () => {
      const { getTopPhrasesForHour } = useAnalyticsStore.getState();

      const result = getTopPhrasesForHour(10);

      expect(result).toEqual([]);
    });

    it('returns phrases sorted by score', () => {
      // Set up phrases with different use counts
      useAnalyticsStore.setState({
        phraseUsage: {
          'hello': {
            text: 'Hello',
            useCount: 5,
            lastUsed: Date.now(),
            hourlyUsage: { 10: 3 },
          },
          'goodbye': {
            text: 'Goodbye',
            useCount: 10,
            lastUsed: Date.now(),
            hourlyUsage: { 10: 1 },
          },
          'morning': {
            text: 'Good morning',
            useCount: 3,
            lastUsed: Date.now(),
            hourlyUsage: { 10: 5 },
          },
        },
      });

      const { getTopPhrasesForHour } = useAnalyticsStore.getState();
      const result = getTopPhrasesForHour(10, 3);

      expect(result.length).toBe(3);
      // The one with highest hourly usage for hour 10 should score higher
      expect(result[0].text).toBe('Good morning');
    });

    it('considers adjacent hours in scoring', () => {
      useAnalyticsStore.setState({
        phraseUsage: {
          'breakfast': {
            text: 'I want breakfast',
            useCount: 2,
            lastUsed: Date.now(),
            hourlyUsage: { 8: 2, 9: 2, 10: 1 }, // Used around 9am
          },
          'lunch': {
            text: 'I want lunch',
            useCount: 2,
            lastUsed: Date.now(),
            hourlyUsage: { 12: 5 }, // Only used at noon
          },
        },
      });

      const { getTopPhrasesForHour } = useAnalyticsStore.getState();

      // At 9am, breakfast should score higher due to adjacent hour usage
      const result9am = getTopPhrasesForHour(9, 2);
      expect(result9am[0].text).toBe('I want breakfast');
    });

    it('respects limit parameter', () => {
      useAnalyticsStore.setState({
        phraseUsage: {
          'phrase1': { text: 'Phrase 1', useCount: 1, lastUsed: Date.now(), hourlyUsage: {} },
          'phrase2': { text: 'Phrase 2', useCount: 2, lastUsed: Date.now(), hourlyUsage: {} },
          'phrase3': { text: 'Phrase 3', useCount: 3, lastUsed: Date.now(), hourlyUsage: {} },
          'phrase4': { text: 'Phrase 4', useCount: 4, lastUsed: Date.now(), hourlyUsage: {} },
          'phrase5': { text: 'Phrase 5', useCount: 5, lastUsed: Date.now(), hourlyUsage: {} },
        },
      });

      const { getTopPhrasesForHour } = useAnalyticsStore.getState();
      const result = getTopPhrasesForHour(10, 3);

      expect(result.length).toBe(3);
    });
  });

  describe('getTopPhrases', () => {
    it('returns phrases sorted by use count', () => {
      useAnalyticsStore.setState({
        phraseUsage: {
          'low': { text: 'Low', useCount: 1, lastUsed: Date.now() - 1000, hourlyUsage: {} },
          'high': { text: 'High', useCount: 10, lastUsed: Date.now(), hourlyUsage: {} },
          'medium': { text: 'Medium', useCount: 5, lastUsed: Date.now(), hourlyUsage: {} },
        },
      });

      const { getTopPhrases } = useAnalyticsStore.getState();
      const result = getTopPhrases(3);

      expect(result[0].text).toBe('High');
      expect(result[1].text).toBe('Medium');
      expect(result[2].text).toBe('Low');
    });

    it('uses recency as tiebreaker', () => {
      const now = Date.now();
      useAnalyticsStore.setState({
        phraseUsage: {
          'older': { text: 'Older', useCount: 5, lastUsed: now - 10000, hourlyUsage: {} },
          'newer': { text: 'Newer', useCount: 5, lastUsed: now, hourlyUsage: {} },
        },
      });

      const { getTopPhrases } = useAnalyticsStore.getState();
      const result = getTopPhrases(2);

      expect(result[0].text).toBe('Newer');
      expect(result[1].text).toBe('Older');
    });
  });

  describe('suggestion feedback', () => {
    it('records accepted suggestions', () => {
      const { recordSuggestionAccepted } = useAnalyticsStore.getState();

      recordSuggestionAccepted();
      recordSuggestionAccepted();

      const state = useAnalyticsStore.getState();
      expect(state.suggestionFeedback.accepted).toBe(2);
    });

    it('records rejected suggestions', () => {
      const { recordSuggestionRejected } = useAnalyticsStore.getState();

      recordSuggestionRejected();

      const state = useAnalyticsStore.getState();
      expect(state.suggestionFeedback.rejected).toBe(1);
    });

    it('records edited suggestions', () => {
      const { recordSuggestionEdited } = useAnalyticsStore.getState();

      recordSuggestionEdited();
      recordSuggestionEdited();
      recordSuggestionEdited();

      const state = useAnalyticsStore.getState();
      expect(state.suggestionFeedback.editedBeforeSpeaking).toBe(3);
    });
  });

  describe('getTimeOfDay', () => {
    it('returns correct time period', () => {
      const { getTimeOfDay } = useAnalyticsStore.getState();
      const result = getTimeOfDay();

      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        expect(result).toBe('morning');
      } else if (hour >= 12 && hour < 17) {
        expect(result).toBe('afternoon');
      } else if (hour >= 17 && hour < 21) {
        expect(result).toBe('evening');
      } else {
        expect(result).toBe('night');
      }
    });
  });

  describe('resetAnalytics', () => {
    it('clears all analytics data', () => {
      // Set up some data
      const { recordPhraseUsage, recordSuggestionAccepted, resetAnalytics } = useAnalyticsStore.getState();
      recordPhraseUsage('Test phrase');
      recordSuggestionAccepted();

      // Reset
      resetAnalytics();

      const state = useAnalyticsStore.getState();
      expect(Object.keys(state.phraseUsage).length).toBe(0);
      expect(state.suggestionFeedback.accepted).toBe(0);
    });
  });
});
