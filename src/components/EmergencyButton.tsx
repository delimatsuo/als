'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app';

interface EmergencyButtonProps {
  className?: string;
}

export function EmergencyButton({ className = '' }: EmergencyButtonProps) {
  const { patientProfile } = useAppStore();
  const [isTriggering, setIsTriggering] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const triggerEmergency = useCallback(async () => {
    if (patientProfile.emergencyContacts.length === 0) {
      alert('No emergency contacts configured. Please add contacts in Settings.');
      return;
    }

    setIsTriggering(true);
    setResult(null);

    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientProfile.name || 'ALS Patient',
          caregiverPhones: patientProfile.emergencyContacts.map(c => c.phone),
          message: `Emergency alert from ${patientProfile.name || 'your loved one'}. They need help immediately.`,
        }),
      });

      if (response.ok) {
        setResult('success');
      } else {
        const data = await response.json();
        console.error('Emergency alert failed:', data);
        setResult('error');
      }
    } catch (err) {
      console.error('Emergency alert error:', err);
      setResult('error');
    } finally {
      setIsTriggering(false);
      setShowConfirm(false);
      // Reset result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    }
  }, [patientProfile]);

  const hasContacts = patientProfile.emergencyContacts.length > 0;

  // Confirmation dialog
  if (showConfirm) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Send Emergency Alert?
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will call and text {patientProfile.emergencyContacts.length} contact{patientProfile.emergencyContacts.length > 1 ? 's' : ''}:
            </p>

            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 space-y-1">
              {patientProfile.emergencyContacts.map(c => (
                <div key={c.id}>{c.name} ({c.relationship})</div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 px-6 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-lg"
              >
                Cancel
              </button>
              <button
                onClick={triggerEmergency}
                disabled={isTriggering}
                className="flex-1 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg disabled:opacity-50"
              >
                {isTriggering ? 'Sending...' : 'Yes, Alert Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success/Error feedback
  if (result) {
    return (
      <div className={`p-4 rounded-2xl ${result === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} ${className}`}>
        <div className="flex items-center gap-3">
          {result === 'success' ? (
            <>
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold text-green-700 dark:text-green-300">
                Emergency alert sent to all contacts
              </span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="font-semibold text-red-700 dark:text-red-300">
                Failed to send alert. Try calling directly.
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Main emergency button
  return (
    <button
      onClick={() => hasContacts ? setShowConfirm(true) : alert('Add emergency contacts in Settings first')}
      className={`
        w-full py-5 px-6 rounded-2xl
        bg-red-600 hover:bg-red-700 active:bg-red-800
        text-white font-bold text-xl
        flex items-center justify-center gap-3
        shadow-lg shadow-red-600/30
        transition-all duration-150
        ${!hasContacts ? 'opacity-50' : ''}
        ${className}
      `}
    >
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      EMERGENCY ALERT
    </button>
  );
}
