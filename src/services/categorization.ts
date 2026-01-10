import { PhraseCategory } from '@/stores/analytics';
import { getAuthHeaders } from '@/lib/authToken';

interface CategorizeResponse {
  categories: { [phrase: string]: PhraseCategory };
  error?: string;
}

// Categorize multiple phrases in a single API call
export async function categorizePhrases(
  phrases: string[]
): Promise<{ [phrase: string]: PhraseCategory }> {
  if (phrases.length === 0) return {};

  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phrases }),
    });

    if (!response.ok) {
      console.error('Categorization API error:', response.status);
      return {};
    }

    const data: CategorizeResponse = await response.json();

    if (data.error) {
      console.error('Categorization error:', data.error);
      return {};
    }

    return data.categories;
  } catch (error) {
    console.error('Failed to categorize phrases:', error);
    return {};
  }
}

// Categorize a single phrase
export async function categorizePhrase(phrase: string): Promise<PhraseCategory | null> {
  const result = await categorizePhrases([phrase]);
  return result[phrase] || null;
}
