import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

const TIER_COLOR: Record<string, string> = {
  'local-default': 'bg-emerald-100 text-emerald-800',
  'escalate-with-approval': 'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  'human-forced-provider': 'bg-[color:var(--danger)]/12 text-[color:var(--danger)]',
};

const PROVIDER_LABEL: Record<string, string> = {
  local: 'Local LLM',
  openai: 'OpenAI / ChatGPT',
  codex: 'Codex',
  'claude-code': 'Claude Code',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  approved: 'bg-emerald-100 text-emerald-800',
  denied: 'bg-[color:var(--danger)]/12 text-[color:var(--danger)]',
};

export default function ModelRouterPage() {
  const snapshot = getControlPlaneSnapshot();

  const pending = snapshot.escalationRequests.filter((request) => request.status === 'pending');
  const resolved = snapshot.escalationRequests.filter((request) => request.status !== 'pending');
  const { modelRouterStatus } = snapshot;
  const budgetCards = [
    {
      label: 'Day-to-day operating work',
      budget: snapshot.executionBudgets.find((budget) => budget.taskId === 'daily-ops-review'),
      note: 'Routine planning, analysis, summaries, and conversation should prefer Codex first, with local kept as an optional cheaper lane.',
    },
    {
      label: 'Large code changes / builds',
      budget: snapshot.executionBudgets.find((budget) => budget.taskId === 'build-request-01'),
      note: 'Code-heavy implementation or governed agent-build execution should prefer Codex after approval.',
    },
    {
      label: 'Broad synthesis / platform design',
      budget: snapshot.executionBudgets.find((budget) => budget.taskId === 'self-evolving-platform-plan'),
      note: 'Big synthesis, research, or architecture work may justify Claude Code after approval.',
    },
  ];

  return (
    <AppShell
      title="Model Router"
      statusBar={(
        <div className="status-strip rounded-lg px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>PENDING {pending.length}</span>
            <span>RESOLVED {resolved.length}</span>
            <span>CODEX FIRST POLICY ACTIVE</span>
            <span>APPROVAL TRACE REQUIRED</span>
          </div>
        </div>
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="tool-surface rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
            Escalation queue
          </p>
          <div className="mt-4 space-y-2">
            {[...pending, ...resolved].map((request) => (
              <div key={request.id} className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-3">
                <p className="text-sm font-semibold text-[color:var(--ink-on-dark)]">{request.taskSummary}</p>
                <p className="mt-1 text-xs text-[color:var(--ink-soft-on-dark)]">
                  {PROVIDER_LABEL[request.recommendation.provider]} • {request.status}
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <Panel title="Routing policy" eyebrow="Tier definitions">
            <div className="mb-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4 text-sm">
              <p className="font-medium text-[color:var(--ink)]">Runtime status</p>
              <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                {modelRouterStatus.liveStatus}
              </p>
              <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                {modelRouterStatus.policyStatus}
              </p>
              <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                {modelRouterStatus.synthesisStatus}
              </p>
              <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">
                {modelRouterStatus.escalationStatus}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              {[
                {
                  tier: 'local-default',
                  label: 'Local default',
                  desc: 'First-pass planning, decomposition, prompts, scaffold prep, draft code, analysis, summarization, and low-risk self-improvement.',
                },
                {
                  tier: 'escalate-with-approval',
                  label: 'Escalate with approval',
                  desc: 'Task exceeds local quality threshold, requires repo-wide reasoning, or speed justifies paid horsepower. Must state why local is insufficient.',
                },
                {
                  tier: 'human-forced-provider',
                  label: 'Human-forced provider',
                  desc: 'Operator explicitly overrides routing. Freedom cannot self-select this tier.',
                },
              ].map((row) => (
                <div
                  key={row.tier}
                  className="rounded-lg border border-[color:var(--line)] bg-white/75 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-3 py-1 text-xs font-medium ${TIER_COLOR[row.tier] ?? ''}`}>
                      {row.label}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">{row.desc}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              {pending.length > 0 ? (
                <Panel title="Pending escalation requests" eyebrow="Awaiting approval">
                  <div className="space-y-4">
                    {pending.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-lg border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-semibold text-[color:var(--ink)]">{request.taskSummary}</h3>
                          <span className={`shrink-0 rounded-md px-3 py-1 text-sm font-medium ${STATUS_COLOR[request.status] ?? ''}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                          {request.whyLocalInsufficient}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                          <span>Recommended: {PROVIDER_LABEL[request.recommendation.provider]}</span>
                          <span>•</span>
                          <span>{request.recommendation.tier.replace(/-/g, ' ')}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                          {request.availableProviders.map((provider) => (
                            <span
                              key={`${request.id}-${provider}`}
                              className={`rounded-md px-2 py-1 ${
                                request.operatorSelection === provider
                                  ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]'
                                  : 'bg-[color:var(--surface-strong)] text-[color:var(--ink-soft)]'
                              }`}
                            >
                              {PROVIDER_LABEL[provider]}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--ink)]">
                          Operator choice: {request.operatorSelection ? PROVIDER_LABEL[request.operatorSelection] : 'Awaiting selection'}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--ink)]">{request.recommendation.reason}</p>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div className="rounded-md bg-white/60 p-3">
                            <p className="font-medium text-[color:var(--ink)]">Expected benefit</p>
                            <p className="mt-1 leading-5 text-[color:var(--ink-soft)]">{request.expectedBenefit}</p>
                          </div>
                          <div className="rounded-md bg-white/60 p-3">
                            <p className="font-medium text-[color:var(--ink)]">Cost / speed tradeoff</p>
                            <p className="mt-1 leading-5 text-[color:var(--ink-soft)]">{request.costSpeedTradeoff}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}

              <Panel title="Escalation audit" eyebrow="Resolved decisions">
                <div className="space-y-4">
                  {resolved.map((request) => {
                    const decision = snapshot.escalationDecisions.find(
                      (item) => item.escalationRequestId === request.id,
                    );

                    return (
                      <div
                        key={request.id}
                        className="rounded-lg border border-[color:var(--line)] bg-white/75 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-base font-semibold text-[color:var(--ink)]">{request.taskSummary}</h3>
                          <span className={`shrink-0 rounded-md px-3 py-1 text-sm font-medium ${STATUS_COLOR[request.status] ?? ''}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                          <span>Recommended: {PROVIDER_LABEL[request.recommendation.provider]}</span>
                          <span>•</span>
                          <span>{request.recommendation.tier.replace(/-/g, ' ')}</span>
                        </div>
                        {decision ? (
                          <div className="mt-3 rounded-md bg-[color:var(--surface-strong)] px-4 py-3 text-sm">
                            <p className="font-medium text-[color:var(--ink)]">Outcome</p>
                            <p className="mt-1 leading-6 text-[color:var(--ink-soft)]">
                              Selected provider: {decision.selectedProvider ? PROVIDER_LABEL[decision.selectedProvider] : 'No provider selected'}
                            </p>
                            <p className="mt-1 leading-6 text-[color:var(--ink-soft)]">{decision.outcome}</p>
                            <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                              Decided by {decision.decidedBy} · {new Date(decision.decidedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            <section className="tool-surface rounded-xl p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                Default routing
              </p>
              <ol className="mt-3 space-y-3 text-sm">
                {[
                  { rank: '1', label: 'Local LLM', note: 'Always first. No approval needed.' },
                  { rank: '2', label: 'OpenAI / ChatGPT', note: 'First suggested escalation option. Operator still chooses.' },
                  { rank: '3', label: 'Codex', note: 'Code-heavy implementation when you want the stronger coding lane.' },
                  { rank: '4', label: 'Claude Code', note: 'Synthesis, research, and broad planning when you prefer that lane.' },
                ].map((row) => (
                  <li key={row.rank} className="flex items-start gap-4 rounded-lg border border-white/[0.08] bg-white/[0.05] p-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-[color:var(--ink-on-dark)]">
                      {row.rank}
                    </span>
                    <div>
                      <p className="font-medium text-[color:var(--ink-on-dark)]">{row.label}</p>
                      <p className="text-[color:var(--ink-soft-on-dark)]">{row.note}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                  Budget examples
                </p>
                {budgetCards.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-3 text-sm"
                  >
                    <p className="font-medium text-[color:var(--ink-on-dark)]">{row.label}</p>
                    <p className="mt-1 text-[color:var(--ink-soft-on-dark)]">{row.note}</p>
                    {row.budget ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft-on-dark)]">
                        Preferred: {PROVIDER_LABEL[row.budget.preferredProvider]} • Max local attempts {row.budget.maxLocalAttempts}
                      </p>
                    ) : null}
                    {row.budget ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--ink-soft-on-dark)]">
                        Choice set: {row.budget.operatorSelectableProviders.map((provider) => PROVIDER_LABEL[provider]).join(' • ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
