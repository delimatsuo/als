'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/stores/app';
import {
  getElevenLabsVoices,
  ElevenLabsVoice,
  speak,
} from '@/services/voice';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { AuthSection } from '@/components/AuthSection';

export default function SettingsPage() {
  const {
    voiceProvider,
    setVoiceProvider,
    voiceId,
    setVoiceId,
    voiceName,
    setVoiceName,
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    inputMode,
    setInputMode,
    patientProfile,
    setPatientProfile,
  } = useAppStore();

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [customVoiceId, setCustomVoiceId] = useState(voiceId || '');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);

  // Fetch ElevenLabs voices on mount
  useEffect(() => {
    async function fetchVoices() {
      setIsLoadingVoices(true);
      const fetchedVoices = await getElevenLabsVoices();
      setVoices(fetchedVoices);
      setIsLoadingVoices(false);
    }
    fetchVoices();
  }, []);

  const handleVoiceSelect = (voice: ElevenLabsVoice) => {
    setVoiceId(voice.id);
    setVoiceName(voice.name);
    setVoiceProvider('elevenlabs');
    // Sync the custom voice ID field with selected voice
    setCustomVoiceId(voice.id);
  };

  const handleCustomVoiceId = () => {
    if (customVoiceId.trim()) {
      setVoiceId(customVoiceId.trim());
      setVoiceName('Custom Voice');
      setVoiceProvider('elevenlabs');
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 2000);
    }
  };

  const handleUseBrowserVoice = () => {
    setVoiceProvider('browser');
    setVoiceId(null);
    setVoiceName(null);
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    await speak({
      text: 'Testing voice settings now. This is a longer phrase to help you evaluate how natural the voice sounds. I can speak complete sentences clearly. The quick brown fox jumps over the lazy dog. How does this sound to you?',
      provider: voiceProvider,
      voiceId: voiceId || undefined,
      onEnd: () => setIsTesting(false),
      onError: () => setIsTesting(false),
    });
  };

  const handleVoiceCloned = async (clonedVoiceId: string, clonedVoiceName: string) => {
    setVoiceId(clonedVoiceId);
    setVoiceName(clonedVoiceName);
    setVoiceProvider('elevenlabs');
    setShowVoiceRecorder(false);
    // Refresh voices list to include the new cloned voice
    const fetchedVoices = await getElevenLabsVoices();
    setVoices(fetchedVoices);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header - Apple style navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150 bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/10">
        <div className="container-responsive">
          <div className="h-14 md:h-16 flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 active:scale-95"
              aria-label="Back to home"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="container-responsive py-6 md:py-8 lg:py-10 pb-24">
        {/* Two-column layout for larger screens */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12">

          {/* Left Column - Primary Settings */}
          <div className="lg:col-span-7 space-y-8 md:space-y-10">

            {/* Account & Sync */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                Account
              </h2>
              <AuthSection />
            </section>

            {/* Voice Settings */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                Voice Settings
              </h2>

              {/* Clone Your Voice Card */}
              {showVoiceRecorder ? (
                <div className="mb-5">
                  <VoiceRecorder
                    onVoiceCloned={handleVoiceCloned}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="w-full mb-5 p-5 md:p-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl text-left hover:from-purple-600 hover:to-indigo-600 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-purple-500/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-lg md:text-xl">
                        Clone Your Voice
                      </p>
                      <p className="text-white/80 text-sm md:text-base">
                        Record samples to create a personalized voice that sounds like you
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Test Current Voice */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-5 mb-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Current Voice: {voiceProvider === 'elevenlabs' ? voiceName || 'ElevenLabs' : 'Browser Default'}
                    </p>
                    {voiceProvider === 'elevenlabs' && voiceId && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1 truncate">
                        ID: {voiceId}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleTestVoice}
                    disabled={isTesting}
                    className="min-h-11 px-5 md:px-6 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 active:scale-95 disabled:opacity-50 transition-all duration-200 flex-shrink-0"
                  >
                    {isTesting ? 'Playing...' : 'Test Voice'}
                  </button>
                </div>
              </div>

              {/* Voice Selection Options */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Select a Voice
                </p>

                {/* Option 1: Use Custom Voice ID */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="p-4 md:p-5">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      Use My Custom Voice
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Enter your Voice ID from ElevenLabs (from cloning above or your account)
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={customVoiceId}
                        onChange={(e) => setCustomVoiceId(e.target.value)}
                        placeholder="Paste your Voice ID here..."
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <button
                        onClick={handleCustomVoiceId}
                        disabled={!customVoiceId.trim()}
                        className={`px-5 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                          voiceSaved
                            ? 'bg-green-500 text-white'
                            : voiceProvider === 'elevenlabs' && voiceId === customVoiceId.trim()
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:bg-gray-300 dark:disabled:bg-gray-600'
                        }`}
                      >
                        {voiceSaved ? 'Saved!' : voiceProvider === 'elevenlabs' && voiceId === customVoiceId.trim() ? 'Active' : 'Use This'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option 2: ElevenLabs Library Voices */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ElevenLabs Library Voices
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Pre-made high-quality voices
                        </p>
                      </div>
                      {isLoadingVoices && (
                        <span className="text-sm text-gray-500">Loading...</span>
                      )}
                    </div>

                    {voices.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {voices.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => handleVoiceSelect(voice)}
                            className={`w-full p-3 md:p-4 text-left rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                              voiceId === voice.id && voiceProvider === 'elevenlabs'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {voice.name}
                                </p>
                                {voice.labels && Object.keys(voice.labels).length > 0 && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {Object.values(voice.labels).join(', ')}
                                  </p>
                                )}
                              </div>
                              {voiceId === voice.id && voiceProvider === 'elevenlabs' && (
                                <span className="text-green-500 text-sm font-semibold">Active</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No voices available from ElevenLabs.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Option 3: Browser Default */}
                <button
                  onClick={handleUseBrowserVoice}
                  className={`w-full p-4 md:p-5 text-left rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${
                    voiceProvider === 'browser'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Browser Default Voice
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Uses your device&apos;s built-in text-to-speech (free, works offline)
                      </p>
                    </div>
                    {voiceProvider === 'browser' && (
                      <span className="text-green-500 text-sm font-semibold">Active</span>
                    )}
                  </div>
                </button>
              </div>
            </section>

            {/* Patient Profile */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                Patient Profile
              </h2>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-5">
                Help the AI generate more personalized and relevant responses by providing some context about yourself.
              </p>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-5 shadow-sm">
                {/* Name */}
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={patientProfile.name}
                    onChange={(e) => setPatientProfile({ name: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Personality/Communication Style */}
                <div>
                  <label
                    htmlFor="profile-personality"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Communication Style
                  </label>
                  <input
                    id="profile-personality"
                    type="text"
                    value={patientProfile.personality}
                    onChange={(e) => setPatientProfile({ personality: e.target.value })}
                    placeholder="e.g., friendly and warm, formal, direct, humorous"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    How do you typically communicate? This helps match your voice.
                  </p>
                </div>

                {/* Interests */}
                <div>
                  <label
                    htmlFor="profile-interests"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Interests
                  </label>
                  <input
                    id="profile-interests"
                    type="text"
                    value={patientProfile.interests}
                    onChange={(e) => setPatientProfile({ interests: e.target.value })}
                    placeholder="e.g., gardening, sports, cooking, reading"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Common Topics */}
                <div>
                  <label
                    htmlFor="profile-topics"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Common Topics
                  </label>
                  <input
                    id="profile-topics"
                    type="text"
                    value={patientProfile.commonTopics}
                    onChange={(e) => setPatientProfile({ commonTopics: e.target.value })}
                    placeholder="e.g., family updates, daily care, medical appointments"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Topics you frequently discuss with others.
                  </p>
                </div>

                {/* Relationships */}
                <div>
                  <label
                    htmlFor="profile-relationships"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Key Relationships
                  </label>
                  <textarea
                    id="profile-relationships"
                    value={patientProfile.relationships}
                    onChange={(e) => setPatientProfile({ relationships: e.target.value })}
                    placeholder="e.g., spouse: Maria, children: John and Sarah, caregiver: Mike"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Names of people you often talk to or about.
                  </p>
                </div>

                {/* Additional Context */}
                <div>
                  <label
                    htmlFor="profile-context"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Additional Context
                  </label>
                  <textarea
                    id="profile-context"
                    value={patientProfile.additionalContext}
                    onChange={(e) => setPatientProfile({ additionalContext: e.target.value })}
                    placeholder="Any other information that might help generate better responses..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Medical Equipment */}
                <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Medical Equipment
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Select equipment you use so we can show relevant quick phrases.
                  </p>
                  <div className="space-y-3">
                    {([
                      { key: 'respirator' as const, label: 'Respirator / BiPAP', desc: 'Breathing support device' },
                      { key: 'suctionMachine' as const, label: 'Suction Machine', desc: 'For airway clearance' },
                      { key: 'feedingTube' as const, label: 'Feeding Tube (PEG/G-tube)', desc: 'Nutritional support' },
                      { key: 'wheelchair' as const, label: 'Wheelchair', desc: 'Mobility device' },
                      { key: 'hospitalBed' as const, label: 'Hospital Bed', desc: 'With adjustable controls' },
                    ] as const).map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={patientProfile.equipment?.[item.key] ?? false}
                          onChange={(e) =>
                            setPatientProfile({
                              equipment: {
                                ...patientProfile.equipment,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Secondary Settings */}
          <div className="lg:col-span-5 space-y-8 md:space-y-10 mt-8 lg:mt-0">

            {/* Emergency Contacts */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-red-600 dark:text-red-400 mb-4 md:mb-5 tracking-tight">
                Emergency Contacts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                These contacts will be called and texted when you trigger an emergency alert.
              </p>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-5 space-y-4 shadow-sm">
                {/* Existing contacts */}
                {patientProfile.emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {contact.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {contact.phone} · {contact.relationship}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPatientProfile({
                          emergencyContacts: patientProfile.emergencyContacts.filter(
                            (c) => c.id !== contact.id
                          ),
                        });
                      }}
                      className="p-2.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                      aria-label={`Remove ${contact.name}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Add new contact form */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Add Emergency Contact
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Name (e.g., Maria)"
                      id="new-contact-name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (e.g., +1 555 123 4567)"
                      id="new-contact-phone"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Relationship (e.g., spouse, caregiver)"
                      id="new-contact-relationship"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => {
                        const nameInput = document.getElementById('new-contact-name') as HTMLInputElement;
                        const phoneInput = document.getElementById('new-contact-phone') as HTMLInputElement;
                        const relInput = document.getElementById('new-contact-relationship') as HTMLInputElement;

                        const name = nameInput?.value.trim();
                        const phone = phoneInput?.value.trim().replace(/\s+/g, '');
                        const relationship = relInput?.value.trim();

                        if (name && phone) {
                          setPatientProfile({
                            emergencyContacts: [
                              ...patientProfile.emergencyContacts,
                              {
                                id: `ec-${Date.now()}`,
                                name,
                                phone,
                                relationship: relationship || 'Contact',
                              },
                            ],
                          });
                          // Clear inputs
                          if (nameInput) nameInput.value = '';
                          if (phoneInput) phoneInput.value = '';
                          if (relInput) relInput.value = '';
                        }
                      }}
                      className="w-full py-3.5 px-4 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold rounded-xl transition-all duration-200"
                    >
                      Add Contact
                    </button>
                  </div>
                </div>

                {patientProfile.emergencyContacts.length === 0 && (
                  <p className="text-center text-amber-600 dark:text-amber-400 text-sm py-3">
                    Add at least one emergency contact to enable the Emergency Alert feature.
                  </p>
                )}
              </div>
            </section>

            {/* Input Mode */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                Input Method
              </h2>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                {[
                  { id: 'keyboard', label: 'Keyboard / Touch', desc: 'Standard text input' },
                  { id: 'eyegaze', label: 'Eye Tracking', desc: 'Control with eye movements' },
                  { id: 'switch', label: 'Switch Scanning', desc: 'Use switches to scan and select' },
                  { id: 'voice', label: 'Voice Input', desc: 'Speak to input text' },
                ].map((mode, index) => (
                  <button
                    key={mode.id}
                    onClick={() => setInputMode(mode.id as typeof inputMode)}
                    className={`w-full p-4 md:p-5 text-left ${
                      index < 3 ? 'border-b border-gray-200 dark:border-gray-800' : ''
                    } transition-all duration-200 ${
                      inputMode === mode.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          inputMode === mode.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {inputMode === mode.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {mode.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {mode.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Accessibility */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                Accessibility
              </h2>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                {/* High Contrast */}
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      High Contrast
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                      highContrast ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={highContrast}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                        highContrast ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Large Text */}
                <div className="p-4 md:p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Large Text
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Increase text size throughout the app
                    </p>
                  </div>
                  <button
                    onClick={() => setLargeText(!largeText)}
                    className={`w-14 h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                      largeText ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={largeText}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                        largeText ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* About */}
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-5 tracking-tight">
                About
              </h2>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 md:p-6 shadow-sm">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  ALS Communicator is an LLM-powered communication assistant designed
                  to help people with ALS communicate more easily and quickly.
                </p>
              </div>
            </section>

            {/* Admin Link */}
            <section>
              <Link
                href="/admin"
                className="block w-full p-4 md:p-5 bg-gray-800 dark:bg-gray-800 hover:bg-gray-700 dark:hover:bg-gray-700 rounded-2xl text-center text-gray-300 hover:text-white transition-all duration-200"
              >
                <span className="text-sm font-medium">Admin Dashboard</span>
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
