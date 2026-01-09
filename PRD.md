# ALS Communicator - Product Requirements Document

**Version:** 1.0
**Last Updated:** January 2025
**Status:** Active Development

---

## Executive Summary

ALS Communicator is an LLM-powered Progressive Web Application (PWA) designed to help people with Amyotrophic Lateral Sclerosis (ALS) communicate more easily and quickly. Users provide minimal input (a word or phrase), and the system generates complete sentences that are spoken aloud using text-to-speech technology.

**Live URL:** https://als1-483721.web.app

### Key Differentiators

- AI-powered phrase expansion with style learning from user communication patterns
- Voice cloning technology via ElevenLabs for personalized communication
- Real-time conversation mode with automatic speech recognition
- Time-of-day awareness for contextually relevant suggestions
- Emergency alert system with phone calls and SMS via Twilio
- Comprehensive accessibility features for multiple input methods

---

## Table of Contents

1. [Target Users](#1-target-users)
2. [Core Communication Features](#2-core-communication-features)
3. [Application Modes](#3-application-modes)
4. [Phrase Management System](#4-phrase-management-system)
5. [Voice & Speech Features](#5-voice--speech-features)
6. [Patient Profile & Personalization](#6-patient-profile--personalization)
7. [Emergency Alert System](#7-emergency-alert-system)
8. [Accessibility Features](#8-accessibility-features)
9. [Settings & Configuration](#9-settings--configuration)
10. [Analytics & Learning](#10-analytics--learning)
11. [API Endpoints](#11-api-endpoints)
12. [Technical Architecture](#12-technical-architecture)
13. [External Integrations](#13-external-integrations)

---

## 1. Target Users

### Primary Users
- **People with ALS** who have limited speech and/or mobility
- **Caregivers** assisting ALS patients with communication
- **Speech therapists** working with ALS patients

### User Needs
- Communicate complex thoughts with minimal physical effort
- Maintain their personal voice and communication style
- Respond quickly in conversations without fatigue
- Access emergency help when needed
- Use the app with various input methods (touch, eye-tracking, switch scanning)

---

## 2. Core Communication Features

### 2.1 Text Expansion

Users type a word or short phrase, and the AI generates 3-5 complete sentence options.

**Example:**
- Input: `water`
- Output suggestions:
  - "I would like some water, please"
  - "Can you bring me water?"
  - "Is there water available?"
  - "Could I have a glass of water?"

**Features:**
- Context-aware suggestions based on patient profile
- Style learning from recent phrases spoken
- Time-of-day appropriate suggestions
- Equipment-aware phrasing (e.g., mentions respirator if patient has one)

### 2.2 Conversation Mode

A continuous back-and-forth conversation flow:

1. **Listen**: App captures what the other person says via speech recognition
2. **Generate**: AI generates contextual response suggestions
3. **Select**: Patient selects or edits a response
4. **Speak**: Response is spoken aloud via TTS
5. **Repeat**: App automatically starts listening for the next response

**Features:**
- Real-time transcription with interim results
- 2-second silence detection for automatic submission
- Conversation history maintained for context (last 20 messages)
- Quick response buttons for fatigue management

### 2.3 Quick Responses (Fatigue Actions)

One-tap buttons for common responses during conversation:

| Button | Text |
|--------|------|
| Yes | "Yes" |
| Yes, please | "Yes, please" |
| No | "No" |
| No, thank you | "No, thank you" |
| Rest | "I need rest" |
| Later | "Let's talk later" |

### 2.4 Compose & Edit

Before speaking any suggestion, users can edit the text:

- Large editable text area
- Character count display
- Clear button for quick reset
- "Speak Now" button to play the composed text

---

## 3. Application Modes

### 3.1 Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        HOME MODE                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Say      │  │  Listen to  │  │    Quick    │         │
│  │  Something  │  │    Them     │  │   Phrases   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ INPUT MODE   │ │ LISTENING    │ │ PHRASE       │
   │              │ │ MODE         │ │ BROWSER      │
   │ Type/voice   │ │              │ │              │
   │ input        │ │ Capture      │ │ Browse       │
   │      │       │ │ speech       │ │ categories   │
   │      ▼       │ │      │       │ │      │       │
   │ Suggestions  │ │      ▼       │ │      ▼       │
   └──────┬───────┘ │ Transcribe   │ │ Select       │
          │         └──────┬───────┘ └──────┬───────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                ┌──────────────────────┐
                │  CONVERSATION MODE   │
                │                      │
                │  "They said: ..."    │
                │                      │
                │  [Suggestions]       │
                │  [Quick Responses]   │
                │                      │
                │  Select → Speak →    │
                │  Auto-listen         │
                │                      │
                │  [End Conversation]  │
                └──────────────────────┘
```

### 3.2 Home Mode

The default idle state with three entry points:

1. **Say Something**: Open text/voice input to generate suggestions
2. **Listen to Them**: Start speech recognition to capture what someone says
3. **Quick Phrases**: Browse the full phrase library

**Additional Elements:**
- Top 6 frequently-used phrases for quick access
- Voice cloning promotional banner (dismissible)
- Settings gear icon

### 3.3 Listening Mode

Active speech recognition interface:

- Animated waveform visualization
- Real-time transcript display (interim results in gray)
- Silence countdown timer (2 seconds)
- Manual submit button
- Cancel button
- End conversation button

**Technical Details:**
- Primary: Web Speech API
- Fallback: Audio recording + Gemini API transcription (for iOS Safari)

### 3.4 Conversation Mode

Active conversation with context:

- Display box showing what the other person said
- AI-generated response suggestions (3-5 options)
- Fatigue action buttons (Yes, No, etc.)
- Auto-listen after patient speaks
- End Conversation button (red, prominent)

---

## 4. Phrase Management System

### 4.1 Smart Phrase Library

50+ pre-configured phrases organized by category:

| Category | Examples | Filter |
|----------|----------|--------|
| **Emergency** | "Call for help!", "Call 911" | Always shown |
| **Basic** | "Yes", "No", "Thank you", "Please" | Always shown |
| **Needs** | "I need help", "I am thirsty", "I am in pain" | Always shown |
| **Breathing** | "I need suctioning", "Adjust my mask" | Respirator users only |
| **Feeding** | "I need my feeding", "Flush my tube" | Feeding tube users only |
| **Positioning** | "Adjust my position", "Turn me over" | Always shown |
| **Mobility** | "Take me outside", "Adjust wheelchair" | Wheelchair users only |
| **Bed** | "Raise the bed", "Lower the bed" | Hospital bed users only |
| **Social** | "I love you", "How are you?" | Always shown |
| **Greetings** | "Good morning", "Good night" | Time-based |

### 4.2 Equipment-Based Filtering

Phrases are automatically filtered based on patient's medical equipment:

- **Respirator/BiPAP**: Shows breathing-related phrases
- **Suction Machine**: Shows suctioning phrases
- **Feeding Tube**: Shows feeding-related phrases
- **Wheelchair**: Shows mobility phrases
- **Hospital Bed**: Shows bed control phrases

### 4.3 Time-of-Day Awareness

Phrases are weighted by time of day:

| Time | Hours | Boosted Phrases |
|------|-------|-----------------|
| Morning | 5am - 12pm | "Good morning", morning medication |
| Afternoon | 12pm - 5pm | "Good afternoon", activities |
| Evening | 5pm - 9pm | "I'm tired", evening medication |
| Night | 9pm - 5am | "Good night", sleep-related |

### 4.4 Learned Phrases

The system tracks which phrases the user speaks most frequently:

- Recent 20 phrases stored for style learning
- Top phrases appear in quick access section
- Usage tracked by hour for time-based relevance
- Categories assigned via LLM classification

---

## 5. Voice & Speech Features

### 5.1 Text-to-Speech Providers

**Option 1: ElevenLabs (Premium)**
- High-quality, natural-sounding voices
- 100+ pre-made voice library
- Voice cloning capability
- Adjustable parameters (stability, similarity, speed)
- Default speed: 0.9x (10% slower for clarity)

**Option 2: Browser Default (Free)**
- Web Speech API
- Works offline
- Device-dependent quality
- No configuration needed

### 5.2 Voice Cloning

Users can clone their own voice:

1. **Record**: 5 guided phrase recordings
2. **Upload**: Samples sent to ElevenLabs API
3. **Process**: ElevenLabs creates voice model
4. **Activate**: Voice ID stored and used for all TTS
5. **Manage**: Can delete and re-record

**Sample Phrases for Recording:**
- "Hello, my name is [name] and I'm recording my voice."
- "I would like to thank you for helping me today."
- "Can you please bring me a glass of water?"
- "I'm feeling tired and need to rest for a while."
- "The weather is beautiful outside today."

### 5.3 Voice Selection Interface

Settings → Voice Settings:

1. **Clone Your Voice**: Record and create custom voice
2. **Custom Voice ID**: Paste existing ElevenLabs voice ID
3. **ElevenLabs Library**: Browse 100+ pre-made voices
4. **Browser Default**: Free Web Speech API option

**Test Voice**: Full sentence test before activation

### 5.4 iOS Audio Handling

Special handling for iOS Safari/Chrome:

- AudioContext unlock on first user gesture
- Empty buffer playback technique (Howler.js-style)
- `touchend` event handling for iOS 9+
- Gain node set to 0 for silent unlock

**Known Limitation:** iOS plays system beeps when microphone starts/stops. This is an OS-level privacy feature that cannot be disabled in a web app. A native iOS app would not have this issue.

---

## 6. Patient Profile & Personalization

### 6.1 Profile Fields

| Field | Purpose | Example |
|-------|---------|---------|
| **Name** | Personalized greetings | "John Smith" |
| **Personality** | Style matching | "friendly and warm" |
| **Interests** | Topic relevance | "gardening, sports, cooking" |
| **Common Topics** | Conversation context | "family updates, medical appointments" |
| **Relationships** | Social context | "spouse: Maria, kids: Sarah and Tom" |
| **Additional Context** | Rich personalization | "Former teacher, lives in NYC" |

### 6.2 Medical Equipment

Checkbox selection for:

- [ ] Respirator / BiPAP
- [ ] Suction Machine
- [ ] Feeding Tube (PEG/G-tube)
- [ ] Wheelchair
- [ ] Hospital Bed

**Impact:**
- Filters quick phrase library
- Adds context to LLM suggestions
- Shows relevant equipment-specific phrases

### 6.3 Profile Usage in AI

All profile information is included in every LLM prompt:

```
Patient context:
- Name: John Smith
- Personality: friendly and warm
- Interests: gardening, sports
- Relationships: spouse Maria
- Equipment: respirator, wheelchair
- Time: morning

Generate suggestions that match this patient's style and situation.
```

---

## 7. Emergency Alert System

### 7.1 Emergency Contacts

Configure in Settings → Emergency Contacts:

| Field | Format | Example |
|-------|--------|---------|
| Name | Text | "Maria (Wife)" |
| Phone | E.164 | "+14155551234" |
| Relationship | Text | "Spouse" |

**Minimum:** 1 contact required to enable emergency feature

### 7.2 Alert Trigger

1. User presses large red Emergency button
2. Confirmation dialog: "Are you sure? This will alert X contacts"
3. On confirmation:
   - Phone call to all contacts (automated TTS message)
   - SMS to all contacts (simultaneous)

### 7.3 Alert Content

**Phone Call (via Twilio TwiML):**
```
Emergency alert from [Patient Name]. They need help immediately.
[Location if provided]
Press any key to acknowledge this alert.
[10 second pause]
This is an automated emergency alert. Please check on [Patient Name] immediately.
```
*Message plays twice*

**SMS:**
```
🚨 EMERGENCY: Emergency alert from [Patient Name]. They need help immediately. [Location]
```

### 7.4 Security

- XML entity escaping prevents TwiML injection attacks
- Phone numbers validated (E.164 format)
- Server-side processing (no client exposure of Twilio credentials)

---

## 8. Accessibility Features

### 8.1 Input Methods

Four configurable input modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Keyboard/Touch** | Standard text input and tap | Default, most users |
| **Eye Tracking** | Large targets, dwell-to-click | Users with limited mobility |
| **Switch Scanning** | Sequential navigation with switches | Users with minimal movement |
| **Voice Input** | Speak instead of typing | Users who can speak but not type |

### 8.2 Visual Accessibility

**High Contrast Mode:**
- Pure black background
- Pure white text
- No grays or subtle colors
- WCAG AAA compliant contrast ratios

**Large Text Mode:**
- Increases all font sizes
- Normal: `text-base` → Large: `text-lg`
- Responsive scaling on desktop
- Maintains layout integrity

**Dark Mode:**
- Full dark mode styling
- Automatic system preference detection
- Manual override available

### 8.3 Motor Accessibility

**Touch Targets:**
- Minimum 44x44px on all interactive elements
- Adequate spacing between buttons (gap-3, gap-4)
- Large suggestion cards

**Fatigue Considerations:**
- Quick response buttons reduce typing
- Auto-listen reduces clicks
- Pre-composed phrases minimize effort
- Conversation context maintained

### 8.4 Screen Reader Support

- ARIA labels on all interactive elements
- Semantic HTML structure (button, section, main, header)
- Meaningful button/link text
- Form field descriptions
- Alert announcements

---

## 9. Settings & Configuration

### 9.1 Settings Page Layout

Two-column responsive layout:

**Left Column:**
- Voice Settings
- Patient Profile
- Account & Sync

**Right Column:**
- Emergency Contacts
- Input Method
- Accessibility

### 9.2 Data Persistence

All settings stored in `localStorage` via Zustand:

**Persisted:**
- Voice settings (provider, ID, name)
- Patient profile (all fields)
- Medical equipment selection
- Emergency contacts
- UI preferences (contrast, text size, input mode)
- Phrase usage analytics
- Onboarding completion status

**Session-only (not persisted):**
- Current input text
- Generated suggestions
- Conversation history
- Error states
- Speaking/listening flags

---

## 10. Analytics & Learning

### 10.1 Phrase Usage Tracking

For each phrase spoken:

| Field | Description |
|-------|-------------|
| `text` | The phrase text |
| `useCount` | Total times spoken |
| `lastUsed` | Timestamp of last use |
| `hourlyUsage` | Usage count by hour (0-23) |
| `category` | LLM-assigned category |

### 10.2 Style Learning

**Recent Phrases:**
- Stores last 20 phrases spoken
- Most recent first
- Injected into LLM prompts as few-shot examples

**How It Works:**
1. User speaks: "I would appreciate some water, please"
2. Phrase stored in `recentPhrases`
3. Next prediction includes these examples
4. LLM learns to match style (polite, length, vocabulary)

### 10.3 Suggestion Feedback

Tracked for future model improvement:

| Metric | Description |
|--------|-------------|
| `accepted` | Suggestion used as-is |
| `rejected` | "None of these" clicked |
| `editedBeforeSpeaking` | Suggestion modified before use |

### 10.4 Time-Based Patterns

Usage tracked by hour of day:

- Predicts relevant phrases for current time
- Weights suggestions toward time-appropriate options
- ±1 hour window for smoothing

---

## 11. API Endpoints

### 11.1 Prediction API

**Endpoint:** `POST /api/predict`

**Purpose:** Generate AI suggestions for phrase expansion or response generation

**Request:**
```json
{
  "input": "water",
  "otherPersonSaid": "How are you feeling?",
  "conversationHistory": [
    { "role": "patient", "content": "...", "timestamp": 1234567890 }
  ],
  "patientProfile": {
    "name": "John",
    "personality": "friendly",
    "interests": "gardening",
    "equipment": { "respirator": true }
  },
  "recentPhrases": ["Thank you", "I appreciate it"]
}
```

**Response:**
```json
{
  "suggestions": [
    "I would like some water, please",
    "Can you bring me water?",
    "Is there water available?"
  ]
}
```

### 11.2 Speak API

**Endpoint:** `POST /api/speak`

**Purpose:** Generate speech audio via ElevenLabs

**Request:**
```json
{
  "text": "I would like some water, please",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "speed": 0.9
}
```

**Response:** Binary audio/mpeg stream

**Endpoint:** `GET /api/speak`

**Purpose:** List available ElevenLabs voices

**Response:**
```json
{
  "voices": [
    { "id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "labels": {} }
  ]
}
```

### 11.3 Categorize API

**Endpoint:** `POST /api/categorize`

**Purpose:** Classify phrases into categories

**Request:**
```json
{
  "phrases": ["I need water", "Thank you", "I love you"]
}
```

**Response:**
```json
{
  "categories": {
    "I need water": "needs",
    "Thank you": "social",
    "I love you": "social"
  }
}
```

**Categories:** greetings, needs, responses, feelings, requests, social, medical, other

### 11.4 Transcribe API

**Endpoint:** `POST /api/transcribe`

**Purpose:** Transcribe audio to text (iOS fallback)

**Request:** `multipart/form-data` with audio blob

**Response:**
```json
{
  "transcript": "How are you doing today?"
}
```

### 11.5 Clone Voice API

**Endpoint:** `POST /api/clone-voice`

**Purpose:** Create cloned voice from audio samples

**Request:** `multipart/form-data` with name, description, files[]

**Response:**
```json
{
  "voiceId": "abc123xyz789",
  "name": "My Voice"
}
```

**Endpoint:** `DELETE /api/clone-voice?voiceId=abc123xyz789`

**Purpose:** Delete cloned voice

### 11.6 Emergency API

**Endpoint:** `POST /api/emergency`

**Purpose:** Send emergency alerts via Twilio

**Request:**
```json
{
  "patientName": "John Smith",
  "caregiverPhones": ["+14155551234"],
  "message": "Emergency alert",
  "location": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "phone": "+14155551234", "call": "initiated", "sms": "sent" }
  ]
}
```

---

## 12. Technical Architecture

### 12.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x |
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand + localStorage |
| LLM | Google Gemini API (gemini-2.0-flash) |
| TTS | ElevenLabs API |
| STT | Web Speech API + Gemini fallback |
| Emergency | Twilio API |
| Deployment | Firebase Hosting |

### 12.2 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main communicator interface
│   ├── layout.tsx            # Root layout, metadata
│   ├── globals.css           # Global styles
│   ├── settings/
│   │   └── page.tsx          # Settings dashboard
│   └── api/
│       ├── predict/route.ts  # LLM suggestions
│       ├── speak/route.ts    # TTS generation
│       ├── categorize/route.ts # Phrase categorization
│       ├── transcribe/route.ts # Audio transcription
│       ├── clone-voice/route.ts # Voice cloning
│       └── emergency/route.ts # Emergency alerts
├── components/
│   ├── InputArea.tsx         # Text input
│   ├── ComposeArea.tsx       # Edit before speaking
│   ├── SuggestionCard.tsx    # Single suggestion
│   ├── SuggestionList.tsx    # Suggestion container
│   ├── QuickPhrases.tsx      # Phrase library
│   ├── FatigueActions.tsx    # Quick responses
│   ├── ListeningMode.tsx     # Speech recognition UI
│   ├── ConversationHeader.tsx # Conversation context
│   ├── HomeActions.tsx       # Entry point cards
│   ├── EmergencyButton.tsx   # Emergency trigger
│   ├── VoiceRecorder.tsx     # Voice cloning interface
│   ├── VoiceBanner.tsx       # Clone promotion
│   └── Onboarding.tsx        # First-time flow
├── services/
│   ├── prediction.ts         # Gemini client
│   ├── voice.ts              # TTS + iOS unlock
│   ├── speechRecognition.ts  # Web Speech API
│   └── categorization.ts     # Phrase categorization
├── stores/
│   ├── app.ts                # Main app state
│   └── analytics.ts          # Usage tracking
└── lib/
    ├── prompts.ts            # LLM system prompts
    ├── phrases.ts            # Phrase library
    └── utils.ts              # Helpers
```

### 12.3 State Management

**App Store** (`src/stores/app.ts`):
- Input and suggestions state
- Voice settings (persisted)
- Patient profile (persisted)
- Conversation history
- UI state (listening, speaking)
- Accessibility settings (persisted)

**Analytics Store** (`src/stores/analytics.ts`):
- Phrase usage tracking (persisted)
- Recent phrases for style learning (persisted)
- Suggestion feedback metrics

---

## 13. External Integrations

### 13.1 Google Gemini API

**Model:** `gemini-2.0-flash`

**Uses:**
1. Text expansion / response generation
2. Audio transcription (iOS fallback)
3. Phrase categorization

**Configuration:**
- Temperature: 0.7 (suggestions), 0.1 (transcription)
- Max tokens: 500 (suggestions), 200 (transcription)

**Environment Variable:** `GEMINI_API_KEY`

### 13.2 ElevenLabs API

**Uses:**
1. Text-to-speech synthesis
2. Voice library browsing
3. Voice cloning

**Default Model:** `eleven_turbo_v2_5`

**Default Voice:** Rachel (`21m00Tcm4TlvDq8ikWAM`)

**Environment Variable:** `ELEVENLABS_API_KEY`

### 13.3 Twilio API

**Uses:**
1. Emergency phone calls (TwiML)
2. Emergency SMS messages

**Environment Variables:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### 13.4 Firebase

**Uses:**
1. Hosting (production deployment)
2. Future: Authentication, Firestore sync

**Deployment:** `firebase deploy`

---

## Appendix A: Environment Variables

```bash
# Required
GEMINI_API_KEY=          # Google Gemini API key
ELEVENLABS_API_KEY=      # ElevenLabs API key

# Optional (for emergency feature)
TWILIO_ACCOUNT_SID=      # Twilio account SID
TWILIO_AUTH_TOKEN=       # Twilio auth token
TWILIO_PHONE_NUMBER=     # Twilio phone number (E.164)
```

---

## Appendix B: Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Lint code
npm run lint

# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

---

## Appendix C: Testing Checklist

1. **Text Expansion**: Type word → get suggestions → speak one
2. **Conversation Mode**: Start → listen → respond → continue
3. **Quick Phrases**: Browse Emergency, Basic, Needs categories
4. **Voice Settings**: Change voice, test playback
5. **Patient Profile**: Update name, equipment, relationships
6. **Emergency Alert**: Configure contacts, test alert (with caution)
7. **iOS Testing**: Test on iPhone/iPad Safari and Chrome
8. **Persistence**: Refresh page → verify settings persist
9. **Accessibility**: Test high contrast, large text modes

---

*Document generated January 2025*
