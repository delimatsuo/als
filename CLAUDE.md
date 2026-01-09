# ALS Communicator

> **For project context and current state, see `Handover.md`**

## WHAT: Technical Overview

### Tech Stack
- Runtime: Node.js 20+
- Language: TypeScript 5.x
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- State: Zustand
- LLM: **Google Gemini API** (model: `gemini-2.0-flash`)
- Voice: ElevenLabs API, Web Speech API (fallback)
- Deployment: **Firebase Hosting** (NOT Vercel)
- Package Manager: npm

### LLM Configuration
- **Provider**: Google Gemini API (NOT Claude/Anthropic)
- **Model**: `gemini-2.0-flash` (fast, reliable)
- **Capabilities**: Text, images, video, audio input; 1M token context
- **SDK**: `@google/generative-ai`
- **Always use the latest stable version** - check https://ai.google.dev/gemini-api/docs/models

### Project Structure
```
src/
  app/
    layout.tsx        # Root layout, metadata
    page.tsx          # Main communicator interface
    settings/
      page.tsx        # User settings, voice setup
    api/
      predict/
        route.ts      # Gemini API - text expansion
      speak/
        route.ts      # ElevenLabs TTS API
      categorize/
        route.ts      # Gemini API - phrase categorization
      transcribe/
        route.ts      # Audio transcription (iOS fallback)
  components/
    InputArea.tsx     # Text input with accessibility support
    ComposeArea.tsx   # Compose/edit before speaking
    SuggestionCard.tsx # Single suggestion display
    SuggestionList.tsx # List of suggestions
    QuickPhrases.tsx  # Preset + learned phrases
    ConversationHeader.tsx # Conversation mode header
    FatigueActions.tsx # Quick responses (Yes, No, etc.)
    ListeningMode.tsx  # Speech recognition UI
    VoiceBanner.tsx   # Voice cloning promotion
    Onboarding.tsx    # First-time setup
  services/
    prediction.ts     # Gemini API client
    voice.ts          # TTS + iOS audio unlock
    speechRecognition.ts # Web Speech API
    categorization.ts # Phrase categorization service
  stores/
    app.ts            # Zustand store (main state)
    analytics.ts      # Usage tracking, style learning
  lib/
    prompts.ts        # LLM system prompts
    phrases.ts        # Preset phrase library
    utils.ts          # Helpers
```

### Key Files
- `src/app/page.tsx` - Main communicator interface
- `src/app/api/predict/route.ts` - Gemini API integration
- `src/lib/prompts.ts` - LLM system prompts (style learning)
- `src/stores/app.ts` - Application state
- `src/stores/analytics.ts` - Usage analytics, phrase categories
- `src/services/voice.ts` - TTS with iOS audio unlock

## WHY: Context

### Purpose
An LLM-powered AAC (Augmentative and Alternative Communication) app for people with ALS. Users provide minimal input (a word or phrase), and the system suggests complete sentences spoken in the user's voice.

### Target Users
- People with ALS who have limited speech/mobility
- Caregivers assisting ALS patients
- Speech therapists working with ALS patients

### Key Decisions
- PWA for cross-platform support without app store deployment
- Online-first for best API quality (Gemini, ElevenLabs)
- Multiple input methods (touch, eye tracking, switch scanning) for accessibility
- Zustand over Redux for simplicity
- Gemini API for LLM predictions (switched from Claude for cost/performance)

## HOW: Workflows

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
```

### Verification (Run after every change)
```bash
npm run lint         # ESLint
npm run build        # TypeScript compilation + Next.js build
```

### Deployment
```bash
firebase deploy      # Deploy to Firebase Hosting (NOT Vercel!)
```
**Live URL:** https://als1-483721.web.app

### Code Style
- Use functional components with hooks
- Prefer named exports over default exports
- All functions must have TypeScript types
- Use Tailwind for styling (no CSS modules)
- Accessibility: All interactive elements must have ARIA labels
- Minimum touch target: 44x44px for accessibility

### Environment Variables
```
GEMINI_API_KEY=       # Required for Google Gemini API
ELEVENLABS_API_KEY=   # Required for voice synthesis
```

### Common Mistakes to Avoid
- Don't hardcode API keys - use environment variables
- Don't forget ARIA labels on interactive elements
- Don't use px for touch targets - use min-h-11 min-w-11 (44px)
- Always handle loading and error states in API calls
- Always use `gemini-2.5-flash` model (or latest stable version)
- Remember Gemini uses `generateContent` not `messages.create`
