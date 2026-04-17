'use client';

import { useState, useTransition } from 'react';

import { Panel } from '@/components/panel';
import { useVoiceSession } from '@/components/voice-interface';
import {
  isActivePersonaOverlay,
  type FreedomPersonaOverlay,
  type PersonaOverlayStatus,
} from '@/lib/freedom-persona';

function describePersonaChange(
  overlay: FreedomPersonaOverlay,
  overlayLabels: Map<string, string>,
) {
  if (!overlay.targetOverlayId) {
    return overlay.changeType === 'new' ? 'New overlay request' : 'Standalone persona change';
  }

  const targetLabel = overlayLabels.get(overlay.targetOverlayId) ?? 'prior overlay';

  if (overlay.changeType === 'revision') {
    return `Revises ${targetLabel}`;
  }

  if (overlay.changeType === 'retirement') {
    return `Retires ${targetLabel}`;
  }

  return `Linked to ${targetLabel}`;
}

export function PersonaControlPanel() {
  const { personaOverlays, updatePersonaOverlayStatus } = useVoiceSession();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const overlayLabels = new Map(personaOverlays.map((overlay) => [overlay.id, overlay.title]));

  const pending = personaOverlays.filter((overlay) => overlay.status === 'pending');
  const approved = personaOverlays.filter(isActivePersonaOverlay);
  const history = personaOverlays.filter((overlay) => overlay.status !== 'pending' && !isActivePersonaOverlay(overlay));

  function handleStatusChange(overlayId: string, status: PersonaOverlayStatus, successNotice: string) {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice(null);
          await updatePersonaOverlayStatus(overlayId, status);
          setNotice(successNotice);
        } catch (currentError) {
          setError(currentError instanceof Error ? currentError.message : 'Could not update persona overlay.');
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Freedom Persona"
        eyebrow="Stable core"
        aside="Freedom proposes personality refinements. The operator approves, denies, or retires them here."
      >
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
              Core prompt artifact
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              Freedom&apos;s stable identity, response protocol, and governance posture now live in the
              versioned prompt artifacts under <span className="font-mono text-[color:var(--ink)]">agents/freedom_agent/prompts/</span>.
              That core persona is not meant to be edited directly from this UI.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
              Operating rule
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              Freedom can request persona overlays when repeated interaction shows a stable benefit.
              Those overlays do not become active until approved. Content changes should originate from
              Freedom through governed requests, not ad hoc operator rewriting.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
              Allowed evolution paths
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              Freedom can propose three governed changes here: a new overlay, a revision that supersedes an
              active overlay after approval, or a retirement request when an overlay has become stale,
              redundant, or counterproductive.
            </p>
          </div>
        </div>
        {notice ? (
          <p className="mt-4 text-sm text-[color:var(--primary)]">{notice}</p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p>
        ) : null}
      </Panel>

      <Panel
        title="Pending Persona Adjustments"
        eyebrow="Awaiting approval"
        aside={`${pending.length} pending`}
      >
        <div className="space-y-4">
          {pending.length > 0 ? (
            pending.map((overlay) => (
              <div
                key={overlay.id}
                className="rounded-[1.5rem] border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/6 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--ink)]">{overlay.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                      {describePersonaChange(overlay, overlayLabels)} • requested {new Date(overlay.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-[color:var(--accent)]/12 px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
                    {overlay.changeType}
                  </span>
                </div>
                {overlay.instruction ? (
                  <p className="mt-3 text-sm leading-6 text-[color:var(--ink)]">{overlay.instruction}</p>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                  Rationale: {overlay.rationale}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                  Origin: {overlay.source}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleStatusChange(overlay.id, 'approved', 'Persona overlay approved.')}
                    disabled={isPending}
                    className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm text-white transition hover:bg-[color:var(--primary-strong)] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(overlay.id, 'denied', 'Persona overlay denied.')}
                    disabled={isPending}
                    className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--danger)] transition hover:bg-[color:var(--danger)]/5 disabled:opacity-60"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
              No persona adjustments are waiting for approval right now.
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="Active Overlays"
          eyebrow="Live personality refinements"
          aside={`${approved.length} active`}
        >
          <div className="space-y-4">
            {approved.length > 0 ? (
              approved.map((overlay) => (
                <div
                  key={overlay.id}
                  className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--ink)]">{overlay.title}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                        {describePersonaChange(overlay, overlayLabels)} • approved overlay
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusChange(overlay.id, 'retired', 'Persona overlay retired.')}
                      disabled={isPending}
                      className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--danger)] disabled:opacity-60"
                    >
                      Retire
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--ink)]">{overlay.instruction}</p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                    Rationale: {overlay.rationale}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    Origin: {overlay.source}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
                No approved persona overlays are active yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Decision History"
          eyebrow="Resolved persona requests"
          aside={`${history.length} resolved`}
        >
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((overlay) => (
                <div
                  key={overlay.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-[color:var(--ink)]">{overlay.title}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[color:var(--ink-soft)]">
                      {overlay.changeType} • {overlay.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    {describePersonaChange(overlay, overlayLabels)} • origin: {overlay.source}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{overlay.rationale}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
                No resolved persona-overlay history yet.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
