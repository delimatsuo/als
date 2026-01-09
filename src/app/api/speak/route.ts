import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice ID (Rachel - a clear, natural voice)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

interface SpeakRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number; // 0.7 to 1.2, default 1.0
}

export async function POST(request: NextRequest) {
  try {
    const body: SpeakRequest = await request.json();
    const { text, voiceId, modelId, stability, similarityBoost, speed } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

    // Use non-streaming endpoint for more reliable audio
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: stability ?? 0.5,
            similarity_boost: similarityBoost ?? 0.75,
            speed: speed ?? 0.9, // Default 10% slower for better clarity
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Speak API] ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs error: ${errorText}` },
        { status: response.status }
      );
    }

    // Get the complete audio response
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache', // Disable caching for debugging
      },
    });
  } catch (error) {
    console.error('[Speak API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured', voices: [] },
        { status: 200 }
      );
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch voices', voices: [] },
        { status: 200 }
      );
    }

    const data = await response.json();

    // Return simplified voice list
    const voices = data.voices.map((voice: { voice_id: string; name: string; labels?: Record<string, string> }) => ({
      id: voice.voice_id,
      name: voice.name,
      labels: voice.labels || {},
    }));

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Voices API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices', voices: [] },
      { status: 200 }
    );
  }
}
