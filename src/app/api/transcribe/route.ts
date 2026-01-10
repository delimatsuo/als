import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { trackUsage } from '@/lib/usageTracker';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check rate limit
    const rateLimit = await checkRateLimit(user.userId, 'transcribe');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          reason: rateLimit.reason,
          retryAfter: Math.min(rateLimit.resetAt.minute, rateLimit.resetAt.hour),
        },
        { status: 429 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Determine MIME type
    const mimeType = audioFile.type || 'audio/webm';

    // Use Gemini 2.0 Flash for faster transcription
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.1, // Low temperature for accurate transcription
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
      {
        text: 'Transcribe this audio exactly. Return ONLY the transcription text, nothing else. If the audio is empty or unclear, return an empty string.',
      },
    ]);

    const response = result.response;
    const transcript = response.text().trim();

    // Track usage - estimate audio duration from file size (rough: ~16KB per second for webm)
    const estimatedSeconds = Math.ceil(audioFile.size / 16000);
    await trackUsage(user.userId, 'transcribe', { audioDuration: estimatedSeconds });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
