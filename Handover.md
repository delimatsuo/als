# ALS Communicator - Handover Document

**Last Updated:** January 9, 2025

This document provides context for AI coding agents continuing work on this project. Start here to understand what has been built, what's working, and what needs attention.

---

## Project Overview

An AAC (Augmentative and Alternative Communication) app for people with ALS. Users type minimal input (a word or phrase), and the LLM suggests complete sentences that are spoken aloud using text-to-speech.

**Live URL:** https://als1-483721.web.app

**Deployment:** Firebase Hosting (NOT Vercel)
```bash
firebase deploy  # Deploy to production
```

---

## Current State (What's Working)

### Core Features

1. **Text Expansion**: User types "water" → LLM suggests "I would like some water, please", "Can you bring me water?", etc.

2. **Conversation Mode**:
   - Mic listens for what the other person says
   - Transcribes their speech
   - Generates response suggestions for the patient
   - Patient selects a response → speaks it → continues listening

3. **Text-to-Speech**:
   - ElevenLabs API (primary) - high quality, custom voices
   - Web Speech API (fallback) - browser built-in
   - Speed set to 0.9 (10% slower for clarity)

4. **Style Learning** (Implemented):
   - Stores last 20 spoken phrases
   - Injects 5 most recent into LLM prompts for style matching
   - LLM learns patient's communication patterns

