import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';
import { loadFreedomMemorySnapshot } from '@/lib/freedom-memory-store';
import type { AgentBuildRequest } from '@/lib/types';

function mapLiveBuildRequests(): Promise<AgentBuildRequest[]> {
  return loadFreedomMemorySnapshot().then((memory) => {
    if (!memory.configured) {
      return [];
    }

    return memory.programmingRequests
      .filter((request) => request.buildLane)
      .map((request) => {
        const buildLane = request.buildLane!;
        return {
          id: buildLane.id,
          capability: buildLane.title,
          requestedFrom: mapRequestedFrom(buildLane.requestedFrom),
          requestedBy: buildLane.requestedBy,
          status: mapBuildLaneStatus(buildLane.approvalState),
          builder: 'New Build Agent',
          executionMode: buildLane.approvalState === 'approved-for-build' ? 'parallel-build' : 'serial',
          parallelLaneCount: buildLane.approvalState === 'approved-for-build' ? 2 : 1,
          coordinatorSkillId: 'skill-builder-orchestrator',
          routeReason: buildLane.businessCase || buildLane.summary,
          auditCorrelationId: `build-lane-${buildLane.id}`,
          requestedAt: buildLane.requestedAt,
        } satisfies AgentBuildRequest;
      });
  });
}

function mapRequestedFrom(value: 'mobile_companion' | 'desktop_shell' | 'voice_runtime' | 'web_control_plane'): AgentBuildRequest['requestedFrom'] {
  return value === 'desktop_shell' ? 'desktop_shell' : 'mobile_companion';
}

function mapBuildLaneStatus(
  approvalState: 'conversation-capture' | 'needs-approval' | 'approved-for-discovery' | 'approved-for-build' | 'approved-for-release' | 'blocked'
): AgentBuildRequest['status'] {
  switch (approvalState) {
    case 'approved-for-build':
    case 'approved-for-release':
      return 'routed-to-builder';
    case 'approved-for-discovery':
    case 'conversation-capture':
    case 'needs-approval':
      return 'pending-approval';
    case 'blocked':
      return 'blocked';
    default:
      return 'pending-approval';
  }
}

export default async function AgentControlPage() {
  const snapshot = getControlPlaneSnapshot();
  const liveBuildRequests = await mapLiveBuildRequests();
  const visibleBuildRequests = liveBuildRequests.length ? liveBuildRequests : snapshot.agentBuildRequests;
  const leadAgent = snapshot.agents[0];

  return (
    <AppShell
      title="Agent Control"
      statusBar={(
        <div className="status-strip rounded-lg px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>AGENTS {snapshot.agents.length}</span>
            <span>TOOLS {snapshot.tools.length}</span>
            <span>RUNS {snapshot.executions.length}</span>
            <span>PENDING BUILDS {visibleBuildRequests.filter((request) => request.status === 'pending-approval').length}</span>
          </div>
        </div>
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="tool-surface rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
            Agent registry
          </p>
          <div className="mt-4 space-y-2">
            {snapshot.agents.map((agent, index) => (
              <div key={agent.id} className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft-on-dark)]">
                      Slot {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--ink-on-dark)]">{agent.role}</p>
                  </div>
                  <span className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">{agent.autonomy}</span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--ink-soft-on-dark)]">
                  {agent.model} • {agent.defaultMode} • {agent.status}
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <Panel
            title={leadAgent?.role ?? 'Primary agent'}
            eyebrow="Selected profile"
            aside={leadAgent ? `${leadAgent.model} • ${leadAgent.defaultMode}` : undefined}
          >
            {leadAgent ? (
              <div className="grid gap-4 lg:grid-cols-2 text-sm">
                <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
                  <p className="font-medium text-[color:var(--ink)]">Allowed actions</p>
                  <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                    {leadAgent.allowedActions.join(', ')}
                  </p>
                </div>
                <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
                  <p className="font-medium text-[color:var(--ink)]">Blocked actions</p>
                  <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                    {leadAgent.blockedActions.join(', ')}
                  </p>
                </div>
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="tool-surface rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                    Builder routing
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[color:var(--ink-on-dark)]">
                    Request queue
                  </h3>
                </div>
                <p className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">
                  {visibleBuildRequests.length} queued
                </p>
              </div>

              <div className="mt-3 space-y-2">
                {visibleBuildRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[color:var(--ink-on-dark)]">{request.capability}</p>
                      <span className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">
                        {request.parallelLaneCount} lanes
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft-on-dark)]">
                      {request.requestedFrom.replace('_', ' ')} • {request.builder}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft-on-dark)]">
                      {request.routeReason}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-4">
              <Panel title="Tool registry" eyebrow="Permissions">
                <div className="space-y-3">
                  {snapshot.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                    >
                      <h3 className="text-lg font-semibold text-[color:var(--ink)]">{tool.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{tool.purpose}</p>
                      <p className="mt-2 text-sm text-[color:var(--ink)]">Approval: {tool.approvalRequired}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Execution orchestrator" eyebrow="Recent runs">
                <div className="space-y-3">
                  {snapshot.executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="rounded-lg border border-[color:var(--line)] bg-white/75 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium text-[color:var(--ink)]">{execution.outcome}</p>
                        <span className="rounded-md bg-[color:var(--ink)]/8 px-2 py-1 text-sm text-[color:var(--ink)]">
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

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Skill registry" eyebrow="Parallel-capable skills">
              <div className="space-y-3">
                {snapshot.skillDefinitions.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-lg border border-[color:var(--line)] bg-white/75 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[color:var(--ink)]">{skill.name}</h3>
                        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{skill.purpose}</p>
                      </div>
                      <span className="rounded-md bg-[color:var(--primary)]/12 px-2 py-1 text-sm text-[color:var(--primary)]">
                        {skill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Self-evolving functions" eyebrow="Learning loops">
              <div className="space-y-3">
                {snapshot.selfEvolvingFunctions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[color:var(--line)] bg-white/75 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[color:var(--ink)]">{item.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{item.objective}</p>
                      </div>
                      <span className="rounded-md bg-[color:var(--primary)]/12 px-2 py-1 text-sm text-[color:var(--primary)]">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink)]">Trigger: {item.trigger}</p>
                    <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                      Active branches: {item.activeBranches.join(', ')}
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
