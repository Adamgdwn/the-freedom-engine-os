import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function AgentControlPage() {
  const snapshot = getControlPlaneSnapshot();

  return (
    <AppShell
      title="Agent Control"
      summary="A governed workforce view showing who can do what, which tools they may touch, and where executions are waiting on evidence or human authority."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Agent registry" eyebrow="Bounded autonomy">
          <div className="space-y-4">
            {snapshot.agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[color:var(--ink)]">{agent.role}</h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                      {agent.model} • {agent.defaultMode} • autonomy {agent.autonomy}
                    </p>
                  </div>
                  <span className="rounded-full bg-[color:var(--primary)]/12 px-3 py-1 text-sm font-medium text-[color:var(--primary)]">
                    {agent.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 text-sm">
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-4">
                    <p className="font-medium text-[color:var(--ink)]">Allowed</p>
                    <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                      {agent.allowedActions.join(', ')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-4">
                    <p className="font-medium text-[color:var(--ink)]">Blocked</p>
                    <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                      {agent.blockedActions.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Tool registry" eyebrow="Permissions">
            <div className="space-y-4">
              {snapshot.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <h3 className="text-lg font-semibold text-[color:var(--ink)]">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                    {tool.purpose}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--ink)]">
                    Approval: {tool.approvalRequired}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Execution orchestrator" eyebrow="Recent runs">
            <div className="space-y-4">
              {snapshot.executions.map((execution) => (
                <div
                  key={execution.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[color:var(--ink)]">{execution.outcome}</p>
                    <span className="rounded-full bg-[color:var(--ink)]/8 px-3 py-1 text-sm text-[color:var(--ink)]">
                      {execution.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                    Escalation required: {execution.humanEscalation ? 'yes' : 'no'}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
