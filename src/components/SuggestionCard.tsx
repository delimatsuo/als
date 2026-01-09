'use client';

import { Suggestion } from '@/stores/app';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
  onSpeakNow?: (suggestion: Suggestion) => void;
  isSelected?: boolean;
  isPlaying?: boolean;
  index: number;
  showSpeakNow?: boolean;
}

export function SuggestionCard({
  suggestion,
  onSelect,
  onSpeakNow,
  isSelected,
  isPlaying,
  index,
  showSpeakNow = true,
}: SuggestionCardProps) {
  return (
    <div
      className={`
        group relative flex items-stretch rounded-2xl
        transition-all duration-200 ease-out
        ${
          isSelected
            ? 'bg-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02]'
            : isPlaying
              ? 'bg-green-500 shadow-lg shadow-green-500/25 scale-[1.02]'
              : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
        }
      `}
    >
      {/* Main button - selects for editing */}
      <button
        onClick={() => onSelect(suggestion)}
        className={`
          flex-1 min-h-[72px] p-5 text-left rounded-l-2xl
          focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50
          transition-colors duration-200
        `}
        aria-label={`Option ${index + 1}: ${suggestion.text}. Tap to edit before speaking.`}
      >
        <span
          className={`
            text-[17px] leading-relaxed font-medium
            ${isSelected || isPlaying ? 'text-white' : 'text-gray-900 dark:text-white'}
          `}
        >
          {suggestion.text}
        </span>
      </button>

      {/* Quick speak button */}
      {showSpeakNow && onSpeakNow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpeakNow(suggestion);
          }}
          disabled={isPlaying}
          className={`
            w-16 flex items-center justify-center
            rounded-r-2xl border-l
            transition-all duration-200
            focus:outline-none focus-visible:ring-4 focus-visible:ring-green-500/50
            ${
              isSelected
                ? 'border-blue-400 text-white/90 hover:text-white hover:bg-blue-600'
                : isPlaying
                  ? 'border-green-400 text-white'
                  : 'border-gray-100 dark:border-gray-700 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
            }
          `}
          aria-label={`Speak now: ${suggestion.text}`}
        >
          {isPlaying ? (
            <svg
              className="w-6 h-6 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
