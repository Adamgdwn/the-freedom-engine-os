import type { FreedomMetrics, Venture, WeightSet } from '@/lib/types';

const freedomMetricWeights = {
  founderHoursReclaimed: 1,
  scheduleFlexibility: 0.9,
  dependencyReduction: 0.95,
  decisionLatencyReduction: 1,
  incomeResilience: 1,
  familyCapacityProxy: 1,
  locationIndependenceProxy: 0.9,
  valueCreatedToEffortConsumed: 1.1,
} as const;

export function calculateVentureScore(venture: Venture, weightSet: WeightSet) {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const [dimension, weight] of Object.entries(weightSet.weights)) {
    const score = venture.scoreInputs[dimension as keyof typeof weightSet.weights];
    weightedTotal += score * weight;
    weightTotal += weight;
  }

  return Number(((weightedTotal / weightTotal) * 10).toFixed(1));
}

export function calculateFreedomScore(metrics: FreedomMetrics) {
  const weightedTotal =
    metrics.founderHoursReclaimed * freedomMetricWeights.founderHoursReclaimed +
    metrics.scheduleFlexibility * freedomMetricWeights.scheduleFlexibility +
    metrics.dependencyReduction * freedomMetricWeights.dependencyReduction +
    metrics.decisionLatencyReduction * freedomMetricWeights.decisionLatencyReduction +
    metrics.incomeResilience * freedomMetricWeights.incomeResilience +
    metrics.familyCapacityProxy * freedomMetricWeights.familyCapacityProxy +
    metrics.locationIndependenceProxy * freedomMetricWeights.locationIndependenceProxy +
    metrics.valueCreatedToEffortConsumed * 10 * freedomMetricWeights.valueCreatedToEffortConsumed;

  const weightTotal = Object.values(freedomMetricWeights).reduce(
    (total, weight) => total + weight,
    0,
  );

  return Number((weightedTotal / weightTotal).toFixed(1));
}

export function calculateCombinedPriority(venture: Venture, weightSet: WeightSet) {
  const ventureScore = calculateVentureScore(venture, weightSet);
  const freedomScore = calculateFreedomScore(venture.freedomMetrics);

  return {
    ventureScore,
    freedomScore,
    combinedScore: Number((ventureScore * 0.7 + freedomScore * 0.3).toFixed(1)),
  };
}

export function rankVentures(ventures: Venture[], weightSet: WeightSet) {
  return [...ventures]
    .map((venture) => ({
      venture,
      ...calculateCombinedPriority(venture, weightSet),
    }))
    .sort((left, right) => right.combinedScore - left.combinedScore);
}
