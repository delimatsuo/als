'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore, Suggestion, QuickPhrase } from '@/stores/app';
import { useAnalyticsStore } from '@/stores/analytics';
import { getPredictions, generateResponses } from '@/services/prediction';
import { categorizePhrase } from '@/services/categorization';
import { speak, stop, initVoices, setupAudioUnlock } from '@/services/voice';
import { InputArea } from '@/components/InputArea';
import { SuggestionList } from '@/components/SuggestionList';
import { QuickPhrases } from '@/components/QuickPhrases';
import { ComposeArea } from '@/components/ComposeArea';
import { ListeningMode } from '@/components/ListeningMode';
import { FatigueActions } from '@/components/FatigueActions';
import { HomeActions } from '@/components/HomeActions';
import { Onboarding } from '@/components/Onboarding';
import { VoiceBanner } from '@/components/VoiceBanner';

// Home screen modes
type HomeMode = 'home' | 'saySomething' | 'quickPhrases';

export default function Home() {
  const {
    inputText,
    setInputText,
    suggestions,
    setSuggestions,
    clearSuggestions,
    isLoading,
    setIsLoading,
    error,
    setError,
    isSpeaking,
    setIsSpeaking,
    isListening,
    setIsListening,
    isInConversationMode,
    setConversationMode,
    lastOtherPersonMessage,
    setLastOtherPersonMessage,
    endConversation,
    conversationHistory,
    addToHistory,
    voiceProvider,
    voiceId,
    patientProfile,
    largeText,
    highContrast,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    dismissedVoiceBanner,
    setDismissedVoiceBanner,
  } = useAppStore();

  const { recordPhraseUsage, getTopPhrasesForHour, getRecentPhrases, setCategoryForPhrase, phraseUsage } = useAnalyticsStore();

  const [playingId, setPlayingId] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [composeText, setComposeText] = useState('');
  const [quickPhrasesExpanded, setQuickPhrasesExpanded] = useState(false);
  const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
  const [homeMode, setHomeMode] = useState<HomeMode>('home');

  // Initialize voices on mount
  useEffect(() => {
    initVoices();
  }, []);

  // Setup automatic audio unlock on user interaction (required for iOS/iPad)
  // Uses touchend (iOS 9+), touchstart, mousedown, and keydown events
  // Based on Howler.js and web-audio-touch-unlock techniques
  useEffect(() => {
    setupAudioUnlock();
  }, []);

  // Get time-aware learned phrases (memoized to avoid recalculation on every render)
  const learnedPhrases = useMemo(() => {
    const currentHour = new Date().getHours();
    return getTopPhrasesForHour(currentHour, 5); // Get top 5 phrases for this time
  }, [getTopPhrasesForHour]);

  const handleSubmit = useCallback(
    async (input: string) => {
      setIsLoading(true);
      setError(null);
      clearSuggestions();
      setComposeText('');
      setSelectedId(undefined);

      // Get recent phrases for style learning (5 most recent)
      const recentPhrases = getRecentPhrases(5);

      const result = await getPredictions({
        type: 'expand',
        input,
        conversationHistory: conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        patientProfile,
        recentPhrases,
      });

      setIsLoading(false);

      if (result.error) {
        setError(result.error);
      } else {
        setSuggestions(result.suggestions);
      }
    },
    [
      setIsLoading,
      setError,
      clearSuggestions,
      conversationHistory,
      patientProfile,
      setSuggestions,
      getRecentPhrases,
    ]
  );

  // Handle when transcript from listening mode is ready
  const handleTranscriptReady = useCallback(
    async (transcript: string) => {
      setIsListening(false);
      setIsGeneratingResponses(true);
      setError(null);
      clearSuggestions();
      setComposeText('');
      setSelectedId(undefined);

      // Enter conversation mode and store what they said
      if (!isInConversationMode) {
        setConversationMode(true);
      }
      setLastOtherPersonMessage(transcript);

      // Add what the other person said to conversation history
      addToHistory({
        role: 'other',
        content: transcript,
        timestamp: Date.now(),
      });

      // Get recent phrases for style learning (5 most recent)
      const recentPhrases = getRecentPhrases(5);

      // Generate response suggestions
      const result = await generateResponses(
        transcript,
        conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        patientProfile,
        recentPhrases
      );

      setIsGeneratingResponses(false);

      if (result.error) {
        setError(result.error);
      } else {
        setSuggestions(result.suggestions);
      }
    },
    [
      setIsListening,
      setError,
      clearSuggestions,
      addToHistory,
      conversationHistory,
      patientProfile,
      setSuggestions,
      isInConversationMode,
      setConversationMode,
      setLastOtherPersonMessage,
      getRecentPhrases,
    ]
  );

  // Cancel listening mode
  const handleCancelListening = useCallback(() => {
    setIsListening(false);
  }, [setIsListening]);

  // Start listening mode
  const handleStartListening = useCallback(() => {
    setIsListening(true);
    clearSuggestions();
    setComposeText('');
    setSelectedId(undefined);
  }, [setIsListening, clearSuggestions]);

  // Speak text function
  const speakText = useCallback(
    async (text: string, id?: string, skipAutoListen?: boolean) => {
      stop();
      setPlayingId(id);
      setIsSpeaking(true);

      // Enter conversation mode when patient initiates speech
      if (!isInConversationMode) {
        setConversationMode(true);
      }

      await speak({
        text,
        provider: voiceProvider,
        voiceId: voiceId || undefined,
        onStart: () => {
          setIsSpeaking(true);
        },
        onEnd: () => {
          setPlayingId(undefined);
          setIsSpeaking(false);
          // Add to conversation history (patient is the ALS user)
          addToHistory({
            role: 'patient',
            content: text,
            timestamp: Date.now(),
          });
          // Record phrase usage for learning
          recordPhraseUsage(text);

          // Background categorization - only if not already categorized
          const phraseKey = text.toLowerCase().trim();
          if (!phraseUsage[phraseKey]?.category) {
            categorizePhrase(text).then((category) => {
              if (category) {
                setCategoryForPhrase(text, category);
              }
            });
          }

          // Clear compose area after speaking
          setComposeText('');
          setSelectedId(undefined);
          setInputText('');
          clearSuggestions();

          // Auto-start listening for the other person's response
          // Always auto-listen after speaking (patient initiated conversation)
          // unless skipAutoListen is true (for fatigue/end conversation phrases)
          if (!skipAutoListen) {
            setTimeout(() => {
              setIsListening(true);
            }, 500); // Brief pause for natural conversation flow
          }
        },
        onError: (err) => {
          console.error('Speech error:', err);
          setPlayingId(undefined);
          setIsSpeaking(false);
          setError('Failed to speak. Please try again.');
        },
      });
    },
    [voiceProvider, voiceId, setIsSpeaking, addToHistory, setError, setInputText, clearSuggestions, isInConversationMode, setConversationMode, setIsListening, recordPhraseUsage, setCategoryForPhrase, phraseUsage]
  );

  // Select suggestion for editing
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    setSelectedId(suggestion.id);
    setComposeText(suggestion.text);
  }, []);

  // Speak suggestion immediately (without editing)
  const handleSpeakNow = useCallback(
    (suggestion: Suggestion) => {
      speakText(suggestion.text, suggestion.id);
    },
    [speakText]
  );

  // Speak from compose area
  const handleSpeakCompose = useCallback(() => {
    if (composeText.trim()) {
      speakText(composeText.trim(), selectedId);
    }
  }, [composeText, selectedId, speakText]);

  // Clear compose area
  const handleClearCompose = useCallback(() => {
    setComposeText('');
    setSelectedId(undefined);
  }, []);

  // Select quick phrase for editing (or speak if very short)
  const handleSelectQuickPhrase = useCallback((phrase: QuickPhrase) => {
    // Short phrases like "Yes", "No" can go directly to compose
    setComposeText(phrase.text);
    setSelectedId(phrase.id);
    setQuickPhrasesExpanded(false);
    setHomeMode('home'); // Return to home after selecting
  }, []);

  // Speak quick phrase immediately (speaker icon tap)
  const handleSpeakQuickPhraseNow = useCallback(
    (phrase: QuickPhrase) => {
      speakText(phrase.text, phrase.id);
      setQuickPhrasesExpanded(false);
      setHomeMode('home');
    },
    [speakText]
  );

  const handleNoneOfThese = useCallback(() => {
    clearSuggestions();
    setComposeText('');
    setSelectedId(undefined);
  }, [clearSuggestions]);

  const handleStopSpeaking = useCallback(() => {
    stop();
    setPlayingId(undefined);
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  // Handle ending conversation mode
  const handleEndConversation = useCallback(() => {
    endConversation();
    clearSuggestions();
    setComposeText('');
    setSelectedId(undefined);
    setInputText('');
  }, [endConversation, clearSuggestions, setInputText]);

  // Handle fatigue action selection (quick responses)
  const handleFatigueAction = useCallback(
    (text: string) => {
      // Phrases that typically end conversation - skip auto-listen
      const endConversationPhrases = ['I need rest', "Let's talk later", 'I need to rest'];
      const shouldSkipAutoListen = endConversationPhrases.some(
        (phrase) => text.toLowerCase().includes(phrase.toLowerCase())
      );
      // Speak the fatigue response
      speakText(text, undefined, shouldSkipAutoListen);
    },
    [speakText]
  );

  // Dynamic classes based on settings
  const textSizeClass = largeText ? 'text-lg md:text-xl' : 'text-base md:text-lg';
  const contrastClass = highContrast
    ? 'bg-black text-white'
    : 'bg-gray-50 dark:bg-black';

  const hasComposeText = composeText.trim().length > 0;

  return (
    <div className={`min-h-screen ${contrastClass}`}>
      {/* Header - Apple style navigation bar */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150 ${
          highContrast
            ? 'bg-black/95 border-b border-white/20'
            : 'bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/10'
        }`}
      >
        <div className="container-responsive">
          <div className="h-14 md:h-16 flex items-center justify-between">
            <h1
              className={`text-lg md:text-xl font-semibold tracking-tight ${
                highContrast ? 'text-white' : 'text-gray-900 dark:text-white'
              }`}
            >
              Communicator
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              {isSpeaking && (
                <button
                  onClick={handleStopSpeaking}
                  className="h-10 md:h-11 px-4 md:px-5 rounded-full bg-red-500 text-white font-semibold text-sm md:text-base hover:bg-red-600 active:scale-95 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/25"
                  aria-label="Stop speaking"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
              <Link
                href="/settings"
                className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                  highContrast
                    ? 'hover:bg-white/20 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}
                aria-label="Settings"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container-responsive py-6 md:py-8 lg:py-10 pb-12 ${textSizeClass}`}>

        {/* ==================== LISTENING MODE ==================== */}
        {isListening && (
          <section aria-label="Listening mode" className="max-w-2xl mx-auto lg:max-w-3xl">
            <ListeningMode
              onTranscriptReady={handleTranscriptReady}
              onCancel={handleCancelListening}
              onEndConversation={handleEndConversation}
              isGenerating={isGeneratingResponses}
              autoSubmit={isInConversationMode}
              silenceTimeout={2000}
            />
          </section>
        )}

        {/* ==================== CONVERSATION MODE ==================== */}
        {isInConversationMode && !isListening && (
          <div className="max-w-2xl mx-auto lg:max-w-4xl">
            {/* End Conversation Button - PROMINENT */}
            <button
              onClick={handleEndConversation}
              className="w-full mb-6 md:mb-8 py-4 md:py-5 px-6 rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-[0.98] text-white font-bold text-lg md:text-xl flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              End Conversation
            </button>

            {/* What They Said */}
            {lastOtherPersonMessage && (
              <div className="mb-6 md:mb-8 p-5 md:p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border-l-4 border-indigo-500">
                <p className="text-xs md:text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  They said
                </p>
                <p className="text-xl md:text-2xl text-gray-900 dark:text-white font-medium leading-relaxed">
                  &ldquo;{lastOtherPersonMessage}&rdquo;
                </p>
              </div>
            )}

            {/* Compose Area - when editing a response */}
            {hasComposeText && (
              <section className="mb-6 md:mb-8" aria-label="Compose message">
                <ComposeArea
                  text={composeText}
                  onChange={setComposeText}
                  onSpeak={handleSpeakCompose}
                  onClear={handleClearCompose}
                  isSpeaking={isSpeaking}
                />
              </section>
            )}

            {/* Quick Responses (Yes, No, I need rest) */}
            {!hasComposeText && (
              <section className="mb-6 md:mb-8" aria-label="Quick responses">
                <FatigueActions
                  onSelect={handleFatigueAction}
                  disabled={isSpeaking}
                />
              </section>
            )}

            {/* Response Suggestions */}
            {!hasComposeText && (
              <section aria-label="Suggested responses">
                <SuggestionList
                  suggestions={suggestions}
                  onSelect={handleSelectSuggestion}
                  onSpeakNow={handleSpeakNow}
                  onNoneOfThese={handleNoneOfThese}
                  selectedId={selectedId}
                  playingId={playingId}
                  isLoading={isLoading || isGeneratingResponses}
                />
              </section>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 md:p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" role="alert">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== IDLE MODE (No conversation) ==================== */}
        {!isInConversationMode && !isListening && (
          <>
            {/* Compose Area - when editing */}
            {hasComposeText ? (
              <section className="max-w-2xl mx-auto lg:max-w-3xl mb-6 md:mb-8" aria-label="Compose message">
                <ComposeArea
                  text={composeText}
                  onChange={setComposeText}
                  onSpeak={handleSpeakCompose}
                  onClear={handleClearCompose}
                  isSpeaking={isSpeaking}
                />
              </section>
            ) : (
              <>
                {/* ===== HOME MODE: Three entry points ===== */}
                {homeMode === 'home' && suggestions.length === 0 && !isLoading && (
                  <div className="max-w-lg mx-auto">
                    {/* Voice Cloning Banner - show if not dismissed and no custom voice */}
                    {!dismissedVoiceBanner && !voiceId && (
                      <VoiceBanner onDismiss={() => setDismissedVoiceBanner(true)} />
                    )}

                    {/* Welcome Header */}
                    <div className="text-center mb-8">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        What would you like to do?
                      </h2>
                    </div>

                    {/* Three Action Cards */}
                    <section className="mb-8" aria-label="Main actions">
                      <HomeActions
                        onSaySomething={() => setHomeMode('saySomething')}
                        onListenToThem={handleStartListening}
                        onQuickPhrases={() => setHomeMode('quickPhrases')}
                      />
                    </section>

                    {/* Quick access phrases (top 4) */}
                    <section aria-label="Quick phrases preview">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Quick Access
                        </h3>
                        <button
                          onClick={() => setHomeMode('quickPhrases')}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          See all
                        </button>
                      </div>
                      <div className="space-y-2">
                        {[...learnedPhrases.slice(0, 2).map((lp, idx) => ({
                          id: `quick-${idx}`,
                          text: lp.text,
                          category: 'Frequent',
                        })),
                        { id: 'quick-yes', text: 'Yes', category: 'Common' },
                        { id: 'quick-yes-please', text: 'Yes, please', category: 'Common' },
                        { id: 'quick-no', text: 'No', category: 'Common' },
                        { id: 'quick-no-thanks', text: 'No, thank you', category: 'Common' },
                        ].slice(0, 6).map((phrase) => (
                          <div
                            key={phrase.id}
                            className="flex items-stretch bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800"
                          >
                            <button
                              onClick={() => handleSelectQuickPhrase(phrase)}
                              className="flex-1 min-h-[52px] px-4 py-2.5 text-left text-[17px] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              {phrase.text}
                            </button>
                            <div className="w-px bg-gray-100 dark:bg-gray-800" />
                            <button
                              onClick={() => handleSpeakQuickPhraseNow(phrase)}
                              className="w-[52px] flex items-center justify-center text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 active:scale-95 transition-all"
                              aria-label={`Speak "${phrase.text}" now`}
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* ===== SAY SOMETHING MODE: Input + Suggestions ===== */}
                {(homeMode === 'saySomething' || suggestions.length > 0 || isLoading) && (
                  <div className="max-w-2xl mx-auto lg:max-w-3xl">
                    {/* Back button */}
                    {homeMode === 'saySomething' && suggestions.length === 0 && !isLoading && (
                      <button
                        onClick={() => setHomeMode('home')}
                        className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    )}

                    {/* Input Area */}
                    <section className="mb-6" aria-label="Input area">
                      <InputArea
                        value={inputText}
                        onChange={setInputText}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        placeholder="Type a word or phrase..."
                      />
                    </section>

                    {/* Suggestions */}
                    {(suggestions.length > 0 || isLoading) && (
                      <section aria-label="Suggestions">
                        <SuggestionList
                          suggestions={suggestions}
                          onSelect={handleSelectSuggestion}
                          onSpeakNow={handleSpeakNow}
                          onNoneOfThese={() => {
                            handleNoneOfThese();
                            setHomeMode('home');
                          }}
                          selectedId={selectedId}
                          playingId={playingId}
                          isLoading={isLoading}
                        />
                      </section>
                    )}
                  </div>
                )}

                {/* ===== QUICK PHRASES MODE: Full phrase list ===== */}
                {homeMode === 'quickPhrases' && suggestions.length === 0 && !isLoading && (
                  <div className="max-w-2xl mx-auto lg:max-w-3xl">
                    {/* Back button */}
                    <button
                      onClick={() => setHomeMode('home')}
                      className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>

                    <section aria-label="Quick phrases">
                      <QuickPhrases
                        equipment={patientProfile.equipment}
                        onSelect={handleSelectQuickPhrase}
                        onSpeakNow={handleSpeakQuickPhraseNow}
                        isExpanded={true}
                        onToggle={() => setHomeMode('home')}
                        learnedPhrases={learnedPhrases}
                        disabled={isSpeaking}
                      />
                    </section>
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="max-w-2xl mx-auto mt-6 p-4 md:p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" role="alert">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Onboarding Overlay - shown for first-time users */}
      {!hasCompletedOnboarding && (
        <Onboarding
          onComplete={() => setHasCompletedOnboarding(true)}
          onSkip={() => setHasCompletedOnboarding(true)}
        />
      )}
    </div>
  );
}
