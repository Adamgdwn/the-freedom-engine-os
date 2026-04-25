import 'server-only';

import { operatorRunLedgerSchema, type OperatorRunLedger } from '@freedom/shared';
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
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { buildWeeklyReview } from '@/lib/weekly-review';
import type {
  Approval,
  Execution,
  Experiment,
  Venture,
  Workflow,
  WorkflowStep,
} from '@/lib/types';

type VentureRow = {
  id: string;
  slug: string;
  name: string;
  thesis: string;
  target_customer: string;
  target_market: string;
  core_workflow_owned: string;
  revenue_model: string;
  current_maturity: string;
  cost_to_date: number;
  time_to_proof_weeks: number;
  distribution_path: string;
  data_moat_notes: string;
  current_status: string;
};

type ApprovalRow = {
  id: string;
  subject: string;
  owner_name: string;
  status: Approval['status'];
  threshold_rule: string;
};

type ExecutionRow = {
  id: string;
  workflow_id: string | null;
  agent_id: string | null;
  status: Execution['status'];
  outcome: string;
  evidence_ids: string[] | null;
  human_escalation: boolean;
};

type ExperimentRow = {
  id: string;
  venture_id: string;
  name: string;
  hypothesis: string;
  stage: Experiment['stage'];
  owner_name: string;
  next_checkpoint: string | null;
};

type WorkflowRow = {
  id: string;
  venture_id: string;
  name: string;
  purpose: string;
  latency_hours: number;
  ai_suitability: Workflow['aiSuitability'];
  governance_risk: Workflow['governanceRisk'];
  required_human_approvals: string[] | null;
  failure_points: string[] | null;
};

type WorkflowStepRow = {
  id: string;
  workflow_id: string;
  name: string;
  actor_name: string;
  systems_touched: string[] | null;
  handoff_to: string;
  latency_minutes: number;
  ai_suitability: WorkflowStep['aiSuitability'];
  approval_required: boolean;
  governance_risk: WorkflowStep['governanceRisk'];
};

function emptyOperatorRunLedger(configured = false): OperatorRunLedger {
  return {
    configured,
    runs: [],
    activeCount: 0,
    awaitingApprovalCount: 0,
    completedCount: 0,
    updatedAt: null,
  };
}

function resolveLocalGatewayBaseUrl(): string {
  const explicit = process.env.DESKTOP_GATEWAY_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const port = process.env.GATEWAY_PORT ?? '43111';
  return `http://127.0.0.1:${port}`;
}

async function loadOperatorRunLedger(): Promise<OperatorRunLedger> {
  try {
    const response = await fetch(`${resolveLocalGatewayBaseUrl()}/api/operator-runs`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return emptyOperatorRunLedger(false);
    }

    const parsed = operatorRunLedgerSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : emptyOperatorRunLedger(false);
  } catch {
    return emptyOperatorRunLedger(false);
  }
}

function cloneSeedSnapshot() {
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
    operatorRunLedger: emptyOperatorRunLedger(false),
    modelRouterStatus,
    recommendations: buildRecommendations(),
    weeklyReview: buildWeeklyReview(),
  };
}

export function getControlPlaneSnapshot() {
  return cloneSeedSnapshot();
}

export type ControlPlaneSnapshot = ReturnType<typeof getControlPlaneSnapshot>;

function defaultScoreInputs(): Venture['scoreInputs'] {
  return {
    painIntensity: 0,
    revenueProximity: 0,
    workflowOwnership: 0,
    timeToProof: 0,
    dataMoatPotential: 0,
    distributionAdvantage: 0,
    governanceTractability: 0,
    technicalFeasibility: 0,
    internalStrategicLeverage: 0,
    founderUnfairAdvantage: 0,
  };
}

function defaultFreedomMetrics(): Venture['freedomMetrics'] {
  return {
    founderHoursReclaimed: 0,
    scheduleFlexibility: 0,
    dependencyReduction: 0,
    decisionLatencyReduction: 0,
    incomeResilience: 0,
    familyCapacityProxy: 0,
    locationIndependenceProxy: 0,
    valueCreatedToEffortConsumed: 0,
  };
}

