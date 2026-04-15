'use client';
import { motion }          from 'framer-motion';
import clsx                from 'clsx';
import { useVoiceSession } from './voice-context';

/**
 * Fixed floating action button — mobile only (hidden on lg+).
 * Shares state with VoicePanel via VoiceSessionContext.
 */
export function VoiceFab() {
  const { state, connect, disconnect, interrupt } = useVoiceSession();

  function handlePress() {
    if (state === 'idle' || state === 'error') void connect();
    else if (state === 'speaking') interrupt();
    else disconnect();
  }

  const active = state !== 'idle' && state !== 'error';

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={handlePress}
      aria-label="Toggle Freedom voice"
      className={clsx(
        'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center',
        'rounded-full border-2 shadow-lg transition-colors duration-300 lg:hidden',
        active
          ? 'border-[color:var(--primary-strong)] bg-[color:var(--primary)] text-white'
          : 'border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--ink)]',
      )}
    >
      {/* Microphone icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8"  y1="23" x2="16" y2="23" />
      </svg>
    </motion.button>
  );
}
