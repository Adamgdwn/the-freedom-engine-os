'use client';
import Link from 'next/link';

import { VoiceOrb }          from './voice-orb';
import { useVoiceSession }   from './voice-context';

/**
 * Sidebar panel that replaces the static "North star" block.
 * Consumes shared VoiceSessionContext — state is in sync with VoiceFab.
 */
export function VoicePanel() {
  const {
    state,
    transcript,
    connect,
    disconnect,
    interrupt,
    tasks,
    learningSignals,
    programmingRequests,
    emailStatus,
    pendingEmailDraft,
    sendPendingEmailDraft,
    dismissPendingEmailDraft,
  } = useVoiceSession();

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
      {tasks.length > 0 ? (
        <div className="mt-4 border-t border-[color:var(--line)] pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Active threads
          </p>
          <ul className="mt-2 space-y-1">
            {tasks.slice(0, 3).map((task) => (
              <li key={task.id} className="text-xs text-[color:var(--ink-soft)]">
                - {task.topic}
                {task.status === 'ready' ? ' (ready to review)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {learningSignals.length > 0 ? (
        <div className="mt-4 border-t border-[color:var(--line)] pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Learning now
          </p>
          <ul className="mt-2 space-y-1">
            {learningSignals.slice(0, 2).map((signal) => (
              <li key={signal.id} className="text-xs text-[color:var(--ink-soft)]">
                - {signal.topic} ({signal.status})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {programmingRequests.some((request) => request.status === 'pending') ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/6 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Needs approval
          </p>
          <ul className="mt-2 space-y-1">
            {programmingRequests
              .filter((request) => request.status === 'pending')
              .slice(0, 2)
              .map((request) => (
                <li key={request.id} className="text-xs text-[color:var(--ink-soft)]">
                  - {request.capability}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 border-t border-[color:var(--line)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Email
          </p>
          <Link
            href="/communications"
            className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--primary)]"
          >
            Manage
          </Link>
        </div>
        <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
          {emailStatus.enabled
            ? `${emailStatus.recipientCount} trusted recipients ready`
            : 'Email delivery not configured yet'}
        </p>
        {pendingEmailDraft ? (
          <div className="mt-3 rounded-2xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/8 p-3">
            <p className="text-xs font-medium text-[color:var(--ink)]">
              {pendingEmailDraft.subject}
            </p>
            <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
              To {pendingEmailDraft.recipientLabel ?? pendingEmailDraft.recipientDestination}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void sendPendingEmailDraft()}
                className="rounded-full bg-[color:var(--primary)] px-3 py-1 text-xs text-white transition hover:bg-[color:var(--primary-strong)]"
              >
                Send
              </button>
              <button
                onClick={dismissPendingEmailDraft}
                className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--ink-soft)] transition hover:text-[color:var(--danger)]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
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
