import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPredictionPrompt, buildResponsePrompt } from './prompts';
import { PatientProfile, ConversationMessage } from '@/stores/app';

describe('Prompts Module', () => {
  // Mock Date to have consistent time in tests
  const mockDate = new Date('2024-01-15T10:30:00');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buildPredictionPrompt', () => {
    it('includes time context', () => {
      const prompt = buildPredictionPrompt('water');

      expect(prompt).toContain('morning');
      expect(prompt).toContain('10:00');
    });

    it('includes the input text', () => {
      const prompt = buildPredictionPrompt('I need help');

      expect(prompt).toContain('I need help');
    });

    it('includes patient profile when provided', () => {
      const profile: PatientProfile = {
        name: 'John',
        personality: 'friendly and warm',
        interests: 'gardening, reading',
        commonTopics: 'family',
        relationships: 'wife: Mary',
        additionalContext: 'loves jazz music',
        equipment: {
          respirator: false,
          suctionMachine: false,
          feedingTube: false,
          wheelchair: false,
          hospitalBed: false,
          custom: [],
        },
      };

      const prompt = buildPredictionPrompt('hello', [], profile);

      expect(prompt).toContain('John');
      expect(prompt).toContain('friendly and warm');
      expect(prompt).toContain('gardening');
      expect(prompt).toContain('Mary');
    });

    it('includes equipment context when equipment is configured', () => {
      const profile: PatientProfile = {
        name: '',
        personality: '',
        interests: '',
        commonTopics: '',
        relationships: '',
        additionalContext: '',
        equipment: {
          respirator: true,
          suctionMachine: true,
          feedingTube: false,
          wheelchair: true,
          hospitalBed: false,
          custom: ['eye tracker'],
        },
      };

      const prompt = buildPredictionPrompt('help', [], profile);

      expect(prompt).toContain('respirator');
      expect(prompt).toContain('suction');
      expect(prompt).toContain('wheelchair');
      expect(prompt).toContain('eye tracker');
      expect(prompt).not.toContain('feeding tube');
    });

    it('includes conversation history when provided', () => {
      const history: ConversationMessage[] = [
        { role: 'patient', content: 'Good morning', timestamp: Date.now() - 60000 },
        { role: 'other', content: 'How are you feeling today?', timestamp: Date.now() - 30000 },
      ];

      const prompt = buildPredictionPrompt('tired', history);

      expect(prompt).toContain('Good morning');
      expect(prompt).toContain('How are you feeling today?');
      expect(prompt).toContain('Patient:');
      expect(prompt).toContain('Other person:');
    });

    it('asks for JSON array output', () => {
      const prompt = buildPredictionPrompt('water');

      expect(prompt).toContain('JSON array');
    });
  });

  describe('buildResponsePrompt', () => {
    it('includes time context', () => {
      const prompt = buildResponsePrompt('How did you sleep?');

      expect(prompt).toContain('morning');
      expect(prompt).toContain('10:00');
    });

    it('includes what the other person said', () => {
      const prompt = buildResponsePrompt('Would you like some water?');

      expect(prompt).toContain('Would you like some water?');
      expect(prompt).toContain('other person just said');
    });

    it('includes patient profile when provided', () => {
      const profile: PatientProfile = {
        name: 'Sarah',
        personality: 'direct and practical',
        interests: 'cooking',
        commonTopics: 'health',
        relationships: 'son: Tom',
        additionalContext: '',
        equipment: {
          respirator: false,
          suctionMachine: false,
          feedingTube: false,
          wheelchair: false,
          hospitalBed: false,
          custom: [],
        },
      };

      const prompt = buildResponsePrompt('Hello', [], profile);

      expect(prompt).toContain('Sarah');
      expect(prompt).toContain('direct and practical');
      expect(prompt).toContain('cooking');
      expect(prompt).toContain('Tom');
    });

    it('includes equipment context when configured', () => {
      const profile: PatientProfile = {
        name: '',
        personality: '',
        interests: '',
        commonTopics: '',
        relationships: '',
        additionalContext: '',
        equipment: {
          respirator: true,
          suctionMachine: false,
          feedingTube: true,
          wheelchair: false,
          hospitalBed: true,
          custom: [],
        },
      };

      const prompt = buildResponsePrompt('Are you comfortable?', [], profile);

      expect(prompt).toContain('respirator');
      expect(prompt).toContain('feeding tube');
      expect(prompt).toContain('hospital bed');
    });

    it('includes conversation history when provided', () => {
      const history: ConversationMessage[] = [
        { role: 'other', content: 'Good morning!', timestamp: Date.now() - 120000 },
        { role: 'patient', content: 'Good morning', timestamp: Date.now() - 90000 },
        { role: 'other', content: 'Did you sleep well?', timestamp: Date.now() - 60000 },
      ];

      const prompt = buildResponsePrompt('Would you like breakfast?', history);

      expect(prompt).toContain('Good morning!');
      expect(prompt).toContain('Did you sleep well?');
      expect(prompt).toContain('Conversation so far');
    });

    it('asks for JSON array output', () => {
      const prompt = buildResponsePrompt('Hello');

      expect(prompt).toContain('JSON array');
    });

    it('mentions time-relevant considerations', () => {
      const prompt = buildResponsePrompt('What would you like to do?');

      expect(prompt).toContain('time of day');
    });
  });

  describe('time of day detection', () => {
    it('detects morning (5am-12pm)', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'));
      const prompt = buildPredictionPrompt('hello');
      expect(prompt).toContain('morning');
    });

    it('detects afternoon (12pm-5pm)', () => {
      vi.setSystemTime(new Date('2024-01-15T14:00:00'));
      const prompt = buildPredictionPrompt('hello');
      expect(prompt).toContain('afternoon');
    });

    it('detects evening (5pm-9pm)', () => {
      vi.setSystemTime(new Date('2024-01-15T19:00:00'));
      const prompt = buildPredictionPrompt('hello');
      expect(prompt).toContain('evening');
    });

    it('detects night (9pm-5am)', () => {
      vi.setSystemTime(new Date('2024-01-15T23:00:00'));
      const prompt = buildPredictionPrompt('hello');
      expect(prompt).toContain('night');
    });
  });

  describe('equipment formatting', () => {
    it('formats multiple equipment items with commas', () => {
      const profile: PatientProfile = {
        name: '',
        personality: '',
        interests: '',
        commonTopics: '',
        relationships: '',
        additionalContext: '',
        equipment: {
          respirator: true,
          suctionMachine: true,
          feedingTube: true,
          wheelchair: true,
          hospitalBed: true,
          custom: ['communication board'],
        },
      };

      const prompt = buildPredictionPrompt('help', [], profile);

      // Should contain all equipment
      expect(prompt).toContain('respirator');
      expect(prompt).toContain('suction');
      expect(prompt).toContain('feeding tube');
      expect(prompt).toContain('wheelchair');
      expect(prompt).toContain('hospital bed');
      expect(prompt).toContain('communication board');
    });

    it('omits equipment section when no equipment configured', () => {
      const profile: PatientProfile = {
        name: 'Test',
        personality: '',
        interests: '',
        commonTopics: '',
        relationships: '',
        additionalContext: '',
        equipment: {
          respirator: false,
          suctionMachine: false,
          feedingTube: false,
          wheelchair: false,
          hospitalBed: false,
          custom: [],
        },
      };

      const prompt = buildPredictionPrompt('help', [], profile);

      expect(prompt).not.toContain('Medical equipment');
    });
  });
});
