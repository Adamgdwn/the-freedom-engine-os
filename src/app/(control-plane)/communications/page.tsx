import { AppShell } from '@/components/app-shell';
import { EmailControlPanel } from '@/components/freedom-email/email-control-panel';

export default function CommunicationsPage() {
  return (
    <AppShell
      title="Communications"
      summary="Trusted outbound email for Freedom. Manage approved recipients, review draft confirmations, and audit recent sends without leaving the current control plane."
    >
      <EmailControlPanel />
    </AppShell>
  );
}
