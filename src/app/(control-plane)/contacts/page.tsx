import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { ContactControlPanel } from '@/components/freedom-contacts/contact-control-panel';
import { Panel } from '@/components/panel';

export default function ContactsPage() {
  return (
    <AppShell title="Contacts">
      <div className="space-y-6">
        <Panel
          title="Manual Contact Filing"
          eyebrow="Desktop-first workflow"
          aside="This is the canonical place to enter, review, and retrieve people records for Freedom."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)]">
              Use this page as the long-term contact registry. Add people here, attach trusted
              email lanes here, and let Communications focus on draft review, send confirmation,
              and delivery audit.
            </p>
            <Link
              href="/communications"
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--ink-soft)] transition hover:bg-[color:var(--surface-strong)]"
            >
              Open Communications
            </Link>
          </div>

          <details className="mt-5 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
            <summary className="inline-flex cursor-pointer list-none rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--surface-strong)]">
              Expand instructions
            </summary>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              <p>
                Start with a real person card: full name, preferred name, organization, role,
                and enough relationship context that Freedom can retrieve the right person later.
              </p>
              <p>
                Add the primary email you actually want Freedom to use. That trusted email lane
                becomes eligible for governed outbound drafting, but sending still stays approval-gated.
              </p>
              <p>
                Future imports like business cards, handwritten notes, email signatures, and OCR
                should all land back in this same registry for review instead of creating a second
                silo of “possible contacts.”
              </p>
              <p>
                Freedom Anywhere now has a first-pass typed capture lane as well: if you enter a
                clear contact-style note with a real name and email address, Freedom can save that
                into this registry in the background while still keeping the conversation moving.
              </p>
              <p>
                Use Communications after the contact exists. That keeps the operating path clean:
                file the person here, then draft and send through the governed external-communications surface.
              </p>
            </div>
          </details>
        </Panel>

        <ContactControlPanel />
      </div>
    </AppShell>
  );
}
