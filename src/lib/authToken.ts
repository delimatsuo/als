import { auth } from './firebase';

/**
 * Get the current user's Firebase ID token
 * Returns null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  if (!auth) {
    console.warn('[AuthToken] Firebase auth not initialized');
    return null;
  }

  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('[AuthToken] Failed to get ID token:', error);
    return null;
  }
}

/**
 * Get headers with auth token for API requests
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Get headers for form data requests with auth
 */
export async function getAuthFormHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
