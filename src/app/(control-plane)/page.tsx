import { AppShell } from '@/components/app-shell';
import { PortfolioHomeWorkspace } from '@/components/portfolio-home-workspace';
import { loadControlPlaneSnapshot } from '@/lib/control-plane';
import { loadControlPlaneRuntimeSummary } from '@freedom/shared';

export default async function PortfolioHomePage() {
  const snapshot = await loadControlPlaneSnapshot();
  const runtimeSummary = await loadControlPlaneRuntimeSummary();

  return (
    <AppShell title="Portfolio Home">
      <PortfolioHomeWorkspace snapshot={snapshot} runtimeSummary={runtimeSummary} />
    </AppShell>
  );
}
