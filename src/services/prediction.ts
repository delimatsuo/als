import { Suggestion, ConversationMessage, PatientProfile } from '@/stores/app';

interface BasePredictionRequest {
  conversationHistory?: ConversationMessage[];
  patientProfile?: PatientProfile;
  recentPhrases?: string[]; // For style learning
}

interface ExpandRequest extends BasePredictionRequest {
  type: 'expand';
  input: string;
}

interface ResponseRequest extends BasePredictionRequest {
  type: 'response';
  otherPersonSaid: string;
}

type PredictionRequest = ExpandRequest | ResponseRequest;

interface PredictionResponse {
  suggestions: Suggestion[];
  error?: string;
}

export async function getPredictions(
  request: PredictionRequest
): Promise<PredictionResponse> {
  try {
    const body: Record<string, unknown> = {
      conversationHistory: request.conversationHistory,
      patientProfile: request.patientProfile,
      recentPhrases: request.recentPhrases,
    };

    if (request.type === 'expand') {
      body.input = request.input;
    } else {
      body.otherPersonSaid = request.otherPersonSaid;
    }

    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return {
      suggestions: data.suggestions.map((text: string, index: number) => ({
        id: `suggestion-${Date.now()}-${index}`,
        text,
      })),
    };
  } catch (error) {
    console.error('Prediction error:', error);
    return {
      suggestions: [],
      error: error instanceof Error ? error.message : 'Failed to get suggestions',
    };
  }
}

// Convenience function for expanding a word/phrase
export async function expandInput(
  input: string,
  conversationHistory?: ConversationMessage[],
  patientProfile?: PatientProfile,
  recentPhrases?: string[]
): Promise<PredictionResponse> {
  return getPredictions({
    type: 'expand',
    input,
    conversationHistory,
    patientProfile,
    recentPhrases,
  });
}

// Convenience function for generating responses
export async function generateResponses(
  otherPersonSaid: string,
  conversationHistory?: ConversationMessage[],
  patientProfile?: PatientProfile,
  recentPhrases?: string[]
): Promise<PredictionResponse> {
  return getPredictions({
    type: 'response',
    otherPersonSaid,
    conversationHistory,
    patientProfile,
    recentPhrases,
  });
}
