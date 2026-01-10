import { getAdminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Estimated costs per unit (in USD)
const COSTS = {
  geminiTokenInput: 0.000001,    // $1 per 1M input tokens
  geminiTokenOutput: 0.000004,   // $4 per 1M output tokens
  elevenLabsCharacter: 0.00003,  // $30 per 1M characters
  twilioCall: 0.014,             // ~$0.014 per minute
  twilioSms: 0.0075,             // ~$0.0075 per SMS
};

export interface UsageMetrics {
  tokens?: number;           // For Gemini API (predict, categorize, transcribe)
  characters?: number;       // For ElevenLabs (speak)
  audioDuration?: number;    // For transcribe (seconds)
  callDuration?: number;     // For emergency (seconds)
  smsCount?: number;         // For emergency
}

/**
 * Track API usage for a user
 */
export async function trackUsage(
  userId: string,
  endpoint: string,
  metrics: UsageMetrics
): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    console.warn('[UsageTracker] DB not available - usage not tracked');
    return;
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  try {
    const usageRef = db.collection('users').doc(userId).collection('usage').doc(today);

    // Calculate estimated cost
    let estimatedCost = 0;
    if (metrics.tokens) {
      // Assume 80% input, 20% output tokens
      const inputTokens = metrics.tokens * 0.8;
      const outputTokens = metrics.tokens * 0.2;
      estimatedCost += inputTokens * COSTS.geminiTokenInput + outputTokens * COSTS.geminiTokenOutput;
    }
    if (metrics.characters) {
      estimatedCost += metrics.characters * COSTS.elevenLabsCharacter;
    }
    if (metrics.callDuration) {
      estimatedCost += (metrics.callDuration / 60) * COSTS.twilioCall;
    }
    if (metrics.smsCount) {
      estimatedCost += metrics.smsCount * COSTS.twilioSms;
    }

    // Update usage document
    const updateData: Record<string, unknown> = {
      date: today,
      lastUpdated: FieldValue.serverTimestamp(),
      [`${endpoint}.calls`]: FieldValue.increment(1),
      totalEstimatedCost: FieldValue.increment(estimatedCost),
    };

    // Add metric-specific increments
    if (metrics.tokens) {
      updateData[`${endpoint}.tokens`] = FieldValue.increment(metrics.tokens);
    }
    if (metrics.characters) {
      updateData[`${endpoint}.characters`] = FieldValue.increment(metrics.characters);
    }
    if (metrics.audioDuration) {
      updateData[`${endpoint}.audioDuration`] = FieldValue.increment(metrics.audioDuration);
    }
    if (metrics.callDuration) {
      updateData[`${endpoint}.callDuration`] = FieldValue.increment(metrics.callDuration);
    }
    if (metrics.smsCount) {
      updateData[`${endpoint}.smsCount`] = FieldValue.increment(metrics.smsCount);
    }

    await usageRef.set(updateData, { merge: true });
  } catch (error) {
    console.error('[UsageTracker] Error tracking usage:', error);
    // Don't throw - usage tracking failure shouldn't break the API
  }
}

/**
 * Get usage stats for a user for a specific date
 */
export async function getUserUsage(
  userId: string,
  date?: string
): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  if (!db) return null;

  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const usageRef = db.collection('users').doc(userId).collection('usage').doc(targetDate);
    const doc = await usageRef.get();
    return doc.data() || null;
  } catch (error) {
    console.error('[UsageTracker] Error getting usage:', error);
    return null;
  }
}

/**
 * Get usage stats for a user for a date range
 */
export async function getUserUsageRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Array<Record<string, unknown>>> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const usageRef = db.collection('users').doc(userId).collection('usage');
    const snapshot = await usageRef
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('[UsageTracker] Error getting usage range:', error);
    return [];
  }
}

/**
 * Get aggregated usage stats for all users (admin only)
 */
export async function getAllUsersUsage(date?: string): Promise<Array<{
  userId: string;
  email?: string;
  usage: Record<string, unknown>;
}>> {
  const db = getAdminDb();
  if (!db) return [];

  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const results: Array<{ userId: string; email?: string; usage: Record<string, unknown> }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const usageDoc = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('usage')
        .doc(targetDate)
        .get();

      if (usageDoc.exists) {
        results.push({
          userId: userDoc.id,
          email: userData.email,
          usage: usageDoc.data() || {},
        });
      }
    }

    // Sort by total estimated cost (descending)
    results.sort((a, b) => {
      const costA = (a.usage.totalEstimatedCost as number) || 0;
      const costB = (b.usage.totalEstimatedCost as number) || 0;
      return costB - costA;
    });

    return results;
  } catch (error) {
    console.error('[UsageTracker] Error getting all users usage:', error);
    return [];
  }
}

/**
 * Estimate token count for a string (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
