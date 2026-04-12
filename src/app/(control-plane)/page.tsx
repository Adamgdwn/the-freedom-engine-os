import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { ScoreWorkbench } from '@/components/score-workbench';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function PortfolioHomePage() {
  const snapshot = getControlPlaneSnapshot();
  const topRecommendation = snapshot.recommendations[0];

  return (
    <AppShell
      title="Portfolio Home"
      summary="A shared operating surface for venture selection, workflow decomposition, governed agent execution, and freedom-first weekly allocation."
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="North-star allocation"
          eyebrow="This week"
          aside="Human approval still gates priority changes, budget shifts, and irreversible commitments."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] bg-[color:var(--ink)] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.26em] text-white/60">Top move</p>
              <h3 className="mt-3 text-2xl font-semibold">
                {topRecommendation?.title ?? 'Review this week’s allocation'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/75">
                {topRecommendation?.action ??
                  'Refresh the evidence base, then decide where founder and agent effort should go next.'}
              </p>
            </div>
            <div className="grid gap-4">
              {[
                ['Ventures', snapshot.ventures.length.toString()],
                ['Agents', snapshot.agents.length.toString()],
                ['Live integrations', snapshot.integrations.filter((item) => item.status === 'live').length.toString()],
                ['Pending approvals', snapshot.approvals.filter((item) => item.status === 'pending').length.toString()],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-5"
                >
                  <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Freedom dashboard" eyebrow="Portfolio metrics">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Founder hours reclaimed', '38 hrs'],
              ['Decision latency reduced', '31%'],
              ['Income resilience proxy', '7.0 / 10'],
              ['Value created / effort', '2.1x'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
              >
                <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Venture registry"
        eyebrow="Scored contexts"
        aside="Weights are editable and versioned below."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {snapshot.rankedVentures.map((item, index) => (
            <Link
              key={item.venture.id}
              href={`/ventures/${item.venture.slug}`}
              className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/80 p-5 transition hover:-translate-y-0.5 hover:bg-white"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
                Rank {index + 1}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">
                {item.venture.name}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {item.venture.thesis}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                  <p className="text-[color:var(--ink-soft)]">Combined</p>
                  <p className="mt-1 text-xl font-semibold text-[color:var(--ink)]">
                    {item.combinedScore}
                  </p>
                </div>
                <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                  <p className="text-[color:var(--ink-soft)]">Time to proof</p>
                  <p className="mt-1 text-xl font-semibold text-[color:var(--ink)]">
                    {item.venture.timeToProofWeeks} wks
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Opportunity scoring engine" eyebrow="What should we build next?">
        <ScoreWorkbench ventures={snapshot.ventures} initialWeightSets={snapshot.weightSets} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Recommendation engine" eyebrow="Evidence-backed next steps">
          <div className="space-y-4">
            {snapshot.recommendations.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
                  <span>{item.freedomGain} freedom gain</span>
                  <span>•</span>
                  <span>{item.confidence} confidence</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{item.rationale}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Live operating domains" eyebrow="First integrations">
          <div className="space-y-4">
            {snapshot.integrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[color:var(--ink)]">
                      {integration.name}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{integration.domain}</p>
                  </div>
                  <span className="rounded-full bg-[color:var(--primary)]/12 px-3 py-1 text-sm font-medium text-[color:var(--primary)]">
                    {integration.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {integration.note}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
