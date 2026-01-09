'use client';

interface FatigueActionsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

const FATIGUE_ACTIONS = [
  { id: 'yes', text: 'Yes', icon: '✓' },
  { id: 'yes-please', text: 'Yes, please', icon: '✓' },
  { id: 'no', text: 'No', icon: '✕' },
  { id: 'no-thanks', text: 'No, thank you', icon: '✕' },
  { id: 'rest', text: 'I need rest', icon: null },
  { id: 'later', text: "Let's talk later", icon: null },
];

export function FatigueActions({ onSelect, disabled }: FatigueActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FATIGUE_ACTIONS.map((action, idx) => (
        <button
          key={action.id}
          onClick={() => onSelect(action.text)}
          disabled={disabled}
          className={`
            min-h-[48px] px-5 py-2.5 rounded-2xl
            font-semibold text-[15px]
            transition-all duration-150
            active:scale-95
            disabled:opacity-40 disabled:pointer-events-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
            ${
              idx < 4
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:shadow-md'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
            }
          `}
        >
          {action.text}
        </button>
      ))}
    </div>
  );
}
