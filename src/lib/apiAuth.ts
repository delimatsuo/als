import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, hasAdminCredentials } from './firebaseAdmin';

export interface AuthenticatedUser {
  userId: string;
  email: string | undefined;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
}

/**
 * Verify Firebase Auth token from request header
 * Returns user info if valid, null if invalid or missing
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // If admin SDK is not configured, allow requests (for development)
  if (!hasAdminCredentials) {
    console.warn('[Auth] Admin SDK not configured - auth check skipped');
    return { user: null, error: null };
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    console.error('[Auth] Admin auth not available');
    return { user: null, error: 'Auth service unavailable' };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      user: {
        userId: decodedToken.uid,
        email: decodedToken.email,
      },
      error: null,
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return { user: null, error: 'Invalid or expired token' };
  }
}

/**
 * Check if user is blocked or suspended
 */
export async function checkUserStatus(userId: string): Promise<{
  allowed: boolean;
  status: string;
  reason?: string;
}> {
  const db = getAdminDb();
  if (!db) {
    // If DB not available, allow by default
    return { allowed: true, status: 'active' };
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      // New user, allow
      return { allowed: true, status: 'active' };
    }

    const status = userData.status || 'active';

    if (status === 'blocked') {
      return {
        allowed: false,
        status: 'blocked',
        reason: userData.blockedReason || 'Account blocked',
      };
    }

    if (status === 'suspended') {
      // Check if suspension has expired
      if (userData.suspendedUntil && Date.now() < userData.suspendedUntil) {
        return {
          allowed: false,
          status: 'suspended',
          reason: userData.suspendedReason || 'Account suspended',
        };
      }
    }

    return { allowed: true, status };
  } catch (error) {
    console.error('[Auth] Error checking user status:', error);
    // Allow on error to avoid blocking legitimate users
    return { allowed: true, status: 'unknown' };
  }
}

/**
 * Middleware helper to require authentication
 * Returns error response if auth fails, null if successful
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser;
} | NextResponse> {
  const authResult = await verifyAuth(request);

  // If admin not configured, create anonymous user for development
  if (!hasAdminCredentials) {
    return {
      user: {
        userId: 'anonymous',
        email: undefined,
      },
    };
  }

  if (authResult.error || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is blocked
  const statusCheck = await checkUserStatus(authResult.user.userId);
  if (!statusCheck.allowed) {
    return NextResponse.json(
      {
        error: `Account ${statusCheck.status}`,
        reason: statusCheck.reason,
      },
      { status: 403 }
    );
  }

  return { user: authResult.user };
}

/**
 * Check if user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error('[Auth] Error checking admin status:', error);
    return false;
  }
}
