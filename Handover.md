# ALS Communicator - Handover Document

**Last Updated:** January 2025

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
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **State:** Zustand (persisted to localStorage)
- **LLM:** Google Gemini API (`gemini-2.0-flash`)
- **TTS:** ElevenLabs API + Web Speech API fallback
- **Styling:** Tailwind CSS
- **Deployment:** Firebase Hosting

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

## Recent Changes (This Session)

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
```
GEMINI_API_KEY=       # Google Gemini API
ELEVENLABS_API_KEY=   # ElevenLabs TTS
```

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

## Security Audit (January 2025)

### Summary
| Check | Status |
|-------|--------|
| npm audit | 0 vulnerabilities |
| API keys in env vars | Yes (properly gitignored) |
| Input validation | Partial |
| Rate limiting | None |
| Authentication | None (public APIs) |

### Findings

#### 1. XML Injection in Emergency API (FIXED)
**File:** `src/app/api/emergency/route.ts`
**Issue:** User-provided `patientName`, `message`, and `location` were embedded directly in TwiML XML without escaping.
**Risk:** An attacker could inject TwiML commands.
**Fix:** Added `escapeXml()` function to sanitize all user inputs before embedding in TwiML.

#### 2. No Input Length Limits (LOW)
**Issue:** API routes don't limit input size, allowing potential DoS via large payloads.
**Mitigation:** Next.js has default body size limits, but explicit validation would be better.

#### 3. No Rate Limiting (LOW)
**Issue:** APIs could be abused with repeated requests.
**Mitigation:** Firebase Hosting provides some protection; could add explicit rate limiting.

#### 4. No Authentication (INFO)
**Issue:** API routes are publicly accessible.
**Context:** This is intentional for PWA simplicity; the app doesn't handle sensitive user data (profile is stored client-side).

### Recommendations
1. Add XML escaping to emergency API (priority)
2. Consider adding rate limiting for LLM APIs (cost protection)
3. Add input length validation

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
- Deployment is Firebase (NOT Vercel)
- LLM is Gemini (NOT Claude)
- iOS audio works but has system beeps (OS limitation)
- Style learning and categorization are already implemented
- Check `src/stores/analytics.ts` for phrase tracking logic
