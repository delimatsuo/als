import { PatientProfile, ConversationMessage, PatientEquipment } from '@/stores/app';

// System prompt for expanding a word/phrase into full sentences
export const AAC_SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) assistant helping someone with ALS communicate more easily and quickly.

When the user provides a word or phrase, suggest 3-5 complete sentences they might want to say. Consider:

1. Most common/likely intent first
2. Mix of questions and statements
3. Urgency level (immediate needs vs general requests)
4. Social appropriateness

IMPORTANT: Return ONLY a JSON array of strings. No explanation, no markdown, just the JSON array.

Example:
Input: "water"
Output: ["I would like some water, please", "Can you bring me water?", "Is there water available?", "The water needs to be refilled"]

Guidelines for suggestions:
- Keep them natural and conversational
- Maintain the user's dignity - avoid infantilizing language
- Vary sentence structures (don't start them all the same way)
- Include both polite requests and direct statements
- Consider context from previous messages if provided

If the input is very specific or a complete thought, still provide variations:
- Different levels of politeness
- Question vs statement forms
- With/without additional context`;

// System prompt for generating responses to what the other person said
export const RESPONSE_SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) assistant helping someone with ALS respond in a conversation.

The other person in the conversation has just spoken, and you need to suggest 3-5 appropriate responses that the ALS user might want to say.

Consider:
1. The most natural and likely response to what was said
2. Different emotional tones (positive, neutral, curious, etc.)
3. Mix of short and longer responses
4. Follow-up questions when appropriate
5. The user's personality and context if provided

IMPORTANT: Return ONLY a JSON array of strings. No explanation, no markdown, just the JSON array.

Guidelines for responses:
- Make responses feel natural and conversational
- Maintain the user's personality and communication style
- Vary response lengths and types
- Include appropriate emotional responses when relevant
- Consider the relationship context if provided`;

// Build prompt for expanding a word/phrase
export const buildPredictionPrompt = (
  input: string,
  conversationHistory?: ConversationMessage[],
  patientProfile?: PatientProfile,
  recentPhrases?: string[]
): string => {
  let prompt = '';

  // Add time context
  const { timeOfDay, hour } = getTimeContext();
  prompt += `Current context: It is ${timeOfDay} (${hour}:00 hours).\n\n`;

  // Add patient context if available
  if (patientProfile && hasProfileContent(patientProfile)) {
    prompt += 'About the user:\n';
    if (patientProfile.name) prompt += `- Name: ${patientProfile.name}\n`;
    if (patientProfile.personality) prompt += `- Personality: ${patientProfile.personality}\n`;
    if (patientProfile.interests) prompt += `- Interests: ${patientProfile.interests}\n`;
    if (patientProfile.relationships) prompt += `- Relationships: ${patientProfile.relationships}\n`;
    if (patientProfile.additionalContext) prompt += `- Additional context: ${patientProfile.additionalContext}\n`;

    // Add equipment context
    const equipmentStr = formatEquipment(patientProfile.equipment);
    if (equipmentStr) {
      prompt += `- Medical equipment used: ${equipmentStr}\n`;
      prompt += `  (Consider equipment-related needs when the input might relate to physical comfort or medical needs)\n`;
    }
    prompt += '\n';
  }

  // Add style examples from recent phrases (few-shot learning)
  if (recentPhrases && recentPhrases.length > 0) {
    prompt += `The patient's communication style (learn from these examples):\n`;
    prompt += `Recent things they've said: "${recentPhrases.join('", "')}"\n`;
    prompt += `Match this style in your suggestions - similar length, tone, and vocabulary.\n\n`;
  }

  // Add conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += 'Recent conversation:\n';
    conversationHistory.forEach((msg) => {
      const speaker = msg.role === 'patient' ? 'Patient' : 'Other person';
      prompt += `${speaker}: "${msg.content}"\n`;
    });
    prompt += '\n';
  }

  prompt += `Now the patient wants to communicate about: "${input}"\n\n`;
  prompt += `Consider the time of day (${timeOfDay}) when suggesting - for example, morning routines, medication times, meal times, or bedtime needs may be relevant.\n\n`;
  prompt += `Provide 3-5 complete sentence suggestions as a JSON array.`;

  return prompt;
};

