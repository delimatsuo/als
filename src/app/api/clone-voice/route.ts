import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { trackUsage } from '@/lib/usageTracker';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check rate limit (very strict for voice cloning)
    const rateLimit = await checkRateLimit(user.userId, 'clone-voice');
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

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const audioFiles = formData.getAll('files') as File[];

    if (!name) {
      return NextResponse.json(
        { error: 'Voice name is required' },
        { status: 400 }
      );
    }

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one audio sample is required' },
        { status: 400 }
      );
    }

    // Create form data for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', name);

    if (description) {
      elevenLabsFormData.append('description', description);
    }

    // Add audio files
    for (const file of audioFiles) {
      elevenLabsFormData.append('files', file);
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs clone voice error:', errorData);
      return NextResponse.json(
        { error: errorData.detail?.message || 'Failed to clone voice' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Track usage
    await trackUsage(user.userId, 'clone-voice', {});

    return NextResponse.json({
      voiceId: data.voice_id,
      name: name,
    });
  } catch (error) {
    console.error('Clone voice API error:', error);
    return NextResponse.json(
      { error: 'Failed to clone voice' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a cloned voice
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get('voiceId');

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete voice' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete voice API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice' },
      { status: 500 }
    );
  }
}
