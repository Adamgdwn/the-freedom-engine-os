import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  CalendarCheck,
  FolderSearch,
  FlaskConical,
  Fingerprint,
  Home,
  Mail,
  ShieldCheck,
  Shuffle,
} from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const CONTROL_PLANE_NAVIGATION: NavigationItem[] = [
  { href: '/', label: 'Portfolio Home', shortLabel: 'Home', icon: Home },
  { href: '/workflow-lab', label: 'Workflow Lab', shortLabel: 'Workflows', icon: FlaskConical },
  { href: '/agent-control', label: 'Agent Control', shortLabel: 'Agents', icon: Bot },
  { href: '/communications', label: 'Communications', shortLabel: 'Comms', icon: Mail },
  { href: '/governance', label: 'Governance', shortLabel: 'Govern', icon: ShieldCheck },
  { href: '/evidence-room', label: 'Evidence Room', shortLabel: 'Evidence', icon: FolderSearch },
  { href: '/weekly-review', label: 'Weekly Review', shortLabel: 'Weekly', icon: CalendarCheck },
  { href: '/learning-registry', label: 'Learning Registry', shortLabel: 'Learning', icon: BookOpen },
  { href: '/personality', label: 'Personality', shortLabel: 'Persona', icon: Fingerprint },
  { href: '/model-router', label: 'Model Router', shortLabel: 'Router', icon: Shuffle },
];

export function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
