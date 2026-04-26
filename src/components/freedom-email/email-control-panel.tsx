'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { useVoiceSession } from '@/components/voice-interface';
import { Panel } from '@/components/panel';

export function EmailControlPanel() {
  const {
    emailStatus,
    emailRecipients,
    recentEmailDeliveries,
    pendingEmailDraft,
    sendPendingEmailDraft,
    dismissPendingEmailDraft,
  } = useVoiceSession();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSendDraft() {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice(null);
          await sendPendingEmailDraft();
          setNotice('Freedom sent the pending email.');
        } catch (currentError) {
          setError(currentError instanceof Error ? currentError.message : 'Could not send pending email.');
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Freedom Email"
        eyebrow="Trusted outbound"
        aside={
          emailStatus.enabled
            ? `Ready from ${emailStatus.fromAddress ?? 'configured sender'}`
            : 'Add Resend env vars on the server before sending externally.'
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Provider', emailStatus.provider],
            ['Trusted recipients', emailRecipients.length.toString()],
            ['Recent deliveries', recentEmailDeliveries.length.toString()],
          ].map(([labelText, value]) => (
            <div
              key={labelText}
              className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
            >
              <p className="text-sm text-[color:var(--ink-soft)]">{labelText}</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
            How it works
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
            Freedom can prepare an email draft from voice, but it will not send until you confirm.
            Trusted email now comes from the contact registry on the Contacts page, with this panel kept as the governed send and audit surface.
          </p>
        </div>

        {pendingEmailDraft ? (
          <div className="mt-5 rounded-[1.5rem] border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/8 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
              Pending confirmation
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
              {pendingEmailDraft.subject}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              To: {pendingEmailDraft.recipientLabel ?? pendingEmailDraft.recipientDestination}
            </p>
            {pendingEmailDraft.intro ? (
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {pendingEmailDraft.intro}
              </p>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink)]">
              {pendingEmailDraft.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSendDraft}
                disabled={isPending}
                className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm text-white transition hover:bg-[color:var(--primary-strong)] disabled:opacity-60"
              >
                Send email
              </button>
              <button
                onClick={dismissPendingEmailDraft}
                disabled={isPending}
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--danger)] disabled:opacity-60"
              >
                Dismiss draft
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Trusted Recipients"
          eyebrow="Recipient registry"
          aside="These trusted email lanes are projected from the canonical contact registry on the Contacts page."
        >
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/contacts"
              className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-white transition hover:opacity-90"
            >
              Open Contacts
            </Link>
            <Link
              href="/governance"
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--ink-soft)] transition hover:bg-[color:var(--surface-strong)]"
            >
              Review outbound policy
            </Link>
          </div>
          {notice ? (
            <p className="mt-4 text-sm text-[color:var(--primary)]">{notice}</p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p>
          ) : null}
          <div className="mt-5 space-y-3">
            {emailRecipients.length > 0 ? (
              emailRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--ink)]">{recipient.label}</h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{recipient.destination}</p>
                  </div>
                  <Link
                    href="/contacts"
                    className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
                  >
                    View contact
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
                No trusted recipients yet. Add a contact on the Contacts page before asking Freedom to email externally.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Delivery Log"
          eyebrow="Recent sends"
          aside="Every external send stays explicit and reviewable."
        >
          <div className="space-y-3">
            {recentEmailDeliveries.length > 0 ? (
              recentEmailDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
                    <span>{delivery.provider}</span>
                    <span>•</span>
                    <span>{new Date(delivery.deliveredAt).toLocaleString()}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                    {delivery.subject}
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                    Recipient: {delivery.recipient}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
                No external email deliveries recorded yet.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
