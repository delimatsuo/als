'use client';

import { useState } from 'react';
import Link from 'next/link';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 'welcome' | 'voice' | 'profile' | 'tutorial';

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState({
    respirator: false,
    feedingTube: false,
    wheelchair: false,
  });

  const steps: OnboardingStep[] = ['welcome', 'voice', 'profile', 'tutorial'];
  const currentIndex = steps.indexOf(step);

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      onComplete();
    }
  };

  const goBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  // Progress dots
  const ProgressDots = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, idx) => (
        <div
          key={s}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            idx === currentIndex
              ? 'bg-blue-500 w-6'
              : idx < currentIndex
              ? 'bg-blue-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      {/* Safe area padding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <ProgressDots />

          {/* ===== STEP 1: Welcome ===== */}
          {step === 'welcome' && (
            <div className="text-center">
              {/* App Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>

              <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-3">
                Welcome to ALS Communicator
              </h1>
              <p className="text-[17px] text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                Your voice, powered by AI. Type a word, and we&apos;ll help you say complete sentences.
              </p>

              <button
                onClick={goNext}
                className="w-full h-[50px] bg-blue-500 hover:bg-blue-600 text-white text-[17px] font-semibold rounded-xl transition-colors duration-200 active:scale-[0.98]"
              >
                Get Started
              </button>

              <button
                onClick={onSkip}
                className="mt-4 text-[17px] text-blue-500 hover:text-blue-600 font-medium"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ===== STEP 2: Voice Setup ===== */}
          {step === 'voice' && (
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2 text-center">
                Choose Your Voice
              </h1>
              <p className="text-[17px] text-gray-500 dark:text-gray-400 mb-8 text-center">
                How would you like to sound?
              </p>

              <div className="space-y-3 mb-8">
                {/* Clone Voice Option */}
                <Link
                  href="/settings"
                  onClick={onComplete}
                  className="block w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all duration-200 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        Clone My Voice
                      </h3>
                      <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Record samples to sound like yourself
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Pre-made Voice Option */}
                <Link
                  href="/settings"
                  onClick={onComplete}
                  className="block w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        Use a Pre-made Voice
                      </h3>
                      <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Choose from high-quality voices
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="text-[17px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="text-[17px] text-blue-500 hover:text-blue-600 font-medium"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: Quick Profile ===== */}
          {step === 'profile' && (
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2 text-center">
                Tell Us About You
              </h1>
              <p className="text-[17px] text-gray-500 dark:text-gray-400 mb-8 text-center">
                This helps AI suggest better responses
              </p>

              <div className="space-y-6 mb-8">
                {/* Name Input */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What&apos;s your name?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-[50px] px-4 text-[17px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Equipment Checkboxes */}
                <div>
                  <label className="block text-[15px] font-medium text-gray-700 dark:text-gray-300 mb-3">
                    What equipment do you use? (optional)
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'respirator', label: 'Respirator / BiPAP' },
                      { key: 'feedingTube', label: 'Feeding tube' },
                      { key: 'wheelchair', label: 'Wheelchair' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={equipment[key as keyof typeof equipment]}
                          onChange={(e) =>
                            setEquipment({ ...equipment, [key]: e.target.checked })
                          }
                          className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-[17px] text-gray-900 dark:text-white">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className="w-full h-[50px] bg-blue-500 hover:bg-blue-600 text-white text-[17px] font-semibold rounded-xl transition-colors duration-200 active:scale-[0.98] mb-4"
              >
                Continue
              </button>

              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="text-[17px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="text-[17px] text-blue-500 hover:text-blue-600 font-medium"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 4: Tutorial ===== */}
          {step === 'tutorial' && (
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2 text-center">
                How to Use
              </h1>
              <p className="text-[17px] text-gray-500 dark:text-gray-400 mb-8 text-center">
                Three simple ways to communicate
              </p>

              <div className="space-y-3 mb-10">
                {/* Quick Phrases */}
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        Quick Phrases
                      </h3>
                      <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Tap to speak common phrases instantly
                      </p>
                    </div>
                  </div>
                </div>

                {/* Listen */}
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        Listen to Them
                      </h3>
                      <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5">
                        We&apos;ll hear and suggest responses
                      </p>
                    </div>
                  </div>
                </div>

                {/* Say Something */}
                <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
                        Say Something
                      </h3>
                      <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Type a word, we&apos;ll expand it
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="w-full h-[50px] bg-green-500 hover:bg-green-600 text-white text-[17px] font-semibold rounded-xl transition-colors duration-200 active:scale-[0.98]"
              >
                Start Communicating
              </button>

              <button
                onClick={goBack}
                className="mt-4 w-full text-[17px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
