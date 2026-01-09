'use client';

import { Suggestion } from '@/stores/app';
import { SuggestionCard } from './SuggestionCard';

interface SuggestionListProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  onSpeakNow?: (suggestion: Suggestion) => void;
  onNoneOfThese: () => void;
  selectedId?: string;
  playingId?: string;
  isLoading?: boolean;
}

export function SuggestionList({
  suggestions,
  onSelect,
  onSpeakNow,
  onNoneOfThese,
  selectedId,
  playingId,
  isLoading,
}: SuggestionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[72px] bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
            aria-hidden="true"
          />
        ))}
        <p className="sr-only">Loading suggestions...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        className="text-center py-16"
        role="status"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          What would you like to say?
        </p>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Type a word or tap the mic to listen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Sentence suggestions">
      {suggestions.map((suggestion, index) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onSelect={onSelect}
          onSpeakNow={onSpeakNow}
          isSelected={selectedId === suggestion.id}
          isPlaying={playingId === suggestion.id}
          index={index}
        />
      ))}

      <button
        onClick={onNoneOfThese}
        className="
          w-full min-h-[56px] px-5 py-4 text-center rounded-2xl
          text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800
          active:bg-gray-200 dark:active:bg-gray-700
          focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30
          transition-all duration-200
        "
        aria-label="None of these match - try again"
      >
        <span className="font-medium">None of these</span>
      </button>
    </div>
  );
}
