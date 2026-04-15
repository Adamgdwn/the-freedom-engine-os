import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function GovernancePage() {
  const snapshot = getControlPlaneSnapshot();

  return (
    <AppShell
      title="Governance Console"
      summary="The policy and approval surface where agents are constrained, exceptions are visible, and humans remain accountable for irreversible choices."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Panel title="Policy checks" eyebrow="Core rules">
          <div className="space-y-4">
            {snapshot.policies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-[1.55rem] border border-[color:var(--line)] bg-white/75 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-[color:var(--ink)]">{policy.name}</h3>
                  <span className="rounded-full bg-[color:var(--primary)]/12 px-3 py-1 text-sm text-[color:var(--primary)]">
                    {policy.scope}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{policy.rule}</p>
                <p className="mt-3 text-sm text-[color:var(--ink)]">
                  Human approval required: {policy.humanApprovalRequired ? 'yes' : 'no'}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Approval queue" eyebrow="Decision rights">
            <div className="space-y-3">
              {snapshot.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <h3 className="text-lg font-semibold text-[color:var(--ink)]">
                    {approval.subject}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                    {approval.owner} • {approval.threshold}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--ink)]">Status: {approval.status}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Freedom Connect governance" eyebrow="Cross-surface audit">
            <div className="space-y-4">
              {snapshot.connectEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
                    <span>{event.source.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{event.intent.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{event.governanceImpact}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{event.summary}</p>
                </div>
              ))}

              {snapshot.outboundDecisions.map((decision) => (
                <div
                  key={decision.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
                >
                  <h3 className="text-lg font-semibold text-[color:var(--ink)]">
                    Outbound via {decision.channel}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                    {decision.summary}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--ink)]">
                    Recipient: {decision.recipient} • Approval: {decision.approvalState}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Overrides and humans" eyebrow="Visible exceptions">
            <div className="space-y-4">
              {snapshot.overrides.map((override) => (
                <div
                  key={override.id}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
                >
                  <h3 className="text-lg font-semibold text-[color:var(--ink)]">
                    {override.subject}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                    {override.reason}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--ink)]">
                    Owner: {override.owner} • Follow-up: {override.followUp}
                  </p>
                </div>
              ))}

              <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
                  Human registry
                </p>
                <div className="mt-3 space-y-3">
                  {snapshot.humans.map((human) => (
                    <div key={human.id}>
                      <p className="font-medium text-[color:var(--ink)]">
                        {human.name} · {human.role}
                      </p>
                      <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                        {human.authority.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
