'use client';

import { PatientEquipment } from '@/stores/app';
import { PhraseUsage, PhraseCategory, useAnalyticsStore } from '@/stores/analytics';
import { getSmartPhrases, getPhrasesByCategory, CATEGORY_ORDER } from '@/lib/phrases';
import { useMemo } from 'react';

// Display names for LLM-assigned categories
const CATEGORY_DISPLAY_NAMES: Record<PhraseCategory, string> = {
  greetings: 'Greetings',
  needs: 'Needs',
  responses: 'Quick Responses',
  feelings: 'Feelings',
  requests: 'Requests',
  social: 'Social',
  medical: 'Medical',
  other: 'Other',
};

// Order for displaying LLM categories
const LLM_CATEGORY_ORDER: PhraseCategory[] = [
  'greetings',
  'responses',
  'needs',
  'requests',
  'social',
  'feelings',
  'medical',
  'other',
];

interface QuickPhrase {
  id: string;
  text: string;
  category: string;
}

interface QuickPhrasesProps {
  equipment: PatientEquipment;
  onSelect: (phrase: QuickPhrase) => void;
  onSpeakNow?: (phrase: QuickPhrase) => void;
  isExpanded: boolean;
  onToggle: () => void;
  learnedPhrases?: PhraseUsage[];
  disabled?: boolean;
}

// Speaker icon component
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}

// Phrase row component - Apple-style list row with speaker icon
function PhraseRow({
  phrase,
  onSelect,
  onSpeakNow,
  disabled,
}: {
  phrase: QuickPhrase;
  onSelect: (phrase: QuickPhrase) => void;
  onSpeakNow?: (phrase: QuickPhrase) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-stretch bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
      {/* Main area - tap to edit */}
      <button
        onClick={() => onSelect(phrase)}
        disabled={disabled}
        className="
          flex-1 min-h-[56px] px-4 py-3
          text-left text-[17px] font-normal
          text-gray-900 dark:text-white
          hover:bg-gray-50 dark:hover:bg-gray-800
          active:bg-gray-100 dark:active:bg-gray-700
          disabled:opacity-50
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
        "
      >
        {phrase.text}
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-100 dark:bg-gray-800" />

      {/* Speaker button - tap to speak immediately */}
      <button
        onClick={() => onSpeakNow?.(phrase)}
        disabled={disabled || !onSpeakNow}
        className="
          w-[52px] min-h-[56px]
          flex items-center justify-center
          text-green-600 dark:text-green-500
          hover:bg-green-50 dark:hover:bg-green-900/20
          active:bg-green-100 dark:active:bg-green-900/30
          active:scale-95
          disabled:opacity-50
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500
        "
        aria-label={`Speak "${phrase.text}" now`}
      >
        <SpeakerIcon className="w-6 h-6" />
      </button>
    </div>
  );
}

// Section header component - iOS grouped list style
function SectionHeader({
  title,
  color = 'gray',
}: {
  title: string;
  color?: 'gray' | 'blue' | 'red' | 'purple';
}) {
  const colorClasses = {
    gray: 'text-gray-500 dark:text-gray-400',
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <h4 className={`text-[13px] font-semibold uppercase tracking-wider mb-2 px-1 ${colorClasses[color]}`}>
      {title}
    </h4>
  );
}

