import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot, getVentureBySlug } from '@/lib/control-plane';

export default async function VentureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venture = getVentureBySlug(slug);
  const snapshot = getControlPlaneSnapshot();

  if (!venture) {
    notFound();
  }

  const ventureWorkflows = snapshot.workflows.filter((workflow) => workflow.ventureId === venture.id);
  const ventureExperiments = snapshot.experiments.filter(
    (experiment) => experiment.ventureId === venture.id,
  );
  const ventureEvidence = snapshot.evidenceItems.filter((item) => item.relatedEntity === venture.id);

  return (
    <AppShell
      title={venture.name}
      summary="Venture detail combines thesis, economics, workflow ownership, proof horizon, and linked evidence so resource decisions stay legible."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <Panel title="Venture registry record" eyebrow={venture.currentStatus}>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            {[
              ['Target customer', venture.targetCustomer],
              ['Target market', venture.targetMarket],
              ['Core workflow owned', venture.coreWorkflowOwned],
              ['Revenue model', venture.revenueModel],
              ['Current maturity', venture.currentMaturity],
              ['Distribution path', venture.distributionPath],
              ['Data moat notes', venture.dataMoatNotes],
              ['Time to proof', `${venture.timeToProofWeeks} weeks`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
                  {label}
                </p>
                <p className="mt-2 leading-6 text-[color:var(--ink)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.6rem] bg-[color:var(--ink)] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Thesis</p>
            <p className="mt-3 text-base leading-7 text-white/82">{venture.thesis}</p>
          </div>
        </Panel>

        <Panel title="Freedom metrics" eyebrow="Outcomes, not vibes">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Founder hours reclaimed', `${venture.freedomMetrics.founderHoursReclaimed} hrs`],
              ['Schedule flexibility', `${venture.freedomMetrics.scheduleFlexibility} / 10`],
              ['Dependency reduction', `${venture.freedomMetrics.dependencyReduction} / 10`],
              ['Decision latency reduced', `${venture.freedomMetrics.decisionLatencyReduction} / 10`],
              ['Income resilience', `${venture.freedomMetrics.incomeResilience} / 10`],
              ['Family-time capacity proxy', `${venture.freedomMetrics.familyCapacityProxy} / 10`],
              ['Location independence', `${venture.freedomMetrics.locationIndependenceProxy} / 10`],
              ['Value / effort', `${venture.freedomMetrics.valueCreatedToEffortConsumed.toFixed(1)}x`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.45rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
              >
                <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Workflow and experiments" eyebrow="Execution context">
          <div className="space-y-4">
            {ventureWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
              >
                <h3 className="text-lg font-semibold text-[color:var(--ink)]">{workflow.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {workflow.purpose}
                </p>
              </div>
            ))}
            {ventureExperiments.map((experiment) => (
              <div
                key={experiment.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
                  Experiment
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">
                  {experiment.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {experiment.hypothesis}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Evidence and integrations" eyebrow="Traceable value">
          <div className="space-y-4">
            {ventureEvidence.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/75 p-4"
              >
                <h3 className="text-lg font-semibold text-[color:var(--ink)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{item.summary}</p>
              </div>
            ))}
            <div className="rounded-[1.5rem] bg-[color:var(--ink)] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Live integrations</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {venture.integrations.map((integrationId) => {
                  const integration = snapshot.integrations.find((item) => item.id === integrationId);

                  return (
                    <span
                      key={integrationId}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/82"
                    >
                      {integration?.name ?? integrationId}
                    </span>
                  );
                })}
              </div>
              <Link
                href="/evidence-room"
                className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-medium text-[color:var(--ink)]"
              >
                Open evidence room
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
