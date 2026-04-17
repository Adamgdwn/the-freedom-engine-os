import {
  agents,
  agentBuildRequests,
  approvals,
  artifactPlacementDecisions,
  capabilityDefinitions,
  canonicalSourceLinks,
  connectEvents,
  connectSessions,
  documentationDecisions,
  escalationDecisions,
  escalationRequests,
  evidenceItems,
  executions,
  executionBudgets,
  experiments,
  humans,
  integrations,
  knowledgeArtifacts,
  knowledgeRetentionPolicies,
  outboundDecisions,
  overrides,
  policies,
  retrievalRecords,
  selfEvolvingFunctions,
  skillDefinitions,
  skillAcquisitionDecisions,
  trustedContactPolicies,
  tools,
  ventures,
  weightSets,
  workflows,
  workflowSteps,
} from '@/lib/seed-data';
import { describeVoiceRuntimeStatus } from '@/lib/model-router';
import { buildRecommendations } from '@/lib/recommendations';
import { rankVentures } from '@/lib/scoring';
import { buildWeeklyReview } from '@/lib/weekly-review';

export function getControlPlaneSnapshot() {
  const [activeWeights] = weightSets;
  const rankedVentures = rankVentures(ventures, activeWeights);
  const modelRouterStatus = describeVoiceRuntimeStatus();

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
    skillDefinitions,
    selfEvolvingFunctions,
    capabilityDefinitions,
    escalationRequests,
    escalationDecisions,
    executionBudgets,
    documentationDecisions,
    knowledgeArtifacts,
    artifactPlacementDecisions,
    retrievalRecords,
    canonicalSourceLinks,
    skillAcquisitionDecisions,
    knowledgeRetentionPolicies,
    modelRouterStatus,
    recommendations: buildRecommendations(),
    weeklyReview: buildWeeklyReview(),
  };
}

export type ControlPlaneSnapshot = ReturnType<typeof getControlPlaneSnapshot>;

export function getVentureBySlug(slug: string) {
  return ventures.find((venture) => venture.slug === slug) ?? null;
}
