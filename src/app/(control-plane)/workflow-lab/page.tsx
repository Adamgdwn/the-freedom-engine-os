import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function WorkflowLabPage() {
  const snapshot = getControlPlaneSnapshot();

  return (
    <AppShell
      title="Workflow Lab"
      summary="Decompose venture workflows into actors, systems, handoffs, latency, failure points, and approval checkpoints before deciding what agents should own."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Workflow intelligence layer" eyebrow="Workflow registry">
          <div className="space-y-4">
            {snapshot.workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[color:var(--ink)]">
                      {workflow.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                      {workflow.purpose}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink)]">
                    {workflow.latencyHours}h latency
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    AI suitability: <strong>{workflow.aiSuitability}</strong>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    Governance risk: <strong>{workflow.governanceRisk}</strong>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    Approvals: <strong>{workflow.requiredHumanApprovals.length}</strong>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
                    Failure points
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {workflow.failurePoints.map((point) => (
                      <span
                        key={point}
                        className="rounded-full bg-[color:var(--danger)]/10 px-3 py-1 text-sm text-[color:var(--danger)]"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Workflow steps" eyebrow="AI-run, human-led, or hybrid">
          <div className="space-y-3">
            {snapshot.workflowSteps.map((step) => (
              <div
                key={step.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--ink)]">{step.name}</h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                      {step.actor} → {step.handoffTo}
                    </p>
                  </div>
                  <div className="text-sm text-[color:var(--ink-soft)]">
                    {step.latencyMinutes} min • {step.aiSuitability} AI fit
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                  Systems: {step.systemsTouched.join(', ')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 text-[color:var(--ink)]">
                    Risk: {step.governanceRisk}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[color:var(--ink)]">
                    Approval required: {step.approvalRequired ? 'yes' : 'no'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