// Build prompt for generating responses to what the other person said
export const buildResponsePrompt = (
  otherPersonSaid: string,
  conversationHistory?: ConversationMessage[],
  patientProfile?: PatientProfile,
  recentPhrases?: string[]
): string => {
  let prompt = '';

  // Add time context
  const { timeOfDay, hour } = getTimeContext();
  prompt += `Current context: It is ${timeOfDay} (${hour}:00 hours).\n\n`;

  // Add patient context if available
  if (patientProfile && hasProfileContent(patientProfile)) {
    prompt += 'About the patient:\n';
    if (patientProfile.name) prompt += `- Name: ${patientProfile.name}\n`;
    if (patientProfile.personality) prompt += `- Communication style: ${patientProfile.personality}\n`;
    if (patientProfile.interests) prompt += `- Interests: ${patientProfile.interests}\n`;
    if (patientProfile.commonTopics) prompt += `- Common topics: ${patientProfile.commonTopics}\n`;
    if (patientProfile.relationships) prompt += `- Relationships: ${patientProfile.relationships}\n`;
    if (patientProfile.additionalContext) prompt += `- Additional context: ${patientProfile.additionalContext}\n`;

    // Add equipment context
    const equipmentStr = formatEquipment(patientProfile.equipment);
    if (equipmentStr) {
      prompt += `- Medical equipment used: ${equipmentStr}\n`;
      prompt += `  (The patient may need to mention equipment-related needs in responses)\n`;
    }
    prompt += '\n';
  }

  // Add style examples from recent phrases (few-shot learning)
  if (recentPhrases && recentPhrases.length > 0) {
    prompt += `The patient's communication style (learn from these examples):\n`;
    prompt += `Recent things they've said: "${recentPhrases.join('", "')}"\n`;
    prompt += `Match this style in your suggestions - similar length, tone, and vocabulary.\n\n`;
  }

  // Add conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    prompt += 'Conversation so far:\n';
    conversationHistory.forEach((msg) => {
      const speaker = msg.role === 'patient' ? 'Patient' : 'Other person';
      prompt += `${speaker}: "${msg.content}"\n`;
    });
    prompt += '\n';
  }

  prompt += `The other person just said: "${otherPersonSaid}"\n\n`;
  prompt += `Generate 3-5 natural response options that the patient might want to say. Consider:
- What would be the most natural reply?
- What follow-up questions might be relevant?
- What emotional responses might be appropriate?
- The time of day (${timeOfDay}) - responses might relate to current activities or needs

Return ONLY a JSON array of response strings.`;

  return prompt;
};

// Helper to check if profile has any content
function hasProfileContent(profile: PatientProfile): boolean {
  return !!(
    profile.name ||
    profile.personality ||
    profile.interests ||
    profile.commonTopics ||
    profile.relationships ||
    profile.additionalContext ||
    hasEquipment(profile.equipment)
  );
}

// Helper to check if any equipment is configured
function hasEquipment(equipment?: PatientEquipment): boolean {
  if (!equipment) return false;
  return (
    equipment.respirator ||
    equipment.suctionMachine ||
    equipment.feedingTube ||
    equipment.wheelchair ||
    equipment.hospitalBed ||
    equipment.custom.length > 0
  );
}

// Get time of day context
function getTimeContext(): { timeOfDay: string; hour: number } {
  const hour = new Date().getHours();
  let timeOfDay: string;

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  return { timeOfDay, hour };
}

// Format equipment for prompt
function formatEquipment(equipment?: PatientEquipment): string {
  if (!equipment) return '';

  const items: string[] = [];

  if (equipment.respirator) items.push('respirator/BiPAP');
  if (equipment.suctionMachine) items.push('suction machine');
  if (equipment.feedingTube) items.push('feeding tube (PEG/G-tube)');
  if (equipment.wheelchair) items.push('wheelchair');
  if (equipment.hospitalBed) items.push('hospital bed with controls');

  if (equipment.custom.length > 0) {
    items.push(...equipment.custom);
  }

  return items.join(', ');
}
