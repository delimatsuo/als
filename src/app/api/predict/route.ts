import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AAC_SYSTEM_PROMPT,
  RESPONSE_SYSTEM_PROMPT,
  buildPredictionPrompt,
  buildResponsePrompt,
} from '@/lib/prompts';
import { ConversationMessage, PatientProfile } from '@/stores/app';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface PredictRequestBody {
  // For expanding a word/phrase into sentences
  input?: string;
  // For generating responses to what the other person said
  otherPersonSaid?: string;
  // Common fields
  conversationHistory?: ConversationMessage[];
  patientProfile?: PatientProfile;
  recentPhrases?: string[]; // For style learning
}

export async function POST(request: NextRequest) {
  try {
    const body: PredictRequestBody = await request.json();
    const { input, otherPersonSaid, conversationHistory, patientProfile, recentPhrases } = body;

    // Determine which mode we're in
    const isResponseMode = !!otherPersonSaid;
    const textToProcess = isResponseMode ? otherPersonSaid : input;

    if (!textToProcess || typeof textToProcess !== 'string') {
      return NextResponse.json(
        { error: 'Input or otherPersonSaid is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build the appropriate prompt
    const systemPrompt = isResponseMode ? RESPONSE_SYSTEM_PROMPT : AAC_SYSTEM_PROMPT;
    const userPrompt = isResponseMode
      ? buildResponsePrompt(otherPersonSaid!, conversationHistory, patientProfile, recentPhrases)
      : buildPredictionPrompt(input!, conversationHistory, patientProfile, recentPhrases);

    // Use Gemini 2.0 Flash for faster responses
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 500, // Limit output for speed
        temperature: 0.7,
      },
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const responseText = response.text();

    // Parse JSON array from response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse suggestions:', responseText);
      // Fallback: try to split by newlines if JSON parsing fails
      suggestions = responseText
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .slice(0, 5);
    }

    // Ensure we have an array of strings
    suggestions = suggestions
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 5);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