export function QuickPhrases({
  equipment,
  onSelect,
  onSpeakNow,
  isExpanded,
  onToggle,
  learnedPhrases = [],
  disabled = false,
}: QuickPhrasesProps) {
  // Get LLM-categorized phrases from analytics store
  const getPhrasesByCategoryFromStore = useAnalyticsStore((state) => state.getPhrasesByCategory);

  // Get smart phrases based on equipment and learned patterns
  const smartPhrases = useMemo(() => {
    const learnedIds = learnedPhrases.map((lp) => lp.text);
    return getSmartPhrases(equipment, learnedIds, 30);
  }, [equipment, learnedPhrases]);

  // Get preset phrases grouped by category (for expanded view)
  const presetGroupedPhrases = useMemo(() => {
    return getPhrasesByCategory(equipment);
  }, [equipment]);

  // Get user's LLM-categorized phrases
  const userCategorizedPhrases = useMemo(() => {
    return getPhrasesByCategoryFromStore();
  }, [getPhrasesByCategoryFromStore]);

  // Convert learned phrases to display format
  const frequentPhrases = useMemo(() => {
    return learnedPhrases.slice(0, 5).map((lp, idx) => ({
      id: `learned-${idx}`,
      text: lp.text,
      category: 'Frequent',
    }));
  }, [learnedPhrases]);

  // Combine frequent and smart phrases, avoiding duplicates
  const frequentTexts = new Set(frequentPhrases.map((p) => p.text.toLowerCase()));
  const smartWithoutDupes = smartPhrases.filter(
    (p) => !frequentTexts.has(p.text.toLowerCase())
  );

  // Show top 8 phrases in collapsed view (more than before)
  const topPhrases = [...frequentPhrases, ...smartWithoutDupes].slice(0, 8);
  const totalAvailable = Object.values(presetGroupedPhrases).flat().length;

  // Expanded: show all phrases grouped by category
  const sortedPresetCategories = Object.keys(presetGroupedPhrases).sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a);
    const bIdx = CATEGORY_ORDER.indexOf(b);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // Check if user has any categorized phrases
  const hasUserCategorizedPhrases = Object.values(userCategorizedPhrases).some(
    (phrases) => phrases && phrases.length > 0
  );

  return (
    <div>
      {/* Collapsed view - shown on mobile/tablet when not expanded, hidden on desktop */}
      <div className={`${isExpanded ? 'hidden' : 'block'} lg:hidden`}>
        <div className="space-y-2">
          {topPhrases.map((phrase) => (
            <PhraseRow
              key={phrase.id}
              phrase={phrase}
              onSelect={onSelect}
              onSpeakNow={onSpeakNow}
              disabled={disabled}
            />
          ))}

          {totalAvailable > 8 && (
            <button
              onClick={onToggle}
              className="
                w-full py-3 px-4
                text-[15px] font-medium
                text-blue-600 dark:text-blue-400
                bg-blue-50 dark:bg-blue-900/20
                hover:bg-blue-100 dark:hover:bg-blue-900/30
                rounded-xl
                transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              "
            >
              Show all {totalAvailable} phrases
            </button>
          )}
        </div>
      </div>

      {/* Expanded view - shown when expanded on mobile, or always on desktop (lg+) */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block`}>
        <div className="space-y-6">
          {/* Header with collapse button (hidden on large screens) */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Quick Phrases
            </h3>
            <button
              onClick={onToggle}
              className="
                lg:hidden
                px-3 py-1.5 rounded-lg
                text-sm font-medium
                text-blue-600 dark:text-blue-400
                hover:bg-blue-50 dark:hover:bg-blue-900/20
                transition-colors duration-200
              "
            >
              Show less
            </button>
          </div>

          {/* User's LLM-categorized phrases */}
          {hasUserCategorizedPhrases && (
            <>
              <div className="pb-2 border-b border-gray-200 dark:border-gray-700 mb-4">
                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Your Phrases
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Organized by how you use them
                </p>
              </div>

              {LLM_CATEGORY_ORDER.map((category) => {
                const phrases = userCategorizedPhrases[category];
                if (!phrases || phrases.length === 0) return null;

                return (
                  <div key={`user-${category}`}>
                    <SectionHeader title={CATEGORY_DISPLAY_NAMES[category]} color="blue" />
                    <div className="space-y-2">
                      {phrases.slice(0, 10).map((phraseUsage, idx) => (
                        <PhraseRow
                          key={`user-${category}-${idx}`}
                          phrase={{
                            id: `user-${category}-${idx}`,
                            text: phraseUsage.text,
                            category: category,
                          }}
                          onSelect={onSelect}
                          onSpeakNow={onSpeakNow}
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Divider between user phrases and preset phrases */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Suggested Phrases
                </h4>
              </div>
            </>
          )}

          {/* Learned/Frequent phrases - only show if no LLM categorized phrases */}
          {!hasUserCategorizedPhrases && frequentPhrases.length > 0 && (
            <div>
              <SectionHeader title="Your Frequent" color="blue" />
              <div className="space-y-2">
                {frequentPhrases.map((phrase) => (
                  <PhraseRow
                    key={phrase.id}
                    phrase={phrase}
                    onSelect={onSelect}
                    onSpeakNow={onSpeakNow}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preset Categories */}
          {sortedPresetCategories.map((category) => {
            const phrases = presetGroupedPhrases[category];
            if (!phrases || phrases.length === 0) return null;

            const isEmergency = category === 'Emergency';
            const isBreathing = category === 'Breathing';
            const isFeeding = category === 'Feeding';

            const headerColor = isEmergency
              ? 'red'
              : isBreathing || isFeeding
              ? 'purple'
              : 'gray';

            return (
              <div key={category}>
                <SectionHeader title={category} color={headerColor} />
                <div className="space-y-2">
                  {phrases.map((phrase) => (
                    <PhraseRow
                      key={phrase.id}
                      phrase={phrase}
                      onSelect={onSelect}
                      onSpeakNow={onSpeakNow}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
