// Intelligent phrase system for ALS communicator
// Phrases are filtered based on: equipment, time of day, and learned patterns

import { PatientEquipment } from '@/stores/app';

export interface SmartPhrase {
  id: string;
  text: string;
  category: string;
  // Optional filters
  equipment?: keyof PatientEquipment; // Only show if patient has this equipment
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'; // When to show
  priority?: number; // Higher = more important (1-10)
}

// All available phrases organized by category
export const ALL_PHRASES: SmartPhrase[] = [
  // ==================== BASIC ====================
  { id: 'basic-1', text: 'Yes', category: 'Basic', priority: 10 },
  { id: 'basic-1a', text: 'Yes, please', category: 'Basic', priority: 10 },
  { id: 'basic-2', text: 'No', category: 'Basic', priority: 10 },
  { id: 'basic-2a', text: 'No, thank you', category: 'Basic', priority: 10 },
  { id: 'basic-3', text: 'Thank you', category: 'Basic', priority: 9 },
  { id: 'basic-4', text: 'Please', category: 'Basic', priority: 8 },
  { id: 'basic-5', text: 'I don\'t know', category: 'Basic', priority: 7 },
  { id: 'basic-6', text: 'Maybe', category: 'Basic', priority: 7 },
  { id: 'basic-7', text: 'Wait a moment', category: 'Basic', priority: 8 },

  // ==================== NEEDS ====================
  { id: 'needs-1', text: 'I need help', category: 'Needs', priority: 10 },
  { id: 'needs-2', text: 'I need to go to the bathroom', category: 'Needs', priority: 9 },
  { id: 'needs-3', text: 'I am in pain', category: 'Needs', priority: 10 },
  { id: 'needs-4', text: 'I am thirsty', category: 'Needs', priority: 8 },
  { id: 'needs-5', text: 'I am hungry', category: 'Needs', priority: 8 },
  { id: 'needs-6', text: 'I am cold', category: 'Needs', priority: 7 },
  { id: 'needs-7', text: 'I am hot', category: 'Needs', priority: 7 },
  { id: 'needs-8', text: 'I need rest', category: 'Needs', priority: 9 },
  { id: 'needs-9', text: 'I can\'t breathe well', category: 'Needs', priority: 10 },

  // ==================== POSITIONING ====================
  { id: 'pos-1', text: 'Please adjust my position', category: 'Positioning', priority: 9 },
  { id: 'pos-2', text: 'I need to sit up', category: 'Positioning', priority: 8 },
  { id: 'pos-3', text: 'I need to lie down', category: 'Positioning', priority: 8 },
  { id: 'pos-4', text: 'Please turn me over', category: 'Positioning', priority: 8 },
  { id: 'pos-5', text: 'My head needs adjusting', category: 'Positioning', priority: 7 },
  { id: 'pos-6', text: 'Please raise my legs', category: 'Positioning', priority: 7 },
  { id: 'pos-7', text: 'I\'m uncomfortable', category: 'Positioning', priority: 8 },

  // ==================== RESPIRATOR/BREATHING ====================
  { id: 'resp-1', text: 'I need suctioning', category: 'Breathing', equipment: 'suctionMachine', priority: 10 },
  { id: 'resp-2', text: 'Please adjust my mask', category: 'Breathing', equipment: 'respirator', priority: 9 },
  { id: 'resp-3', text: 'The pressure feels wrong', category: 'Breathing', equipment: 'respirator', priority: 9 },
  { id: 'resp-4', text: 'I need the respirator', category: 'Breathing', equipment: 'respirator', priority: 10 },
  { id: 'resp-5', text: 'Please check the oxygen', category: 'Breathing', equipment: 'respirator', priority: 9 },
  { id: 'resp-6', text: 'The mask is uncomfortable', category: 'Breathing', equipment: 'respirator', priority: 8 },
  { id: 'resp-7', text: 'I need to cough', category: 'Breathing', priority: 8 },

  // ==================== FEEDING TUBE ====================
  { id: 'feed-1', text: 'I need my feeding', category: 'Feeding', equipment: 'feedingTube', priority: 9 },
  { id: 'feed-2', text: 'Please flush my tube', category: 'Feeding', equipment: 'feedingTube', priority: 8 },
  { id: 'feed-3', text: 'The tube is bothering me', category: 'Feeding', equipment: 'feedingTube', priority: 8 },
  { id: 'feed-4', text: 'I need my medication through the tube', category: 'Feeding', equipment: 'feedingTube', priority: 9 },
  { id: 'feed-5', text: 'Please check the feeding pump', category: 'Feeding', equipment: 'feedingTube', priority: 7 },

  // ==================== WHEELCHAIR ====================
  { id: 'wheel-1', text: 'Please take me to another room', category: 'Mobility', equipment: 'wheelchair', priority: 8 },
  { id: 'wheel-2', text: 'I want to go outside', category: 'Mobility', equipment: 'wheelchair', priority: 7 },
  { id: 'wheel-3', text: 'Please adjust my wheelchair', category: 'Mobility', equipment: 'wheelchair', priority: 8 },
  { id: 'wheel-4', text: 'Can we go for a walk?', category: 'Mobility', equipment: 'wheelchair', priority: 6 },

  // ==================== HOSPITAL BED ====================
  { id: 'bed-1', text: 'Please raise the bed', category: 'Bed', equipment: 'hospitalBed', priority: 8 },
  { id: 'bed-2', text: 'Please lower the bed', category: 'Bed', equipment: 'hospitalBed', priority: 8 },
  { id: 'bed-3', text: 'Please adjust the bed angle', category: 'Bed', equipment: 'hospitalBed', priority: 7 },
  { id: 'bed-4', text: 'The bed rails need adjusting', category: 'Bed', equipment: 'hospitalBed', priority: 6 },

  // ==================== SOCIAL ====================
  { id: 'social-1', text: 'I love you', category: 'Social', priority: 9 },
  { id: 'social-2', text: 'How are you?', category: 'Social', priority: 7 },
  { id: 'social-3', text: 'Tell me about your day', category: 'Social', priority: 6 },
  { id: 'social-4', text: 'I miss you', category: 'Social', priority: 7 },
  { id: 'social-5', text: 'Thank you for being here', category: 'Social', priority: 8 },
  { id: 'social-6', text: 'Can we talk?', category: 'Social', priority: 7 },
  { id: 'social-7', text: 'I\'m happy to see you', category: 'Social', priority: 7 },

  // ==================== MORNING SPECIFIC ====================
  { id: 'morn-1', text: 'Good morning', category: 'Greetings', timeOfDay: 'morning', priority: 9 },
  { id: 'morn-2', text: 'I need my morning medication', category: 'Morning', timeOfDay: 'morning', priority: 9 },
  { id: 'morn-3', text: 'How did you sleep?', category: 'Morning', timeOfDay: 'morning', priority: 6 },
  { id: 'morn-4', text: 'What\'s the plan for today?', category: 'Morning', timeOfDay: 'morning', priority: 6 },
  { id: 'morn-5', text: 'I need to get dressed', category: 'Morning', timeOfDay: 'morning', priority: 7 },

  // ==================== AFTERNOON SPECIFIC ====================
  { id: 'aftn-1', text: 'Good afternoon', category: 'Greetings', timeOfDay: 'afternoon', priority: 8 },
  { id: 'aftn-2', text: 'I need my afternoon medication', category: 'Afternoon', timeOfDay: 'afternoon', priority: 9 },
  { id: 'aftn-3', text: 'Can we watch something?', category: 'Afternoon', timeOfDay: 'afternoon', priority: 5 },

  // ==================== EVENING SPECIFIC ====================
  { id: 'eve-1', text: 'Good evening', category: 'Greetings', timeOfDay: 'evening', priority: 8 },
  { id: 'eve-2', text: 'I\'m tired', category: 'Evening', timeOfDay: 'evening', priority: 8 },
  { id: 'eve-3', text: 'I need my evening medication', category: 'Evening', timeOfDay: 'evening', priority: 9 },
  { id: 'eve-4', text: 'Can we watch TV?', category: 'Evening', timeOfDay: 'evening', priority: 5 },
  { id: 'eve-5', text: 'Let\'s talk later', category: 'Evening', timeOfDay: 'evening', priority: 7 },

  // ==================== NIGHT SPECIFIC ====================
  { id: 'night-1', text: 'Good night', category: 'Greetings', timeOfDay: 'night', priority: 9 },
  { id: 'night-2', text: 'I\'m ready for bed', category: 'Night', timeOfDay: 'night', priority: 8 },
  { id: 'night-3', text: 'Please turn off the lights', category: 'Night', timeOfDay: 'night', priority: 7 },
  { id: 'night-4', text: 'I can\'t sleep', category: 'Night', timeOfDay: 'night', priority: 8 },
  { id: 'night-5', text: 'I need something to help me sleep', category: 'Night', timeOfDay: 'night', priority: 7 },

  // ==================== EMERGENCY ====================
  { id: 'emerg-1', text: 'Call for help!', category: 'Emergency', priority: 10 },
  { id: 'emerg-2', text: 'I need a doctor', category: 'Emergency', priority: 10 },
  { id: 'emerg-3', text: 'Something is wrong', category: 'Emergency', priority: 10 },
  { id: 'emerg-4', text: 'Call 911', category: 'Emergency', priority: 10 },
];

