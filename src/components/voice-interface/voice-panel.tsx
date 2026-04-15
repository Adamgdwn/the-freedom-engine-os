'use client';
import { VoiceOrb }          from './voice-orb';
import { useVoiceSession }   from './voice-context';

/**
 * Sidebar panel that replaces the static "North star" block.
 * Consumes shared VoiceSessionContext — state is in sync with VoiceFab.
 */
export function VoicePanel() {
  const { state, transcript, connect, disconnect, interrupt } = useVoiceSession();

  function handleOrbClick() {
    if (state === 'idle' || state === 'error') {
      void connect();
    } else if (state === 'speaking') {
      interrupt();
    } else {
      disconnect();
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/75 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--ink-soft)]">
        Freedom Voice
      </p>
      <div className="mt-4 flex justify-center">
        <VoiceOrb state={state} transcript={transcript} onClick={handleOrbClick} />
      </div>
      {state !== 'idle' ? (
        <button
          onClick={disconnect}
          className="mt-4 w-full rounded-full py-1.5 text-xs text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--danger)]"
        >
          End session
        </button>
      ) : null}
    </div>
  );
}