5. **Phrase Categorization** (Implemented):
   - LLM categorizes spoken phrases into: greetings, needs, responses, feelings, requests, social, medical, other
   - Categories shown in Quick Phrases section
   - Background categorization (doesn't block UI)

6. **Quick Phrases**:
   - Preset phrases for common needs (emergency, breathing, feeding, etc.)
   - Equipment-aware (shows respirator phrases only if patient has respirator)
   - Time-aware (morning greetings in AM, bedtime phrases at night)
   - Includes polite variants: "Yes, please", "No, thank you"

7. **Patient Profile**:
   - Name, personality, interests, relationships
   - Medical equipment configuration
   - Stored in localStorage via Zustand

### iOS Audio (Fixed)

Audio now works on iOS Safari/Chrome after implementing:
- Empty buffer technique via Web Audio API (like Howler.js)
- `touchend` event handling (required for iOS 9+)
- AudioContext resume on user gesture
- Gain node set to 0 for truly silent unlock

**Known Issue:** iOS system beeps when microphone starts/stops. This is an OS-level privacy feature that CANNOT be disabled from a web app. A native iOS app using SFSpeechRecognizer would not have this issue.

---

## Architecture

### Tech Stack
- **Framework:** Next.js 15.5.9 (App Router) - DO NOT upgrade to Next.js 16 (Turbopack breaks firebase-admin)
- **Language:** TypeScript
- **State:** Zustand (persisted to localStorage)
- **LLM:** Google Gemini API (`gemini-2.0-flash`)
- **TTS:** ElevenLabs API + Web Speech API fallback
- **Styling:** Tailwind CSS
- **Deployment:** Firebase Hosting with Cloud Functions

### Key Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main UI, conversation flow, state management |
| `src/app/api/predict/route.ts` | Gemini API for text expansion |
| `src/app/api/speak/route.ts` | ElevenLabs TTS API |
| `src/app/api/categorize/route.ts` | LLM phrase categorization |
| `src/services/voice.ts` | TTS service, iOS audio unlock |
| `src/services/speechRecognition.ts` | Web Speech API wrapper |
| `src/components/ListeningMode.tsx` | Mic UI, silence detection |
| `src/components/QuickPhrases.tsx` | Preset/learned phrases UI |
| `src/stores/analytics.ts` | Phrase usage tracking, style learning |
| `src/lib/prompts.ts` | LLM system prompts |
| `src/lib/firebaseAdmin.ts` | Firebase Admin SDK initialization |
| `src/lib/apiAuth.ts` | API authentication & user status checking |
| `src/lib/rateLimit.ts` | Per-user rate limiting |
| `src/lib/usageTracker.ts` | API usage tracking |
| `src/contexts/AuthContext.tsx` | Auth provider with session timeout |
| `src/app/admin/page.tsx` | Admin dashboard for user/usage management |

### State Management

**App Store** (`src/stores/app.ts`):
- `inputText`, `suggestions`, `isSpeaking`, `error`
- `voiceProvider`, `voiceId` (ElevenLabs voice selection)
- `patientProfile` (name, equipment, etc.)
- `conversationHistory` (for context in LLM prompts)

**Analytics Store** (`src/stores/analytics.ts`):
- `phraseUsage` - tracks every spoken phrase with count, time, category
- `recentPhrases` - last 20 phrases for style learning
- `suggestionFeedback` - accepted/rejected/edited counts

---

## Recent Changes (January 9, 2025)

### iPad Chrome Sign-In Fix
- **Problem:** Google sign-in on iPad Chrome didn't show the Gmail account picker
- **Root Cause:** Chrome on iOS has stricter privacy restrictions that break OAuth redirect flows
- **Solution:**
  - Changed iPad to use popup sign-in instead of redirect (only iPhone uses redirect)
  - Added `setCustomParameters({ prompt: 'select_account' })` to force account picker
  - Added popup-blocked fallback to redirect
- **Files:** `src/lib/firebase.ts`, `src/contexts/AuthContext.tsx`

### Firestore Rules Fix
- **Problem:** New users couldn't sign in (write was blocked)
- **Solution:** Separated `write` into `create` (no restrictions) and `update` (with admin field protection)
- **File:** `firestore.rules`

### Next.js Downgrade (16 → 15)
- **Problem:** Next.js 16 uses Turbopack by default, which couldn't bundle firebase-admin properly
- **Error:** `Cannot find package 'firebase-admin-a14c8a5423a75469'` (mangled package name)
- **Solution:** Downgraded to Next.js 15.5.9 (uses webpack)
- **Result:** Cloud Function size dropped from 274MB to 25MB

### Cloud Environment Variables
- **Problem:** ElevenLabs/Gemini APIs returned 500 errors in production
- **Cause:** Environment variables weren't passed to Cloud Functions
- **Solution:** Created `.env` file (not `.env.local`) which Firebase reads during deployment
- **File:** `.env` (contains `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`)

### Admin Dashboard (Complete)
- Full user management with block/unblock/suspend actions
- Usage statistics and cost tracking
- Daily usage chart
- Top users by API cost
- **Access:** Settings page → "Admin Dashboard" link (requires `isAdmin: true` in Firestore)

---

## Previous Changes

1. **iOS Audio Fix**: Implemented Howler.js-style empty buffer technique with `touchend` event handling

2. **Style Learning**: LLM now learns from patient's recent phrases and matches their communication style

3. **Phrase Categorization**: LLM automatically categorizes phrases; shown grouped in Quick Phrases

4. **Polite Response Variants**: Added "Yes, please" and "No, thank you" to quick responses

5. **Speech Speed**: Set ElevenLabs to 0.9x speed (10% slower for clarity)

6. **Cursor Fix**: Fixed bug where clicking in middle of text jumped cursor to end

---

## Known Issues / Limitations

### iOS Microphone Beeps
- **Problem:** iOS plays system sounds when mic starts/stops
- **Cause:** OS-level privacy feature, cannot be disabled via JavaScript
- **Workaround:** User can lower device volume before using mic
- **Solution:** Build a native iOS app using SFSpeechRecognizer (no beeps)

### Web Speech API Limitations
- Not supported on all browsers (iOS Safari has issues)
- Fallback uses MediaRecorder + Gemini transcription API

### PWA Limitations
- Speech Recognition doesn't work when installed as PWA on iOS Safari
- Must be used in browser directly

---

## Future Considerations

### Native App (Would Fix iOS Beeps)
- React Native + Expo with `expo-speech-recognition`
- Or Swift/SwiftUI with SFSpeechRecognizer
- Native apps have direct AVAudioEngine control, no system beeps

### Continuous Mic Mode (Investigated, Not Implemented)
A plan was explored to keep the mic running continuously during conversation to avoid beeps. Decided against due to complexity and potential for errors. See `/Users/delimatsuo/.claude/plans/pure-seeking-breeze.md` for details.

### Offline Support
- Gemini 2.0 Flash is online-only
- Could add on-device LLM for offline fallback (larger app size)

---

## Development Workflow

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Verify changes (ALWAYS run before committing)
npm run lint
npm run build

# Deploy to production
firebase deploy
```

### Environment Variables

**Local development (`.env.local`):**
```
GEMINI_API_KEY=       # Google Gemini API
ELEVENLABS_API_KEY=   # ElevenLabs TTS

# Firebase client-side (NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**Production (`.env` - read by Firebase during deployment):**
```
GEMINI_API_KEY=       # Google Gemini API
ELEVENLABS_API_KEY=   # ElevenLabs TTS
```

**Note:** Don't use `FIREBASE_` prefix in `.env` - it's reserved by Firebase.

---

## Testing Checklist

1. **Text Expansion**: Type word → get suggestions → speak one
2. **Conversation Mode**: Start conversation → listen → respond → continue
3. **Quick Phrases**: Check Emergency, Breathing, Social categories
4. **Settings**: Change voice, update patient profile
5. **iOS**: Test on iPhone/iPad (Safari and Chrome)
6. **Persistence**: Refresh page → verify profile and analytics persist

---

---

## Security & Abuse Prevention (January 2025)

### Summary
| Check | Status |
|-------|--------|
| npm audit | 0 vulnerabilities |
| API keys in env vars | Yes (properly gitignored) |
| Input validation | Partial |
| Rate limiting | **Implemented** |
| Authentication | **Implemented** (Firebase Auth required for APIs) |
| Session timeout | **Implemented** (30 min inactivity) |
| Usage tracking | **Implemented** (per-user Firestore) |

### Implemented Security Features

#### 1. API Authentication
**Files:** `src/lib/firebaseAdmin.ts`, `src/lib/apiAuth.ts`
- All API routes require Firebase Auth token in `Authorization: Bearer <token>` header
- Server-side token verification using Firebase Admin SDK
- Blocked/suspended user detection

#### 2. Rate Limiting
**File:** `src/lib/rateLimit.ts`
- Per-user rate limits stored in Firestore
- Limits: `/api/predict` (30/min, 500/hr, 5000/day), `/api/speak` (20/min, 200/hr, 2000/day)
- Returns 429 with retry-after when exceeded

#### 3. Session Timeout
**File:** `src/contexts/AuthContext.tsx`
- Auto-logout after 30 minutes of inactivity
- Tracks mouse, keyboard, touch, scroll events
- Prevents idle sessions from consuming LLM tokens

#### 4. Usage Tracking
**File:** `src/lib/usageTracker.ts`
- Logs API usage to Firestore `/users/{userId}/usage/{date}`
- Tracks: calls, tokens, characters, audio duration
- Estimates cost per user

#### 5. User Status Checking
- Users can be blocked/suspended by admin
- API routes check user status before processing
- Blocked users get 403 Forbidden

### Environment Variables Required
```
# Firebase Admin SDK (for server-side auth)
FIREBASE_ADMIN_PROJECT_ID=als1-483721
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@als1-483721.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Previous Findings (Fixed)

#### XML Injection in Emergency API (FIXED)
**File:** `src/app/api/emergency/route.ts`
- Added `escapeXml()` function to sanitize user inputs in TwiML

### Admin Dashboard (Implemented)
**File:** `src/app/admin/page.tsx`
**API Routes:** `src/app/api/admin/stats/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[userId]/route.ts`

Features:
- Overview tab: User counts, cost metrics, daily usage chart, top users by cost
- Users tab: Searchable user list with status filtering, usage stats
- User detail panel: Block/unblock/suspend users, make/remove admin, view usage history
- Access: Settings page → "Admin Dashboard" link at bottom
- Authorization: Only users with `isAdmin: true` in Firestore can access

### Future Considerations
1. Input length validation on API routes
2. Email alerts for high usage accounts

---

## Contact / Resources

- **Firebase Console:** https://console.firebase.google.com/project/als1-483721
- **Gemini API Docs:** https://ai.google.dev/gemini-api/docs
- **ElevenLabs API:** https://elevenlabs.io/docs/api-reference

---

## Summary for New AI Agent

**Start here:**
1. Read `CLAUDE.md` for tech stack and code patterns
2. Read this file for current state and context
3. Run `npm run dev` to start development
4. Run `npm run build` before any commit to verify

**Key things to know:**
- Deployment is Firebase (NOT Vercel) - use `firebase deploy`
- LLM is Gemini (NOT Claude)
- iOS audio works but has system beeps (OS limitation)
- Style learning and categorization are already implemented
- Check `src/stores/analytics.ts` for phrase tracking logic

**Important gotchas:**
1. **DO NOT upgrade to Next.js 16** - Turbopack breaks firebase-admin bundling
2. **Use `.env` for production secrets** - `.env.local` is not read by Cloud Functions
3. **Don't use `FIREBASE_` prefix** in env vars - it's reserved
4. **iPad uses popup sign-in**, iPhone uses redirect - Chrome on iOS breaks redirect flows
5. **Admin access** requires manually setting `isAdmin: true` in Firestore `/users/{userId}`
6. **Firestore rules** separate `create` and `update` to allow new users while protecting admin fields

**Admin setup:**
1. Go to Firebase Console → Firestore
2. Find the user document: `/users/{userId}`
3. Add field: `isAdmin: true`
4. User can now access `/admin` dashboard
