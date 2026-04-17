import { AppShell } from '@/components/app-shell';
import { PersonaControlPanel } from '@/components/freedom-persona/persona-control-panel';

export default function PersonalityPage() {
  return (
    <AppShell title="Personality">
      <PersonaControlPanel />
    </AppShell>
  );
}
