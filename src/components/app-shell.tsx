'use client';
import type { PropsWithChildren, ReactNode } from 'react';

import { MobileNav } from '@/components/mobile-nav';
import { SidebarNav } from '@/components/sidebar-nav';
import { VoiceFab, VoicePanel, VoiceProvider, useVoiceSession } from '@/components/voice-interface';
import { VOICE_STATE_LABELS } from '@/lib/voice-session';

type AppShellProps = PropsWithChildren<{
  title: string;
  support?: ReactNode;
  statusBar?: ReactNode;
}>;

const STATE_ACCENT: Record<string, string> = {
  idle: 'text-[color:var(--ink-soft)]',
  connecting: 'text-[color:var(--primary)]',
  listening: 'text-[color:var(--primary)]',
  processing: 'text-[color:var(--accent)]',
  speaking: 'text-[color:var(--primary)]',
  error: 'text-[color:var(--danger)]',
};

export function AppShell(props: AppShellProps) {
  return (
    <VoiceProvider>
      <AppShellFrame {...props} />
    </VoiceProvider>
  );
}

function AppShellFrame({ title, support, statusBar, children }: AppShellProps) {
  const { state, tasks } = useVoiceSession();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1740px] gap-3 px-3 py-3 lg:px-4">
      <aside className="panel hidden shrink-0 flex-col justify-between rounded-xl border border-white/60 p-2 lg:flex lg:w-[68px]">
        <div>
          <div className="mb-3 flex h-10 items-center justify-center rounded-lg bg-[color:var(--ink)] text-xs font-semibold uppercase tracking-[0.22em] text-white">
            FE
          </div>
          <SidebarNav mode="rail" />
        </div>
        <div className="rounded-lg border border-[color:var(--line)] bg-white/70 px-2 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Voice</p>
          <p className={`mt-1 text-[11px] font-semibold ${STATE_ACCENT[state] ?? ''}`}>
            {VOICE_STATE_LABELS[state]}
          </p>
        </div>
      </aside>

      <aside className="panel hidden shrink-0 flex-col gap-3 rounded-xl border border-white/60 p-3 lg:flex lg:w-[290px]">
        <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            The Freedom Engine
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            Build and govern
          </h1>
          <p className="mt-1 text-sm leading-5 text-[color:var(--ink-soft)]">
            Desktop stays dense, inspectable, and operator-oriented.
          </p>
        </div>

        <SidebarNav />
        <VoicePanel />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="panel sticky top-3 z-30 flex h-[52px] items-center justify-between rounded-xl border border-white/60 px-3 md:px-4">
          <MobileNav title={title} />

          <div className="hidden min-w-0 lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
              Governed control plane
            </p>
            <h2 className="truncate text-lg font-semibold text-[color:var(--ink)]">{title}</h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1 text-[color:var(--ink-soft)]">
              A1 autonomy
            </span>
            <span className={`rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1 ${STATE_ACCENT[state] ?? ''}`}>
              {VOICE_STATE_LABELS[state]}
            </span>
            <span className="hidden rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1 font-mono text-[color:var(--ink-soft)] sm:inline-flex">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        <main className="mt-3 min-w-0 flex-1">{children}</main>
        {statusBar ? <div className="mt-3">{statusBar}</div> : null}
      </div>

      {support ? (
        <aside className="hidden w-[300px] shrink-0 2xl:block">{support}</aside>
      ) : null}

      <VoiceFab />
    </div>
  );
}
