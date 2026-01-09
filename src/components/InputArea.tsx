'use client';

import { useState, useRef, FormEvent } from 'react';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function InputArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = 'Type a word or phrase...',
}: InputAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // No auto-focus on mobile - let user tap to open keyboard

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`
          flex items-center gap-2 p-2 rounded-2xl
          bg-white dark:bg-gray-800
          shadow-sm
          transition-all duration-200
          ${
            isFocused
              ? 'shadow-lg ring-2 ring-blue-500/50'
              : 'hover:shadow-md'
          }
        `}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={isLoading}
          className="
            flex-1 min-h-[52px] px-4 text-xl font-medium
            bg-transparent outline-none
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:opacity-50
          "
          aria-label="Enter a word or phrase to communicate"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="
              min-w-11 min-h-11 flex items-center justify-center
              rounded-xl text-gray-400
              hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              transition-all duration-150
            "
            aria-label="Clear input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="
            min-w-[52px] min-h-[52px] flex items-center justify-center
            rounded-xl bg-blue-500 text-white
            hover:bg-blue-600 active:bg-blue-700
            disabled:bg-gray-200 dark:disabled:bg-gray-700
            disabled:text-gray-400 dark:disabled:text-gray-500
            focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50
            transition-all duration-150
            active:scale-95
          "
          aria-label={isLoading ? 'Loading suggestions' : 'Get suggestions'}
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
