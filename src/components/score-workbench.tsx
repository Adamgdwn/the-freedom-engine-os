'use client';

import { useState, useTransition } from 'react';

import { rankVentures } from '@/lib/scoring';
import { scoreDimensions, type Venture, type WeightSet } from '@/lib/types';

type ScoreWorkbenchProps = {
  ventures: Venture[];
  initialWeightSets: WeightSet[];
};

export function ScoreWorkbench({ ventures, initialWeightSets }: ScoreWorkbenchProps) {
  const fallbackVersion =
    initialWeightSets[0] ??
    ({
      id: 'weights-fallback',
      name: 'Fallback weights',
      effectiveDate: '2026-04-12',
      notes: 'Fallback weight set used when no configured version is available.',
      weights: Object.fromEntries(scoreDimensions.map((dimension) => [dimension, 1])),
    } as WeightSet);

  const [versions, setVersions] = useState(initialWeightSets);
  const [selectedVersionId, setSelectedVersionId] = useState(fallbackVersion.id);
  const [draftWeights, setDraftWeights] = useState(fallbackVersion.weights);
  const [isPending, startTransition] = useTransition();

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? fallbackVersion;
  const activeWeights = draftWeights ?? selectedVersion.weights;
  const liveVersion: WeightSet = {
    ...selectedVersion,
    id: 'session-draft',
    name: 'Session draft',
    notes: 'Unsaved in-memory simulation for scoring conversations.',
    weights: activeWeights,
  };
  const rankedVentures = rankVentures(ventures, liveVersion);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/75 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
              Versioned weights
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
              Opportunity scoring engine
            </h3>
          </div>
          <select
            className="field max-w-xs"
            value={selectedVersionId}
            onChange={(event) => {
              const nextVersion = versions.find((version) => version.id === event.target.value);
              if (!nextVersion) {
                return;
              }

              setSelectedVersionId(nextVersion.id);
              setDraftWeights(nextVersion.weights);
            }}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name} ({version.effectiveDate})
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{selectedVersion.notes}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Object.entries(activeWeights).map(([dimension, weight]) => (
            <label key={dimension} className="rounded-[1.35rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[color:var(--ink)]">
                  {dimension.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-sm text-[color:var(--primary)]">{weight.toFixed(2)}</span>
              </div>
              <input
                className="mt-4 h-2 w-full accent-[color:var(--primary)]"
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={weight}
                onChange={(event) =>
                  setDraftWeights((current) => ({
                    ...(current ?? selectedVersion.weights),
                    [dimension]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            className="rounded-full bg-[color:var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[color:var(--primary-strong)] disabled:opacity-60"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                const nextVersion: WeightSet = {
                  id: `weights-session-${versions.length + 1}`,
                  name: `Scenario ${versions.length + 1}`,
                  effectiveDate: new Date().toISOString().slice(0, 10),
                  notes: 'Saved from the live score workbench to compare venture priority shifts.',
                  weights: activeWeights,
                };

                setVersions((current) => [nextVersion, ...current]);
                setSelectedVersionId(nextVersion.id);
              })
            }
          >
            {isPending ? 'Saving version…' : 'Save simulation version'}
          </button>
          <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
            Use this to pressure-test venture allocation before you change any real priorities.
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--ink)] p-5 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-white/65">Live ranking</p>
        <div className="mt-4 space-y-3">
          {rankedVentures.map((item, index) => (
            <div key={item.venture.id} className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                    Rank {index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{item.venture.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">{item.combinedScore}</p>
                  <p className="text-xs text-white/65">combined priority</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/75">
                <p>Venture score: {item.ventureScore}</p>
                <p>Freedom score: {item.freedomScore}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
