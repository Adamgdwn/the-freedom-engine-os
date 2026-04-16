'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { href: '/', label: 'Portfolio Home' },
  { href: '/workflow-lab', label: 'Workflow Lab' },
  { href: '/agent-control', label: 'Agent Control' },
  { href: '/communications', label: 'Communications' },
  { href: '/governance', label: 'Governance Console' },
  { href: '/evidence-room', label: 'Evidence Room' },
  { href: '/weekly-review', label: 'Weekly Review' },
  { href: '/learning-registry', label: 'Learning Registry' },
  { href: '/model-router', label: 'Model Router' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navigation.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-2xl px-4 py-3 text-sm transition ${
              active
                ? 'bg-[color:var(--primary)] text-white shadow-lg shadow-[color:var(--primary)]/20'
                : 'bg-white/55 text-[color:var(--ink)] hover:bg-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
