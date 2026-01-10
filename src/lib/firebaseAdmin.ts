import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK initialization for server-side operations
// This is used to verify auth tokens and access Firestore from API routes

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

// Check if we have valid admin credentials
const hasAdminCredentials = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

function initializeFirebaseAdmin(): App | null {
  if (adminApp) return adminApp;

  if (!hasAdminCredentials) {
    console.warn('[FirebaseAdmin] Missing credentials - admin features disabled');
    return null;
  }

  try {
    // Check if already initialized
    if (getApps().length > 0) {
      adminApp = getApps()[0];
      return adminApp;
    }

    // Initialize with service account credentials
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Private key comes with escaped newlines from env, need to unescape
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    });

    console.log('[FirebaseAdmin] Initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('[FirebaseAdmin] Initialization error:', error);
    return null;
  }
}

// Get Firebase Admin Auth instance
export function getAdminAuth(): Auth | null {
  if (adminAuth) return adminAuth;

  const app = initializeFirebaseAdmin();
  if (!app) return null;

  adminAuth = getAuth(app);
  return adminAuth;
}

// Get Firebase Admin Firestore instance
export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;

  const app = initializeFirebaseAdmin();
  if (!app) return null;

  adminDb = getFirestore(app);
  return adminDb;
}

export { hasAdminCredentials };
