import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function WorkflowLabPage() {
  const snapshot = getControlPlaneSnapshot();
  const leadWorkflow = snapshot.workflows[0];
  const leadSteps = snapshot.workflowSteps.filter((step) => step.workflowId === leadWorkflow?.id);

  return (
    <AppShell
      title="Workflow Lab"
      statusBar={(
        <div className="status-strip rounded-lg px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>WORKFLOWS {snapshot.workflows.length}</span>
            <span>STEPS {snapshot.workflowSteps.length}</span>
            <span>HIGH AI FIT {snapshot.workflows.filter((workflow) => workflow.aiSuitability === 'high').length}</span>
            <span>APPROVAL GATES {snapshot.workflows.reduce((count, workflow) => count + workflow.requiredHumanApprovals.length, 0)}</span>
          </div>
        </div>
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="tool-surface rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
            Workflow registry
          </p>
          <div className="mt-4 space-y-2">
            {snapshot.workflows.map((workflow, index) => (
              <div key={workflow.id} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft-on-dark)]">
                      Node {index + 1}
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-[color:var(--ink-on-dark)]">
                      {workflow.name}
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">
                    {workflow.latencyHours}h
                  </span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--ink-soft-on-dark)]">
                  {workflow.aiSuitability} AI fit • {workflow.governanceRisk} risk
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <Panel
            title={leadWorkflow?.name ?? 'Workflow detail'}
            eyebrow="Selected workflow"
            aside={leadWorkflow ? `${leadWorkflow.latencyHours}h end-to-end latency` : undefined}
          >
            {leadWorkflow ? (
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  <div className="rounded-lg border border-[color:var(--line)] bg-white/76 p-4">
                    <p className="text-sm leading-6 text-[color:var(--ink-soft)]">{leadWorkflow.purpose}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div className="rounded-md bg-[color:var(--surface-strong)] p-3">
                      AI suitability: <strong>{leadWorkflow.aiSuitability}</strong>
                    </div>
                    <div className="rounded-md bg-[color:var(--surface-strong)] p-3">
                      Governance risk: <strong>{leadWorkflow.governanceRisk}</strong>
                    </div>
                    <div className="rounded-md bg-[color:var(--surface-strong)] p-3">
                      Approvals: <strong>{leadWorkflow.requiredHumanApprovals.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="tool-surface rounded-lg p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                    Failure points
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {leadWorkflow.failurePoints.map((point) => (
                      <span
                        key={point}
                        className="rounded-md border border-white/[0.08] bg-white/[0.08] px-2 py-1 text-xs text-[color:var(--ink-on-dark)]"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="tool-surface rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                    Step editor
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[color:var(--ink-on-dark)]">
                    Execution path
                  </h3>
                </div>
                <p className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">
                  {leadSteps.length} rows
                </p>
              </div>

              <div className="mt-3 space-y-2">
                {leadSteps.map((step, index) => (
                  <div key={step.id} className="grid gap-3 rounded-lg border border-white/[0.08] bg-white/[0.05] p-3 md:grid-cols-[56px_1fr_180px]">
                    <div className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="font-semibold text-[color:var(--ink-on-dark)]">{step.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--ink-soft-on-dark)]">
                        {step.actor} → {step.handoffTo}
                      </p>
                      <p className="mt-2 text-xs text-[color:var(--ink-soft-on-dark)]">
                        Systems: {step.systemsTouched.join(', ')}
                      </p>
                    </div>
                    <div className="text-sm text-[color:var(--ink-soft-on-dark)]">
                      <p>{step.latencyMinutes} min</p>
                      <p>{step.aiSuitability} AI fit</p>
                      <p>Approval {step.approvalRequired ? 'required' : 'not required'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Panel title="Cross-workflow watchlist" eyebrow="Governance and latency">
              <div className="space-y-3">
                {snapshot.workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[color:var(--ink)]">{workflow.name}</p>
                      <span className="font-mono text-xs text-[color:var(--ink-soft)]">
                        {workflow.latencyHours}h
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                      Approvals: {workflow.requiredHumanApprovals.join(', ') || 'none'}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
