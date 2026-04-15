'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { VOICE_STATE_LABELS, type VoiceState } from '@/lib/voice-session';

const ORB_COLOR: Record<VoiceState, string> = {
  idle:       'bg-[color:var(--surface-strong)] border-[color:var(--line)]',
  connecting: 'bg-[color:var(--surface-strong)] border-[color:var(--primary)]',
  listening:  'bg-[color:var(--primary)]        border-[color:var(--primary-strong)]',
  processing: 'bg-[color:var(--accent)]         border-amber-700',
  speaking:   'bg-[color:var(--primary)]        border-[color:var(--primary-strong)]',
  error:      'bg-[color:var(--danger)]         border-red-900',
};

// Pulse amplitude and speed map to voice states.
// speaking is fastest/largest to signal active output.
const PULSE_VARIANTS = {
  idle:       { scale: 1 },
  connecting: { scale: [1, 1.04, 1] as number[], transition: { repeat: Infinity, duration: 1.2 } },
  listening:  { scale: [1, 1.06, 1] as number[], transition: { repeat: Infinity, duration: 2.0 } },
  processing: { scale: [1, 1.10, 1] as number[], transition: { repeat: Infinity, duration: 0.8 } },
  speaking:   { scale: [1, 1.14, 1] as number[], transition: { repeat: Infinity, duration: 0.55 } },
  error:      { scale: 1 },
};

export function VoiceOrb({
  state,
  transcript,
  onClick,
}: {
  state:      VoiceState;
  transcript: string;
  onClick():  void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        animate={PULSE_VARIANTS[state]}
        onClick={onClick}
        aria-label={VOICE_STATE_LABELS[state]}
        className={clsx(
          'h-16 w-16 rounded-full border-2 shadow-md transition-colors duration-300 cursor-pointer',
          ORB_COLOR[state],
        )}
      />
      <p className="text-xs font-medium text-[color:var(--ink-soft)]">
        {VOICE_STATE_LABELS[state]}
      </p>
      {transcript ? (
        <p className="max-w-[220px] text-center text-xs leading-5 text-[color:var(--ink)]">
          {transcript}
        </p>
      ) : null}
    </div>
  );
}
