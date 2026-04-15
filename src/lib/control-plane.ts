import {
  agents,
  agentBuildRequests,
  approvals,
  connectEvents,
  connectSessions,
  evidenceItems,
  executions,
  experiments,
  humans,
  integrations,
  outboundDecisions,
  overrides,
  policies,
  trustedContactPolicies,
  tools,
  ventures,
  weightSets,
  workflows,
  workflowSteps,
} from '@/lib/seed-data';
import { buildRecommendations } from '@/lib/recommendations';
import { rankVentures } from '@/lib/scoring';
import { buildWeeklyReview } from '@/lib/weekly-review';

export function getControlPlaneSnapshot() {
  const [activeWeights] = weightSets;
  const rankedVentures = rankVentures(ventures, activeWeights);

  return {
    activeWeights,
    weightSets,
    rankedVentures,
    ventures,
    workflows,
    workflowSteps,
    experiments,
    agents,
    humans,
    tools,
    policies,
    approvals,
    executions,
    evidenceItems,
    overrides,
    integrations,
    connectSessions,
    connectEvents,
    trustedContactPolicies,
    outboundDecisions,
    agentBuildRequests,
    recommendations: buildRecommendations(),
    weeklyReview: buildWeeklyReview(),
  };
}

export function getVentureBySlug(slug: string) {
  return ventures.find((venture) => venture.slug === slug) ?? null;
}
