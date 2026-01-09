'use client';

import { useRef, useEffect } from 'react';

interface ComposeAreaProps {
  text: string;
  onChange: (text: string) => void;
  onSpeak: () => void;
  onClear: () => void;
  isSpeaking: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

export function ComposeArea({
  text,
  onChange,
  onSpeak,
  onClear,
  isSpeaking,
  isLoading,
  placeholder = 'Your message...',
}: ComposeAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialFocusDone = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Focus and move cursor to end ONLY when text is initially populated
  // (e.g., when selecting a suggestion), not on every keystroke
  useEffect(() => {
    if (text && !initialFocusDone.current && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
      initialFocusDone.current = true;
    } else if (!text) {
      // Reset when text is cleared, so next population will focus again
      initialFocusDone.current = false;
    }
  }, [text]);

  const hasText = text.trim().length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
      {/* Editable text area */}
      <div className="p-5 pb-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={isSpeaking}
          className="
            w-full min-h-[60px] p-0
            text-xl leading-relaxed font-medium
            bg-transparent outline-none resize-none
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:opacity-50
          "
          aria-label="Edit your message before speaking"
        />
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-3">
        {/* Clear button */}
        <button
          onClick={onClear}
          disabled={isSpeaking || !hasText}
          className="
            min-w-[56px] min-h-[56px] px-5 rounded-2xl
            bg-gray-100 dark:bg-gray-700
            text-gray-600 dark:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-600
            active:bg-gray-300 dark:active:bg-gray-500
            disabled:opacity-40 disabled:pointer-events-none
            focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-500/30
            transition-all duration-200
            font-semibold text-[17px]
          "
          aria-label="Clear message"
        >
          Clear
        </button>

        {/* SPEAK button - Primary action, most prominent */}
        <button
          onClick={onSpeak}
          disabled={isSpeaking || isLoading || !hasText}
          className="
            flex-1 min-h-[56px] px-6 rounded-2xl
            bg-green-500 text-white
            hover:bg-green-600 active:bg-green-700
            disabled:bg-gray-200 dark:disabled:bg-gray-700
            disabled:text-gray-400 dark:disabled:text-gray-500
            disabled:pointer-events-none
            focus:outline-none focus-visible:ring-4 focus-visible:ring-green-500/50
            transition-all duration-200
            font-bold text-xl tracking-wide
            flex items-center justify-center gap-3
            shadow-lg shadow-green-500/30
            hover:shadow-xl hover:shadow-green-500/40
            active:shadow-md active:scale-[0.98]
          "
          aria-label={isSpeaking ? 'Speaking...' : 'Speak this message'}
        >
          {isSpeaking ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              Speaking
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              Speak
            </>
          )}
        </button>
      </div>
    </div>
  );
}
