'use client';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { SidebarNav }                       from '@/components/sidebar-nav';
import { VoiceProvider, VoicePanel, VoiceFab } from '@/components/voice-interface';

type AppShellProps = PropsWithChildren<{
  title:   string;
  summary: string;
}>;

export function AppShell({ title, summary, children }: AppShellProps) {
  return (
    // VoiceProvider wraps everything so VoicePanel and VoiceFab share one session
    <VoiceProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-5 lg:flex-row lg:px-6">
        <aside className="panel h-fit rounded-[2rem] border border-white/60 p-5 lg:sticky lg:top-6 lg:w-[300px]">
          <div className="rounded-[1.75rem] bg-[color:var(--ink)] px-5 py-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">The Freedom Engine</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Internal venture OS</h1>
            <p className="mt-3 text-sm leading-6 text-white/78">
              Governed allocation of attention, capital, and agent effort toward long-term freedom.
            </p>
          </div>

          <div className="mt-5">
            <SidebarNav />
          </div>

          {/* Voice panel — replaces the static "North star" block */}
          <div className="mt-6">
            <VoicePanel />
          </div>

          <div className="mt-4 text-sm text-[color:var(--ink-soft)]">
            Venture detail:
            <div className="mt-2">
              <Link
                href="/ventures/ai-consulting-build"
                className="rounded-full bg-white/70 px-3 py-1.5 text-[color:var(--ink)] transition hover:bg-white"
              >
                AI Consulting Build
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <header className="panel rounded-[2rem] border border-white/60 px-6 py-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--primary)]">
              Governed control plane
            </p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--ink)]">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[color:var(--ink-soft)]">
                  {summary}
                </p>
              </div>
            </div>
          </header>

          <div className="mt-6 space-y-6">{children}</div>
        </main>

        {/* Mobile floating action button — hidden on desktop */}
        <VoiceFab />
      </div>
    </VoiceProvider>
  );
}
