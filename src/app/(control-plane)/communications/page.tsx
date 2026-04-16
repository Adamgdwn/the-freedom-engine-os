import { AppShell } from '@/components/app-shell';
import { EmailControlPanel } from '@/components/freedom-email/email-control-panel';

export default function CommunicationsPage() {
  return (
    <AppShell title="Communications">
      <EmailControlPanel />
    </AppShell>
  );
}
