import { AppShell }              from '@/components/app-shell';
import { Panel }                  from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

const TIER_COLOR: Record<string, string> = {
  'local-default':           'bg-emerald-100 text-emerald-800',
  'escalate-with-approval':  'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  'human-forced-provider':   'bg-[color:var(--danger)]/12 text-[color:var(--danger)]',
};

const PROVIDER_LABEL: Record<string, string> = {
  'local':       'Local LLM',
  'codex':       'Codex',
  'claude-code': 'Claude Code',
};

const STATUS_COLOR: Record<string, string> = {
  'pending':  'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  'approved': 'bg-emerald-100 text-emerald-800',
  'denied':   'bg-[color:var(--danger)]/12 text-[color:var(--danger)]',
};

export default function ModelRouterPage() {
  const snapshot = getControlPlaneSnapshot();

  const pending  = snapshot.escalationRequests.filter((r) => r.status === 'pending');
  const resolved = snapshot.escalationRequests.filter((r) => r.status !== 'pending');

  return (
    <AppShell
      title="Model Router"
      summary="Local LLMs are the default. Every escalation to Codex or Claude Code requires explicit approval and leaves an audit trace."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">

        {/* Left column: policy + escalation queue */}
        <div className="space-y-6">
          <Panel title="Routing policy" eyebrow="Tier definitions">
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
                  className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${TIER_COLOR[row.tier] ?? ''}`}>
                      {row.label}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-[color:var(--ink-soft)]">{row.desc}</p>
                </div>
              ))}
            </div>
          </Panel>

          {pending.length > 0 && (
            <Panel title="Pending escalation requests" eyebrow="Awaiting approval">
              <div className="space-y-4">
                {pending.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-[1.5rem] border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-[color:var(--ink)]">{req.taskSummary}</h3>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[req.status] ?? ''}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                      {req.whyLocalInsufficient}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                      <span>{PROVIDER_LABEL[req.recommendation.provider]}</span>
                      <span>•</span>
                      <span>{req.recommendation.tier.replace(/-/g, ' ')}</span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink)]">{req.recommendation.reason}</p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/60 p-3">
                        <p className="font-medium text-[color:var(--ink)]">Expected benefit</p>
                        <p className="mt-1 leading-5 text-[color:var(--ink-soft)]">{req.expectedBenefit}</p>
                      </div>
                      <div className="rounded-2xl bg-white/60 p-3">
                        <p className="font-medium text-[color:var(--ink)]">Cost / speed tradeoff</p>
                        <p className="mt-1 leading-5 text-[color:var(--ink-soft)]">{req.costSpeedTradeoff}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right column: audit trail */}
        <div className="space-y-6">
          <Panel title="Escalation audit" eyebrow="Resolved decisions">
            <div className="space-y-4">
              {resolved.map((req) => {
                const decision = snapshot.escalationDecisions.find(
                  (d) => d.escalationRequestId === req.id,
                );
                return (
                  <div
                    key={req.id}
                    className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-semibold text-[color:var(--ink)]">{req.taskSummary}</h3>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLOR[req.status] ?? ''}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                      <span>{PROVIDER_LABEL[req.recommendation.provider]}</span>
                      <span>•</span>
                      <span>{req.recommendation.tier.replace(/-/g, ' ')}</span>
                    </div>
                    {decision && (
                      <div className="mt-3 rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm">
                        <p className="font-medium text-[color:var(--ink)]">Outcome</p>
                        <p className="mt-1 leading-6 text-[color:var(--ink-soft)]">{decision.outcome}</p>
                        <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                          Decided by {decision.decidedBy} · {new Date(decision.decidedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Provider preference order" eyebrow="Default routing">
            <ol className="space-y-3 text-sm">
              {[
                { rank: '1', label: 'Local LLM', note: 'Always first. No approval needed.' },
                { rank: '2', label: 'Codex',     note: 'Code-heavy implementation. Requires approval.' },
                { rank: '3', label: 'Claude Code', note: 'Synthesis, research, broad planning. Requires approval.' },
              ].map((row) => (
                <li key={row.rank} className="flex items-start gap-4 rounded-2xl bg-[color:var(--surface-strong)] p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-xs font-bold text-white">
                    {row.rank}
                  </span>
                  <div>
                    <p className="font-medium text-[color:var(--ink)]">{row.label}</p>
                    <p className="text-[color:var(--ink-soft)]">{row.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