// Get current time of day
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Filter and prioritize phrases based on patient context
export function getSmartPhrases(
  equipment: PatientEquipment,
  learnedPhraseIds?: string[], // IDs of frequently used phrases
  maxPhrases: number = 20
): SmartPhrase[] {
  const currentTime = getTimeOfDay();

  // Filter phrases
  const filtered = ALL_PHRASES.filter((phrase) => {
    // Equipment filter: only show if patient has the equipment OR no equipment required
    if (phrase.equipment && !equipment[phrase.equipment]) {
      return false;
    }
    return true;
  });

  // Score and sort phrases
  const scored = filtered.map((phrase) => {
    let score = phrase.priority || 5;

    // Boost time-appropriate phrases
    if (phrase.timeOfDay === currentTime) {
      score += 3;
    } else if (phrase.timeOfDay && phrase.timeOfDay !== currentTime) {
      score -= 2; // Slightly penalize wrong time-of-day phrases
    }

    // Boost learned/frequently used phrases
    if (learnedPhraseIds?.includes(phrase.id)) {
      score += 4;
    }

    // Emergency always on top
    if (phrase.category === 'Emergency') {
      score += 5;
    }

    return { ...phrase, score };
  });

  // Sort by score (descending) and return top phrases
  return scored
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxPhrases)
    .map(({ score, ...phrase }) => phrase); // Remove score from output
}

// Get phrases grouped by category (for display)
export function getPhrasesByCategory(
  equipment: PatientEquipment,
  learnedPhraseIds?: string[]
): Record<string, SmartPhrase[]> {
  const phrases = getSmartPhrases(equipment, learnedPhraseIds, 50);

  const grouped: Record<string, SmartPhrase[]> = {};
  for (const phrase of phrases) {
    if (!grouped[phrase.category]) {
      grouped[phrase.category] = [];
    }
    grouped[phrase.category].push(phrase);
  }

  return grouped;
}

// Category display order (most important first)
export const CATEGORY_ORDER = [
  'Emergency',
  'Basic',
  'Needs',
  'Breathing',
  'Feeding',
  'Positioning',
  'Mobility',
  'Bed',
  'Morning',
  'Afternoon',
  'Evening',
  'Night',
  'Greetings',
  'Social',
];
