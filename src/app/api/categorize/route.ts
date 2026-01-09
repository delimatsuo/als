import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

const VALID_CATEGORIES: PhraseCategory[] = [
  'greetings',
  'needs',
  'responses',
  'feelings',
  'requests',
  'social',
  'medical',
  'other',
];

const CATEGORIZE_PROMPT = `You are categorizing phrases for an AAC (Augmentative and Alternative Communication) device used by someone with ALS.

Categorize each phrase into exactly ONE category. Choose the most appropriate category based on the primary intent of the phrase.

Categories:
- greetings: Hellos, goodbyes, good morning/night, welcome phrases
- needs: Physical needs like water, food, bathroom, positioning, temperature
- responses: Yes, no, maybe, I agree, I don't know, acknowledgments
- feelings: Emotional states, how I feel, tired, happy, sad, pain expressions
- requests: Asking someone to do something (can you, would you, please do)
- social: Thank you, I love you, how are you, conversation phrases
- medical: Medication, doctor, symptoms, equipment-related, health concerns
- other: Anything that doesn't fit the above categories

Reply with ONLY the category name, nothing else.`;

interface CategorizeRequestBody {
  phrases: string[];
}

interface CategorizeResponse {
  categories: { [phrase: string]: PhraseCategory };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CategorizeResponse>> {
  try {
    const body: CategorizeRequestBody = await request.json();
    const { phrases } = body;

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return NextResponse.json(
        { categories: {}, error: 'Phrases array is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { categories: {}, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini Flash for fast categorization
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.1, // Low temperature for consistent categorization
      },
    });

    // Categorize phrases in parallel for speed
    const categories: { [phrase: string]: PhraseCategory } = {};

    // Batch categorization: send all phrases in one prompt if multiple
    if (phrases.length === 1) {
      // Single phrase - simple prompt
      const prompt = `${CATEGORIZE_PROMPT}\n\nPhrase: "${phrases[0]}"`;
      const result = await model.generateContent(prompt);
      const response = result.response.text().trim().toLowerCase();
      categories[phrases[0]] = VALID_CATEGORIES.includes(response as PhraseCategory)
        ? (response as PhraseCategory)
        : 'other';
    } else {
      // Multiple phrases - batch prompt
      const batchPrompt = `${CATEGORIZE_PROMPT}\n\nCategorize each of these phrases. Reply with one category per line, in order:\n${phrases.map((p, i) => `${i + 1}. "${p}"`).join('\n')}`;

      const result = await model.generateContent(batchPrompt);
      const responseText = result.response.text().trim();
      const lines = responseText.split('\n').map((line) => line.trim().toLowerCase());

      phrases.forEach((phrase, index) => {
        // Try to extract category from the line (may have number prefix)
        let category = lines[index] || 'other';
        // Remove any numbering like "1. " or "1: "
        category = category.replace(/^\d+[\.\:\)\-\s]+/, '').trim();

        categories[phrase] = VALID_CATEGORIES.includes(category as PhraseCategory)
          ? (category as PhraseCategory)
          : 'other';
      });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categorize API error:', error);
    return NextResponse.json(
      { categories: {}, error: 'Failed to categorize phrases' },
      { status: 500 }
    );
  }
}
