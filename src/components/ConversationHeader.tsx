'use client';

interface ConversationHeaderProps {
  onEndConversation: () => void;
  lastMessage?: string | null;
  isListening?: boolean;
  isGenerating?: boolean;
}

export function ConversationHeader({
  onEndConversation,
  lastMessage,
  isListening,
  isGenerating,
}: ConversationHeaderProps) {
  return (
    <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/50 dark:to-gray-900 rounded-3xl overflow-hidden mb-6 shadow-sm">
      {/* Header bar */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
            In Conversation
          </span>
        </div>
        <button
          onClick={onEndConversation}
          className="
            min-h-[44px] px-4 rounded-xl
            bg-white dark:bg-gray-800
            text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            active:bg-gray-200 dark:active:bg-gray-600
            shadow-sm
            transition-all duration-150
            font-medium text-[15px]
            flex items-center gap-2
          "
          aria-label="End conversation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          End
        </button>
      </div>

      {/* Last message from other person */}
      {lastMessage && (
        <div className="px-5 pb-5">
          <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 mb-2 uppercase tracking-wider">
            They said
          </p>
          <p className="text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
            &ldquo;{lastMessage}&rdquo;
          </p>
        </div>
      )}

      {/* Status indicator */}
      {(isListening || isGenerating) && (
        <div className="px-5 pb-4 flex items-center gap-2">
          {isListening && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-sm text-indigo-600 dark:text-indigo-400">
                Listening...
              </span>
            </>
          )}
          {isGenerating && (
            <>
              <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
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
              <span className="text-sm text-indigo-600 dark:text-indigo-400">
                Generating responses...
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
