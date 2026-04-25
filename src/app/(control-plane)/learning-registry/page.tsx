import { AppShell }              from '@/components/app-shell';
import { Panel }                  from '@/components/panel';
import { loadControlPlaneSnapshot } from '@/lib/control-plane';

const STATE_COLOR: Record<string, string> = {
  observed:     'bg-[color:var(--ink)]/8 text-[color:var(--ink)]',
  building:     'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  validating:   'bg-[color:var(--primary)]/12 text-[color:var(--primary)]',
  internalized: 'bg-emerald-100 text-emerald-800',
  deprecated:   'bg-[color:var(--danger)]/12 text-[color:var(--danger)]',
};

const INTERNALIZATION_COLOR: Record<string, string> = {
  'not-started': 'bg-[color:var(--ink)]/8 text-[color:var(--ink)]',
  'in-progress': 'bg-[color:var(--accent)]/12 text-[color:var(--accent)]',
  'validated':   'bg-[color:var(--primary)]/12 text-[color:var(--primary)]',
  'internalized':'bg-emerald-100 text-emerald-800',
};

export default async function LearningRegistryPage() {
  const snapshot = await loadControlPlaneSnapshot();

  return (
    <AppShell title="Learning Registry">
      <div className="space-y-6">
        <Panel title="Capability registry" eyebrow="Internalization status">
          <div className="space-y-5">
            {snapshot.capabilityDefinitions.map((cap) => (
              <div
                key={cap.id}
                className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/75 p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-[color:var(--ink)]">{cap.name}</h3>
                      {cap.coreAdmission && (
                        <span className="rounded-full bg-[color:var(--primary)] px-2.5 py-0.5 text-xs font-medium text-white">
                          core
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">
                      {cap.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATE_COLOR[cap.state] ?? ''}`}>
                      {cap.state}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs ${INTERNALIZATION_COLOR[cap.internalizationStatus] ?? ''}`}>
                      {cap.internalizationStatus.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Source</p>
                    <p className="mt-1 font-medium text-[color:var(--ink)]">{cap.source}</p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Runtime cost</p>
                    <p className="mt-1 font-medium text-[color:var(--ink)]">{cap.runtimeCost}</p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Model preference</p>
                    <p className="mt-1 font-medium text-[color:var(--ink)]">{cap.modelPreference}</p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">Usage count</p>
                    <p className="mt-1 font-medium text-[color:var(--ink)]">{cap.usageCount}</p>
                  </div>
                </div>

                {cap.safetyNotes && (
                  <p className="mt-3 rounded-2xl border border-[color:var(--danger)]/20 bg-[color:var(--danger)]/5 px-4 py-3 text-sm leading-6 text-[color:var(--ink)]">
                    <span className="font-medium text-[color:var(--danger)]">Safety: </span>
                    {cap.safetyNotes}
                  </p>
                )}

                {cap.builderDependency && (
                  <div className="mt-3 rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm">
                    <span className="font-medium text-[color:var(--ink)]">Builder dependency: </span>
                    <span className="text-[color:var(--ink-soft)]">
                      {cap.builderDependency.builderName}
                      {cap.builderDependency.required ? ' — still required' : ''}
                    </span>
                  </div>
                )}

                {cap.validationRecord && (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm">
                    <p className="font-medium text-emerald-800">Validation record</p>
                    <p className="mt-1 text-[color:var(--ink-soft)]">
                      Governance outputs: {cap.validationRecord.governanceOutputsMatch ? 'match' : 'mismatch'} •{' '}
                      Docs: {cap.validationRecord.docArtifactsMatch ? 'match' : 'mismatch'} •{' '}
                      Runtime cost: {cap.validationRecord.runtimeCostRecorded ? 'recorded' : 'pending'} •{' '}
                      By {cap.validationRecord.validatedBy}
                    </p>
                  </div>
                )}

                {cap.learningRecords.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cap.learningRecords.map((lr) => (
                      <div
                        key={lr.id}
                        className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm"
                      >
                        <p className="font-medium text-[color:var(--ink)]">{lr.event}</p>
                        <p className="mt-1 text-[color:var(--ink-soft)]">
                          Provenance: {lr.provenance} • Model: {lr.modelPreference}
                        </p>
                        {lr.externalBuilderStillRequired && (
                          <p className="mt-1 text-[color:var(--accent)]">External builder still required</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