function mergeVenture(seed: Venture | undefined, row: VentureRow): Venture {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    thesis: row.thesis,
    targetCustomer: row.target_customer,
    targetMarket: row.target_market,
    coreWorkflowOwned: row.core_workflow_owned,
    revenueModel: row.revenue_model,
    currentMaturity: row.current_maturity,
    costToDate: Number(row.cost_to_date ?? 0),
    timeToProofWeeks: row.time_to_proof_weeks,
    distributionPath: row.distribution_path,
    dataMoatNotes: row.data_moat_notes,
    currentStatus: row.current_status,
    scoreInputs: seed?.scoreInputs ?? defaultScoreInputs(),
    freedomMetrics: seed?.freedomMetrics ?? defaultFreedomMetrics(),
    integrations: seed?.integrations ?? [],
    evidenceIds: seed?.evidenceIds ?? [],
  };
}

function mergeWorkflow(seed: Workflow | undefined, row: WorkflowRow): Workflow {
  return {
    id: row.id,
    ventureId: row.venture_id,
    name: row.name,
    purpose: row.purpose,
    latencyHours: Number(row.latency_hours ?? 0),
    aiSuitability: row.ai_suitability,
    governanceRisk: row.governance_risk,
    requiredHumanApprovals: row.required_human_approvals ?? seed?.requiredHumanApprovals ?? [],
    failurePoints: row.failure_points ?? seed?.failurePoints ?? [],
  };
}

function mergeWorkflowStep(seed: WorkflowStep | undefined, row: WorkflowStepRow): WorkflowStep {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    name: row.name,
    actor: row.actor_name,
    systemsTouched: row.systems_touched ?? seed?.systemsTouched ?? [],
    handoffTo: row.handoff_to,
    latencyMinutes: row.latency_minutes,
    aiSuitability: row.ai_suitability,
    approvalRequired: row.approval_required,
    governanceRisk: row.governance_risk,
  };
}

function mergeExperiment(seed: Experiment | undefined, row: ExperimentRow): Experiment {
  return {
    id: row.id,
    ventureId: row.venture_id,
    name: row.name,
    hypothesis: row.hypothesis,
    stage: row.stage,
    owner: row.owner_name,
    nextCheckpoint: row.next_checkpoint ?? seed?.nextCheckpoint ?? new Date().toISOString().slice(0, 10),
  };
}

function mergeApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    subject: row.subject,
    owner: row.owner_name,
    status: row.status,
    threshold: row.threshold_rule,
  };
}

function mergeExecution(seed: Execution | undefined, row: ExecutionRow): Execution {
  return {
    id: row.id,
    workflowId: row.workflow_id ?? seed?.workflowId ?? '',
    agentId: row.agent_id ?? seed?.agentId ?? '',
    status: row.status,
    outcome: row.outcome,
    evidenceIds: row.evidence_ids ?? seed?.evidenceIds ?? [],
    humanEscalation: row.human_escalation,
  };
}

