'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { CONTROL_PLANE_NAVIGATION, isNavigationItemActive } from '@/components/navigation';

export function SidebarNav({ mode = 'panel' }: { mode?: 'panel' | 'rail' }) {
  const pathname = usePathname();

  if (mode === 'rail') {
    return (
      <nav className="flex flex-col items-center gap-1.5">
        {CONTROL_PLANE_NAVIGATION.map((item) => {
          const active = isNavigationItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-lg border transition',
                active
                  ? 'border-[color:var(--primary)]/25 bg-[color:var(--primary)]/12 text-[color:var(--primary)]'
                  : 'border-transparent text-[color:var(--ink-soft)] hover:border-[color:var(--line)] hover:bg-white/70 hover:text-[color:var(--ink)]',
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1.5">
      {CONTROL_PLANE_NAVIGATION.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition',
              active
                ? 'border-[color:var(--primary)] bg-white/72 font-semibold text-[color:var(--ink)]'
                : 'border-transparent text-[color:var(--ink-soft)] hover:bg-white/60 hover:text-[color:var(--ink)]',
            )}
          >
            <Icon className={clsx('h-4 w-4 shrink-0', active ? 'text-[color:var(--primary)]' : '')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
