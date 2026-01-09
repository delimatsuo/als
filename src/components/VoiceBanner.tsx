'use client';

import Link from 'next/link';

interface VoiceBannerProps {
  onDismiss: () => void;
}

export function VoiceBanner({ onDismiss }: VoiceBannerProps) {
  return (
    <div className="relative bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-xl p-4 mb-6">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-8">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white">
            Sound like yourself
          </h3>
          <p className="text-[15px] text-gray-600 dark:text-gray-400 mt-0.5">
            Clone your voice in 2 minutes
          </p>
          <Link
            href="/settings"
            className="inline-block mt-2 text-[15px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          >
            Set Up My Voice
          </Link>
        </div>
      </div>
    </div>
  );
}