export async function loadControlPlaneSnapshot(): Promise<ControlPlaneSnapshot> {
  const seedSnapshot = cloneSeedSnapshot();
  const operatorRunLedger = await loadOperatorRunLedger();
  if (!isSupabaseAdminConfigured()) {
    return {
      ...seedSnapshot,
      operatorRunLedger,
    };
  }

  const client = createSupabaseAdminClient();
  const [
    venturesResult,
    workflowsResult,
    workflowStepsResult,
    experimentsResult,
    approvalsResult,
    executionsResult,
  ] = await Promise.all([
    client.from('ventures').select('id, slug, name, thesis, target_customer, target_market, core_workflow_owned, revenue_model, current_maturity, cost_to_date, time_to_proof_weeks, distribution_path, data_moat_notes, current_status'),
    client.from('workflows').select('id, venture_id, name, purpose, latency_hours, ai_suitability, governance_risk, required_human_approvals, failure_points'),
    client.from('workflow_steps').select('id, workflow_id, name, actor_name, systems_touched, handoff_to, latency_minutes, ai_suitability, approval_required, governance_risk'),
    client.from('experiments').select('id, venture_id, name, hypothesis, stage, owner_name, next_checkpoint'),
    client.from('approvals').select('id, subject, owner_name, status, threshold_rule'),
    client.from('executions').select('id, workflow_id, agent_id, status, outcome, evidence_ids, human_escalation'),
  ]);

  if (venturesResult.error || workflowsResult.error || workflowStepsResult.error || experimentsResult.error || approvalsResult.error || executionsResult.error) {
    return {
      ...seedSnapshot,
      operatorRunLedger,
    };
  }

  const liveVenturesRows = (venturesResult.data ?? []) as VentureRow[];
  const liveWorkflowsRows = (workflowsResult.data ?? []) as WorkflowRow[];
  const liveWorkflowStepsRows = (workflowStepsResult.data ?? []) as WorkflowStepRow[];
  const liveExperimentsRows = (experimentsResult.data ?? []) as ExperimentRow[];
  const liveApprovalsRows = (approvalsResult.data ?? []) as ApprovalRow[];
  const liveExecutionsRows = (executionsResult.data ?? []) as ExecutionRow[];

  const mergedVentures = liveVenturesRows.length
    ? liveVenturesRows.map((row) => mergeVenture(seedSnapshot.ventures.find((item) => item.slug === row.slug), row))
    : seedSnapshot.ventures;
  const ventureIdBySlug = new Map(mergedVentures.map((item) => [item.slug, item.id]));
  const seedWorkflowByName = new Map(seedSnapshot.workflows.map((item) => [item.name, item]));
  const mergedWorkflows = liveWorkflowsRows.length
    ? liveWorkflowsRows.map((row) => mergeWorkflow(seedWorkflowByName.get(row.name), row))
    : seedSnapshot.workflows;
  const seedWorkflowStepByName = new Map(seedSnapshot.workflowSteps.map((item) => [`${item.workflowId}:${item.name}`, item]));
  const mergedWorkflowSteps = liveWorkflowStepsRows.length
    ? liveWorkflowStepsRows.map((row) => mergeWorkflowStep(seedWorkflowStepByName.get(`${row.workflow_id}:${row.name}`), row))
    : seedSnapshot.workflowSteps;
  const seedExperimentByName = new Map(seedSnapshot.experiments.map((item) => [item.name, item]));
  const mergedExperiments = liveExperimentsRows.length
    ? liveExperimentsRows.map((row) => mergeExperiment(seedExperimentByName.get(row.name), row))
    : seedSnapshot.experiments;
  const mergedApprovals = liveApprovalsRows.length
    ? liveApprovalsRows.map(mergeApproval)
    : seedSnapshot.approvals;
  const seedExecutionByOutcome = new Map(seedSnapshot.executions.map((item) => [item.outcome, item]));
  const mergedExecutions = liveExecutionsRows.length
    ? liveExecutionsRows.map((row) => mergeExecution(seedExecutionByOutcome.get(row.outcome), row))
    : seedSnapshot.executions;

  const [activeWeights] = seedSnapshot.weightSets;
  const rankedVentures = rankVentures(mergedVentures, activeWeights);

  return {
    ...seedSnapshot,
    operatorRunLedger,
    rankedVentures,
    ventures: mergedVentures,
    workflows: mergedWorkflows,
    workflowSteps: mergedWorkflowSteps,
    experiments: mergedExperiments,
    approvals: mergedApprovals,
    executions: mergedExecutions,
    recommendations: buildRecommendations({
      ventures: mergedVentures,
      workflows: mergedWorkflows,
      executions: mergedExecutions,
      evidenceItems: seedSnapshot.evidenceItems,
      weightSets: seedSnapshot.weightSets,
    }),
    weeklyReview: buildWeeklyReview({
      executions: mergedExecutions,
      recommendations: buildRecommendations({
        ventures: mergedVentures,
        workflows: mergedWorkflows,
        executions: mergedExecutions,
        evidenceItems: seedSnapshot.evidenceItems,
        weightSets: seedSnapshot.weightSets,
      }),
    }),
  };
}

export function getVentureBySlug(slug: string) {
  return ventures.find((venture) => venture.slug === slug) ?? null;
}

export async function loadVentureBySlug(slug: string) {
  const snapshot = await loadControlPlaneSnapshot();
  return snapshot.ventures.find((venture) => venture.slug === slug) ?? null;
}
