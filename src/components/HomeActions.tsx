'use client';

interface HomeAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

interface HomeActionsProps {
  onSaySomething: () => void;
  onListenToThem: () => void;
  onQuickPhrases: () => void;
}

export function HomeActions({
  onSaySomething,
  onListenToThem,
  onQuickPhrases,
}: HomeActionsProps) {
  const actions: HomeAction[] = [
    {
      id: 'say',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      title: 'Say Something',
      subtitle: "Type a word, we'll expand it into sentences",
      onClick: onSaySomething,
    },
    {
      id: 'listen',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 12a3 3 0 100-6 3 3 0 000 6z"
          />
        </svg>
      ),
      title: 'Listen to Them',
      subtitle: "We'll hear what they say and suggest responses",
      onClick: onListenToThem,
    },
    {
      id: 'quick',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      title: 'Quick Phrases',
      subtitle: 'Tap to speak common phrases instantly',
      onClick: onQuickPhrases,
    },
  ];

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="
            w-full flex items-start gap-4 p-4
            bg-white dark:bg-gray-900
            rounded-2xl
            shadow-sm hover:shadow-md
            border border-gray-100 dark:border-gray-800
            transition-all duration-200
            active:scale-[0.98] active:bg-gray-50 dark:active:bg-gray-800
            text-left
            min-h-[80px]
          "
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="
            flex-shrink-0 w-12 h-12
            flex items-center justify-center
            rounded-xl
            bg-gradient-to-br from-indigo-500 to-purple-600
            text-white
            shadow-sm
          ">
            {action.icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {action.title}
            </h3>
            <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              {action.subtitle}
            </p>
          </div>
          <div className="flex-shrink-0 self-center">
            <svg
              className="w-5 h-5 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
