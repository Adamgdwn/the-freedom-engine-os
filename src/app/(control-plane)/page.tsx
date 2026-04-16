import { AppShell } from '@/components/app-shell';
import { PortfolioHomeWorkspace } from '@/components/portfolio-home-workspace';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function PortfolioHomePage() {
  const snapshot = getControlPlaneSnapshot();

  return (
    <AppShell title="Portfolio Home">
      <PortfolioHomeWorkspace snapshot={snapshot} />
    </AppShell>
  );
}
