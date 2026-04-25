'use client';

import Link from 'next/link';
import { Activity, BriefcaseBusiness, Network, Sparkles, Waypoints } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

import { Panel } from '@/components/panel';
import { ScoreWorkbench } from '@/components/score-workbench';
import type { ControlPlaneSnapshot } from '@/lib/control-plane';
import type { ControlPlaneRuntimeSummary } from '@freedom/shared';

type WorkspaceTab = 'overview' | 'ventures' | 'connect' | 'systems' | 'recommendations';

const WORKSPACE_TABS = [
  { id: 'overview' as const, label: 'Overview', icon: Activity },
  { id: 'ventures' as const, label: 'Ventures', icon: BriefcaseBusiness },
  { id: 'connect' as const, label: 'Connect Activity', icon: Network },
  { id: 'systems' as const, label: 'Skills and Loops', icon: Waypoints },
  { id: 'recommendations' as const, label: 'Recommendations', icon: Sparkles },
];

export function PortfolioHomeWorkspace({
  snapshot,
  runtimeSummary,
}: {
  snapshot: ControlPlaneSnapshot;
  runtimeSummary: ControlPlaneRuntimeSummary;
}) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const topRecommendation = snapshot.recommendations[0];
  const topLiveVenture = runtimeSummary.source === 'supabase' ? runtimeSummary.topVenture : null;
  const ventureCount = runtimeSummary.weeklyMetrics?.activeVentures ?? snapshot.ventures.length;
  const pendingApprovalCount =
    runtimeSummary.weeklyMetrics?.pendingApprovals ??
    snapshot.approvals.filter((item) => item.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Portfolio Home"
          eyebrow="Operator overview"
          aside="Use this as the launcher and review surface, then drop into the deeper workbenches when you need detail."
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl bg-[color:var(--ink)] px-4 py-4 text-white">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/64">Top move</p>
              <h3 className="mt-2 text-2xl font-semibold">
                {topRecommendation?.title ?? 'Review this week’s allocation'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {topRecommendation?.action ??
                  'Refresh the evidence base, then decide where founder and agent effort should go next.'}
              </p>
              {topLiveVenture ? (
                <p className="mt-3 text-sm leading-6 text-white/74">
                  Live top venture: {topLiveVenture.name} • {topLiveVenture.currentStatus}
                  {typeof topLiveVenture.weightedScore === 'number'
                    ? ` • score ${topLiveVenture.weightedScore.toFixed(1)}`
                    : ''}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/workflow-lab"
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
                >
                  Open Workflow Lab
                </Link>
                <Link
                  href="/agent-control"
                  className="rounded-md border border-white/18 px-3 py-2 text-sm text-white/88"
                >
                  Review Agent Control
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Ventures', ventureCount.toString()],
                ['Agents', snapshot.agents.length.toString()],
                ['Pending approvals', pendingApprovalCount.toString()],
                ['Live integrations', snapshot.integrations.filter((item) => item.status === 'live').length.toString()],
                ['Freedom sessions', snapshot.connectSessions.length.toString()],
                ['Parallel skills', snapshot.skillDefinitions.filter((item) => item.parallelMode !== 'serial-only').length.toString()],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-[color:var(--line)] bg-white/74 px-3 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Quick launch" eyebrow="Common workbenches">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['/workflow-lab', 'Workflow Lab', 'Map actors, steps, and approvals.'],
              ['/agent-control', 'Agent Control', 'Inspect workforce scope and execution status.'],
              ['/model-router', 'Model Router', 'Review escalation requests and audit history.'],
              ['/governance', 'Governance', 'See policy surfaces and exceptions.'],
            ].map(([href, label, note]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-3 transition hover:bg-white"
              >
                <p className="font-semibold text-[color:var(--ink)]">{label}</p>
                <p className="mt-1 text-sm leading-5 text-[color:var(--ink-soft)]">{note}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="panel rounded-xl border border-white/60 p-2">
        <div className="flex flex-wrap gap-1.5">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  active
                    ? 'bg-[color:var(--ink)] text-white'
                    : 'text-[color:var(--ink-soft)] hover:bg-white/72 hover:text-[color:var(--ink)]',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Freedom dashboard" eyebrow="Portfolio metrics">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Founder hours reclaimed', '38 hrs'],
                ['Decision latency reduced', '31%'],
                ['Income resilience proxy', '7.0 / 10'],
                ['Value created / effort', '2.1x'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-3"
                >
                  <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Current recommendation" eyebrow="Evidence-backed next step">
            <div className="space-y-3">
              {snapshot.recommendations.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[color:var(--line)] bg-white/76 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    <span>{item.freedomGain} freedom gain</span>
                    <span>•</span>
                    <span>{item.confidence} confidence</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{item.rationale}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'ventures' ? (
        <div className="space-y-4">
          <Panel title="Venture registry" eyebrow="Scored contexts" aside="Weights are editable and versioned in the scoring workbench below.">
            <div className="grid gap-3 lg:grid-cols-3">
              {snapshot.rankedVentures.map((item, index) => (
                <Link
                  key={item.venture.id}
                  href={`/ventures/${item.venture.slug}`}
                  className="rounded-lg border border-[color:var(--line)] bg-white/78 p-4 transition hover:bg-white"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    Rank {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">{item.venture.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{item.venture.thesis}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-[color:var(--surface-strong)] p-3">
                      <p className="text-[color:var(--ink-soft)]">Combined</p>
                      <p className="mt-1 font-semibold text-[color:var(--ink)]">{item.combinedScore}</p>
                    </div>
                    <div className="rounded-md bg-[color:var(--surface-strong)] p-3">
                      <p className="text-[color:var(--ink-soft)]">Time to proof</p>
                      <p className="mt-1 font-semibold text-[color:var(--ink)]">{item.venture.timeToProofWeeks} wks</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Opportunity scoring engine" eyebrow="What should we build next?">
            <ScoreWorkbench ventures={snapshot.ventures} initialWeightSets={snapshot.weightSets} />
          </Panel>
        </div>
      ) : null}

      {activeTab === 'connect' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <Panel title="Freedom Connect" eyebrow="Unified session identity">
            <div className="space-y-3">
              {snapshot.connectSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border border-[color:var(--line)] bg-white/76 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--ink)]">{session.title}</h3>
                      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                        {session.originSurface.replace('_', ' ')} • {session.kind.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="rounded-md bg-[color:var(--primary)]/12 px-2 py-1 text-sm text-[color:var(--primary)]">
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{session.lastSummary}</p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    {session.workspaceLabel} • audit {session.auditCorrelationId}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Connect Activity" eyebrow="Phone + desktop">
            <div className="space-y-3">
              {snapshot.connectEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    <span>{event.source.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{event.intent.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{event.governanceImpact}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{event.summary}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'systems' ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Parallel skill system" eyebrow="Skill-based fan-out">
            <div className="space-y-3">
              {snapshot.skillDefinitions.map((skill) => (
                <div
                  key={skill.id}
                  className="rounded-lg border border-[color:var(--line)] bg-white/76 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    <span>{skill.category}</span>
                    <span>•</span>
                    <span>{skill.parallelMode.replace('-', ' ')}</span>
                    <span>•</span>
                    <span>{skill.maxConcurrentBranches} branches</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{skill.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{skill.purpose}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Self-evolving loops" eyebrow="Parallel internalization">
            <div className="space-y-3">
              {snapshot.selfEvolvingFunctions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    <span>{item.status}</span>
                    <span>•</span>
                    <span>{item.parallelMode.replace('-', ' ')}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{item.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{item.objective}</p>
                  <p className="mt-2 text-sm text-[color:var(--ink)]">
                    Active branches: {item.activeBranches.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'recommendations' ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Recommendation engine" eyebrow="Evidence-backed next steps">
            <div className="space-y-3">
              {snapshot.recommendations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[color:var(--line)] bg-white/76 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                    <span>{item.freedomGain} freedom gain</span>
                    <span>•</span>
                    <span>{item.confidence} confidence</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{item.rationale}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Live operating domains" eyebrow="First integrations">
            <div className="space-y-3">
              {snapshot.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--ink)]">{integration.name}</h3>
                      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{integration.domain}</p>
                    </div>
                    <span className="rounded-md bg-[color:var(--primary)]/12 px-2 py-1 text-sm font-medium text-[color:var(--primary)]">
                      {integration.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{integration.note}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
