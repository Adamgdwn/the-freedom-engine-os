'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { CONTROL_PLANE_NAVIGATION, isNavigationItemActive } from '@/components/navigation';

export function MobileNav({ title }: { title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-label="Open navigation"
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/70 text-[color:var(--ink)]"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--ink)]">{title}</p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            Control plane
          </p>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] bg-[rgba(23,34,37,0.24)] lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-20 rounded-xl border border-white/70 bg-[color:var(--surface-strong)] p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
              Destinations
            </p>
            <nav className="mt-3 space-y-1">
              {CONTROL_PLANE_NAVIGATION.map((item) => {
                const active = isNavigationItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition',
                      active
                        ? 'bg-[color:var(--primary)]/12 text-[color:var(--ink)]'
                        : 'text-[color:var(--ink-soft)] hover:bg-white/70 hover:text-[color:var(--ink)]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
