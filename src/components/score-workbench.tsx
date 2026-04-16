'use client';

import { useState, useTransition } from 'react';

import { rankVentures } from '@/lib/scoring';
import { scoreDimensions, type Venture, type WeightSet } from '@/lib/types';

type ScoreWorkbenchProps = {
  ventures: Venture[];
  initialWeightSets: WeightSet[];
};

function formatDimensionLabel(dimension: string) {
  return dimension.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

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
  const radarDimensions = scoreDimensions.map((dimension, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / scoreDimensions.length);
    const weight = activeWeights[dimension];
    const scale = Math.max(0, Math.min(1, (weight - 0.5) / 1));
    const outerX = 120 + (Math.cos(angle) * 84);
    const outerY = 120 + (Math.sin(angle) * 84);
    const pointX = 120 + (Math.cos(angle) * 84 * scale);
    const pointY = 120 + (Math.sin(angle) * 84 * scale);

    return {
      key: dimension,
      label: formatDimensionLabel(dimension),
      weight,
      angle,
      outerX,
      outerY,
      pointX,
      pointY,
    };
  });
  const radarPolygon = radarDimensions.map((dimension) => `${dimension.pointX},${dimension.pointY}`).join(' ');

  return (
    <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="rounded-xl border border-[color:var(--line)] bg-white/75 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(activeWeights).map(([dimension, weight]) => (
            <label key={dimension} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[color:var(--ink)]">
                  {formatDimensionLabel(dimension)}
                </span>
                <span className="font-mono text-sm text-[color:var(--primary)]">{weight.toFixed(2)}</span>
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
            className="rounded-md bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[color:var(--primary-strong)] disabled:opacity-60"
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

      <div className="tool-surface rounded-xl p-4">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
                Weight profile
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--ink-on-dark)]">
                Radar scan
              </h3>
            </div>
            <p className="font-mono text-xs text-[color:var(--ink-soft-on-dark)]">0.50 → 1.50</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
            <svg viewBox="0 0 240 240" className="mx-auto h-[220px] w-[220px]" aria-hidden="true">
              {[0.25, 0.5, 0.75, 1].map((ring) => {
                const points = radarDimensions
                  .map((dimension) => {
                    const x = 120 + ((dimension.outerX - 120) * ring);
                    const y = 120 + ((dimension.outerY - 120) * ring);

                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <polygon
                    key={ring}
                    points={points}
                    fill="none"
                    stroke="rgba(232,228,222,0.16)"
                    strokeWidth="1"
                  />
                );
              })}

              {radarDimensions.map((dimension) => (
                <line
                  key={dimension.key}
                  x1="120"
                  y1="120"
                  x2={dimension.outerX}
                  y2={dimension.outerY}
                  stroke="rgba(232,228,222,0.14)"
                  strokeWidth="1"
                />
              ))}

              <polygon
                points={radarPolygon}
                fill="rgba(15,118,110,0.28)"
                stroke="rgba(15,118,110,0.9)"
                strokeWidth="2"
              />

              {radarDimensions.map((dimension) => (
                <circle
                  key={`${dimension.key}-point`}
                  cx={dimension.pointX}
                  cy={dimension.pointY}
                  r="3"
                  fill="rgba(232,228,222,0.95)"
                />
              ))}
            </svg>

            <div className="grid gap-2 sm:grid-cols-2">
              {radarDimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-md border border-white/[0.08] bg-white/[0.05] px-3 py-2">
                  <p className="text-xs text-[color:var(--ink-soft-on-dark)]">{dimension.label}</p>
                  <p className="mt-1 font-mono text-sm text-[color:var(--ink-on-dark)]">
                    {dimension.weight.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-soft-on-dark)]">
            Live ranking
          </p>
          <div className="mt-3 space-y-3">
            {rankedVentures.map((item, index) => (
              <div key={item.venture.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-soft-on-dark)]">
                      Rank {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[color:var(--ink-on-dark)]">
                      {item.venture.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-semibold text-[color:var(--ink-on-dark)]">
                      {item.combinedScore}
                    </p>
                    <p className="text-xs text-[color:var(--ink-soft-on-dark)]">combined priority</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[color:var(--ink-soft-on-dark)]">
                  <p>Venture score: {item.ventureScore}</p>
                  <p>Freedom score: {item.freedomScore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
