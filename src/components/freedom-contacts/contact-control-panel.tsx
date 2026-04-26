'use client';

import { useEffect, useState, useTransition } from 'react';

import { Panel } from '@/components/panel';
import { useVoiceSession } from '@/components/voice-interface';
import {
  displayFreedomContactName,
  type FreedomContact,
  type FreedomContactSnapshot,
} from '@/lib/freedom-contacts';

const EMPTY_SNAPSHOT: FreedomContactSnapshot = {
  contacts: [],
  configured: false,
};

async function fetchContactSnapshot() {
  const response = await fetch('/api/freedom-contacts', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load Freedom contacts.');
  }

  return response.json() as Promise<FreedomContactSnapshot>;
}

export function ContactControlPanel() {
  const { refreshEmailState } = useVoiceSession();
  const [snapshot, setSnapshot] = useState<FreedomContactSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [organization, setOrganization] = useState('');
  const [title, setTitle] = useState('');
  const [relationshipContext, setRelationshipContext] = useState('');
  const [notes, setNotes] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

  async function refresh() {
    const nextSnapshot = await fetchContactSnapshot();
    setSnapshot(nextSnapshot);
  }

  useEffect(() => {
    void refresh().catch((currentError) => {
      setError(currentError instanceof Error ? currentError.message : 'Could not load Freedom contacts.');
    });
  }, []);

  function resetForm() {
    setFullName('');
    setPreferredName('');
    setOrganization('');
    setTitle('');
    setRelationshipContext('');
    setNotes('');
    setPrimaryEmail('');
  }

  function handleCreateContact() {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice(null);

          const response = await fetch('/api/freedom-contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName,
              preferredName,
              organization,
              title,
              relationshipContext,
              notes,
              primaryEmail,
              primaryEmailLabel: 'Primary email',
              trustForEmail: true,
              approvalRequired: true,
            }),
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? 'Could not save Freedom contact.');
          }

          resetForm();
          await refresh();
          await refreshEmailState();
          setNotice('Contact saved to the canonical communications registry.');
        } catch (currentError) {
          setError(currentError instanceof Error ? currentError.message : 'Could not save Freedom contact.');
        }
      })();
    });
  }

  function handleDeleteContact(contactId: string) {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice(null);

          const response = await fetch(`/api/freedom-contacts/${contactId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? 'Could not delete Freedom contact.');
          }

          await refresh();
          await refreshEmailState();
          setNotice('Contact removed from the communications registry.');
        } catch (currentError) {
          setError(currentError instanceof Error ? currentError.message : 'Could not delete Freedom contact.');
        }
      })();
    });
  }

  const trustedEmailCount = snapshot.contacts.reduce(
    (count, contact) => count + contact.channels.filter((channel) => channel.channelType === 'email' && channel.trustForEmail).length,
    0,
  );

  return (
    <div className="space-y-6">
      <Panel
        title="Contacts"
        eyebrow="Canonical registry"
        aside="Manual desktop entry is the source of truth today. Future card, signature, and OCR imports should land here for review."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Active contacts', snapshot.contacts.length.toString()],
            ['Trusted email lanes', trustedEmailCount.toString()],
            ['Entry mode', 'Desktop text'],
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
            Operating model
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
            Contacts are the long-term filing system. Trusted email is now a property of a contact&apos;s
            channel, not a disconnected recipient list, so future imports can land in one reviewable place.
          </p>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Add Contact"
          eyebrow="Desktop-first capture"
          aside="Start with a person card and one trusted email lane. We can expand to richer imports later without changing the core flow."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Preferred name</span>
              <input
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
                placeholder="Jane"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Organization</span>
              <input
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                placeholder="Acme Ventures"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Title / role</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Operations lead"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Primary email</span>
              <input
                value={primaryEmail}
                onChange={(event) => setPrimaryEmail(event.target.value)}
                placeholder="jane@example.com"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Relationship context</span>
              <input
                value={relationshipContext}
                onChange={(event) => setRelationshipContext(event.target.value)}
                placeholder="Supplier, advisor, partner, client..."
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
              />
            </label>
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Anything Freedom should remember about tone, context, or how this person relates to your work."
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--primary)]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCreateContact}
              disabled={isPending || !fullName.trim()}
              className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Save contact
            </button>
            <span className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--ink-soft)]">
              Trusted email defaults to approval-required
            </span>
          </div>

          {notice ? <p className="mt-4 text-sm text-[color:var(--primary)]">{notice}</p> : null}
          {error ? <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p> : null}
        </Panel>

        <Panel
          title="Contact Filing System"
          eyebrow="Retrieval-ready"
          aside="This is the reviewable surface Freedom should eventually import into from cards, signatures, OCR, and typed captures."
        >
          <div className="space-y-3">
            {snapshot.contacts.length > 0 ? (
              snapshot.contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onDelete={handleDeleteContact}
                  disabled={isPending}
                />
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-white/55 p-4 text-sm text-[color:var(--ink-soft)]">
                No contacts yet. Add the first person card here so Freedom has one canonical place to retrieve communication context from.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContactCard(props: {
  contact: FreedomContact;
  onDelete(contactId: string): void;
  disabled: boolean;
}) {
  const emailChannels = props.contact.channels.filter((channel) => channel.channelType === 'email');

  return (
    <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--ink)]">
            {displayFreedomContactName(props.contact)}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
            {[props.contact.title, props.contact.organization].filter(Boolean).join(' • ') || 'Contact card'}
          </p>
        </div>
        <button
          onClick={() => props.onDelete(props.contact.id)}
          disabled={props.disabled}
          className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--danger)] disabled:opacity-60"
        >
          Remove
        </button>
      </div>

      {props.contact.relationshipContext ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
          {props.contact.relationshipContext}
        </p>
      ) : null}

      {emailChannels.length ? (
        <div className="mt-3 space-y-2">
          {emailChannels.map((channel) => (
            <div
              key={channel.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-3 text-sm text-[color:var(--ink-soft)]"
            >
              <p className="font-medium text-[color:var(--ink)]">{channel.value}</p>
              <p className="mt-1">
                {(channel.label ?? 'Email')} • {channel.trustForEmail ? 'Trusted for governed email' : 'Not trusted'}
                {' • '}
                {channel.approvalRequired ? 'Approval required' : 'Policy-permitted'}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {props.contact.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
          {props.contact.notes}
        </p>
      ) : null}
    </div>
  );
}
