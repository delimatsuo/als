import { getAdminDb } from './firebaseAdmin';

// Rate limit configuration per endpoint
export const RATE_LIMITS: Record<string, {
  perMinute: number;
  perHour: number;
  perDay: number;
}> = {
  predict: { perMinute: 30, perHour: 500, perDay: 5000 },
  speak: { perMinute: 20, perHour: 200, perDay: 2000 },
  categorize: { perMinute: 30, perHour: 300, perDay: 3000 },
  transcribe: { perMinute: 10, perHour: 100, perDay: 1000 },
  'clone-voice': { perMinute: 2, perHour: 5, perDay: 10 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: {
    minute: number;
    hour: number;
    day: number;
  };
  reason?: string;
}

interface RateLimitData {
  minuteCount: number;
  minuteReset: number;
  hourCount: number;
  hourReset: number;
  dayCount: number;
  dayReset: number;
}

/**
 * Check and update rate limits for a user/endpoint
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[endpoint];
  if (!limits) {
    // Unknown endpoint, allow
    return {
      allowed: true,
      remaining: { minute: 999, hour: 999, day: 999 },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }

  const db = getAdminDb();
  if (!db) {
    // If DB not available, allow (for development)
    return {
      allowed: true,
      remaining: { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }

  const now = Date.now();
  const minuteWindow = 60 * 1000;
  const hourWindow = 60 * 60 * 1000;
  const dayWindow = 24 * 60 * 60 * 1000;

  try {
    const rateLimitRef = db.collection('rateLimit').doc(userId).collection('endpoints').doc(endpoint);

    // Use transaction to safely update counts
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() as RateLimitData | undefined;

      // Initialize or reset counters
      let minuteCount = 0;
      let minuteReset = now + minuteWindow;
      let hourCount = 0;
      let hourReset = now + hourWindow;
      let dayCount = 0;
      let dayReset = now + dayWindow;

      if (data) {
        // Check if windows have expired
        if (data.minuteReset > now) {
          minuteCount = data.minuteCount;
          minuteReset = data.minuteReset;
        }
        if (data.hourReset > now) {
          hourCount = data.hourCount;
          hourReset = data.hourReset;
        }
        if (data.dayReset > now) {
          dayCount = data.dayCount;
          dayReset = data.dayReset;
        }
      }

      // Check limits
      let allowed = true;
      let reason: string | undefined;

      if (minuteCount >= limits.perMinute) {
        allowed = false;
        reason = `Rate limit exceeded: ${limits.perMinute} requests per minute`;
      } else if (hourCount >= limits.perHour) {
        allowed = false;
        reason = `Rate limit exceeded: ${limits.perHour} requests per hour`;
      } else if (dayCount >= limits.perDay) {
        allowed = false;
        reason = `Rate limit exceeded: ${limits.perDay} requests per day`;
      }

      // Only increment if allowed
      if (allowed) {
        transaction.set(rateLimitRef, {
          minuteCount: minuteCount + 1,
          minuteReset,
          hourCount: hourCount + 1,
          hourReset,
          dayCount: dayCount + 1,
          dayReset,
          lastRequest: now,
        });
      }

      return {
        allowed,
        remaining: {
          minute: Math.max(0, limits.perMinute - minuteCount - (allowed ? 1 : 0)),
          hour: Math.max(0, limits.perHour - hourCount - (allowed ? 1 : 0)),
          day: Math.max(0, limits.perDay - dayCount - (allowed ? 1 : 0)),
        },
        resetAt: {
          minute: minuteReset,
          hour: hourReset,
          day: dayReset,
        },
        reason,
      };
    });

    return result;
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // Allow on error to avoid blocking legitimate users
    return {
      allowed: true,
      remaining: { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const limits = RATE_LIMITS[endpoint];
  if (!limits) {
    return {
      allowed: true,
      remaining: { minute: 999, hour: 999, day: 999 },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }

  const db = getAdminDb();
  if (!db) {
    return {
      allowed: true,
      remaining: { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }

  const now = Date.now();

  try {
    const rateLimitRef = db.collection('rateLimit').doc(userId).collection('endpoints').doc(endpoint);
    const doc = await rateLimitRef.get();
    const data = doc.data() as RateLimitData | undefined;

    if (!data) {
      return {
        allowed: true,
        remaining: { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay },
        resetAt: { minute: 0, hour: 0, day: 0 },
      };
    }

    const minuteCount = data.minuteReset > now ? data.minuteCount : 0;
    const hourCount = data.hourReset > now ? data.hourCount : 0;
    const dayCount = data.dayReset > now ? data.dayCount : 0;

    return {
      allowed: minuteCount < limits.perMinute && hourCount < limits.perHour && dayCount < limits.perDay,
      remaining: {
        minute: Math.max(0, limits.perMinute - minuteCount),
        hour: Math.max(0, limits.perHour - hourCount),
        day: Math.max(0, limits.perDay - dayCount),
      },
      resetAt: {
        minute: data.minuteReset,
        hour: data.hourReset,
        day: data.dayReset,
      },
    };
  } catch (error) {
    console.error('[RateLimit] Error getting status:', error);
    return {
      allowed: true,
      remaining: { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay },
      resetAt: { minute: 0, hour: 0, day: 0 },
    };
  }
}
