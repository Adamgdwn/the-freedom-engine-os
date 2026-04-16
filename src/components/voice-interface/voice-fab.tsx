'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';

import { useVoiceSession } from './voice-context';

const VOICE_CTA = {
  idle: {
    label: 'Start Freedom Voice',
    hint: 'Open a continuous voice session',
  },
  connecting: {
    label: 'Starting…',
    hint: 'Preparing microphone and session',
  },
  listening: {
    label: 'Listening…',
    hint: 'Tap to end the active session',
  },
  processing: {
    label: 'Processing…',
    hint: 'Tap to cancel the current turn',
  },
  speaking: {
    label: 'Interrupt Freedom',
    hint: 'Stop the reply and return to listening',
  },
  error: {
    label: 'Retry Freedom Voice',
    hint: 'Reconnect the voice session',
  },
} as const;

export function VoiceFab() {
  const { state, connect, disconnect, interrupt } = useVoiceSession();

  function handlePress() {
    if (state === 'idle' || state === 'error') void connect();
    else if (state === 'speaking') interrupt();
    else disconnect();
  }

  const active = state !== 'idle' && state !== 'error';
  const cta = VOICE_CTA[state];

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={handlePress}
      aria-label={cta.label}
      className={clsx(
        'fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-colors duration-300 lg:hidden',
        active
          ? 'border-[color:var(--primary-strong)] bg-[color:var(--primary)] text-white'
          : 'border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--ink)]',
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/10">
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
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold">{cta.label}</p>
        <p className={clsx('truncate text-xs', active ? 'text-white/76' : 'text-[color:var(--ink-soft)]')}>
          {cta.hint}
        </p>
      </div>
    </motion.button>
  );
}
