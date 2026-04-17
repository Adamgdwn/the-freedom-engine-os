export const scoreDimensions = [
  'painIntensity',
  'revenueProximity',
  'workflowOwnership',
  'timeToProof',
  'dataMoatPotential',
  'distributionAdvantage',
  'governanceTractability',
  'technicalFeasibility',
  'internalStrategicLeverage',
  'founderUnfairAdvantage',
] as const;

export type ScoreDimension = (typeof scoreDimensions)[number];

export type ScoreInputs = Record<ScoreDimension, number>;

export type WeightSet = {
  id: string;
  name: string;
  effectiveDate: string;
  notes: string;
  weights: Record<ScoreDimension, number>;
};

export type FreedomMetrics = {
  founderHoursReclaimed: number;
  scheduleFlexibility: number;
  dependencyReduction: number;
  decisionLatencyReduction: number;
  incomeResilience: number;
  familyCapacityProxy: number;
  locationIndependenceProxy: number;
  valueCreatedToEffortConsumed: number;
};

export type Venture = {
  id: string;
  slug: string;
  name: string;
  thesis: string;
  targetCustomer: string;
  targetMarket: string;
  coreWorkflowOwned: string;
  revenueModel: string;
  currentMaturity: string;
  costToDate: number;
  timeToProofWeeks: number;
  distributionPath: string;
  dataMoatNotes: string;
  currentStatus: string;
  scoreInputs: ScoreInputs;
  freedomMetrics: FreedomMetrics;
  integrations: string[];
  evidenceIds: string[];
};

export type Experiment = {
  id: string;
  ventureId: string;
  name: string;
  hypothesis: string;
  stage: 'proposed' | 'running' | 'complete';
  owner: string;
  nextCheckpoint: string;
};

export type Workflow = {
  id: string;
  ventureId: string;
  name: string;
  purpose: string;
  latencyHours: number;
  aiSuitability: 'high' | 'medium' | 'low';
  governanceRisk: 'low' | 'medium' | 'high';
  requiredHumanApprovals: string[];
  failurePoints: string[];
};

export type WorkflowStep = {
  id: string;
  workflowId: string;
  name: string;
  actor: string;
  systemsTouched: string[];
  handoffTo: string;
  latencyMinutes: number;
  aiSuitability: 'high' | 'medium' | 'low';
  approvalRequired: boolean;
  governanceRisk: 'low' | 'medium' | 'high';
};

export type AgentProfile = {
  id: string;
  role: string;
  model: string;
  autonomy: 'A0' | 'A1' | 'A2';
  defaultMode: 'ai-run' | 'human-led' | 'hybrid';
  allowedActions: string[];
  blockedActions: string[];
  status: 'active' | 'guarded' | 'draft';
};

export type HumanProfile = {
  id: string;
  name: string;
  role: string;
  authority: string[];
};

export type ToolProfile = {
  id: string;
  name: string;
  purpose: string;
  approvalRequired: string;
  prohibitedUse: string;
};

export type Policy = {
  id: string;
  name: string;
  scope: string;
  rule: string;
  humanApprovalRequired: boolean;
};

export type Approval = {
  id: string;
  subject: string;
  owner: string;
  status: 'approved' | 'pending' | 'rejected';
  threshold: string;
};

export type Execution = {
  id: string;
  workflowId: string;
  agentId: string;
  status: 'completed' | 'awaiting-approval' | 'blocked';
  outcome: string;
  evidenceIds: string[];
  humanEscalation: boolean;
};

export type EvidenceItem = {
  id: string;
  title: string;
  type: 'metric' | 'workflow-log' | 'customer-signal' | 'financial' | 'governance';
  source: string;
  summary: string;
  relatedEntity: string;
};

export type Override = {
  id: string;
  subject: string;
  reason: string;
  owner: string;
  followUp: string;
};

export type Recommendation = {
  id: string;
  title: string;
  action: string;
  rationale: string;
  evidenceIds: string[];
  freedomGain: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
};

export type Integration = {
  id: string;
  name: string;
  domain: string;
  status: 'live' | 'planned';
  note: string;
};

export type WeeklyReview = {
  createdValue: string[];
  wastedMotion: string[];
  freedomUp: string[];
  freedomDown: string[];
  recommendations: string[];
  humanJudgmentRequired: string[];
};

export type ConnectSurface = 'desktop_shell' | 'mobile_companion';

export type ConnectSessionKind =
  | 'operator'
  | 'governed_task'
  | 'approval'
  | 'build_request'
  | 'venture_action';

export type CommunicationIntent =
  | 'operator_chat'
  | 'governed_task'
  | 'approval'
  | 'build_request'
  | 'venture_action';

export type OutboundApprovalState = 'not-required' | 'pending' | 'approved' | 'blocked';

export type TrustedContactPolicy = {
  id: string;
  label: string;
  scope: string;
  trustedRecipients: string[];
  approvalRequired: boolean;
};

export type OutboundDecision = {
  id: string;
  channel: 'email' | 'text' | 'voice';
  recipient: string;
  summary: string;
  approvalState: OutboundApprovalState;
};

export type ConnectSession = {
  id: string;
  freedomSessionId: string;
  title: string;
  assistantName: 'Freedom';
  originSurface: ConnectSurface;
  kind: ConnectSessionKind;
  rootPath: string;
  workspaceLabel: string;
  auditCorrelationId: string;
  status: 'live' | 'idle' | 'needs-attention';
  lastSummary: string;
  startedAt: string;
  lastActivityAt: string;
};

export type ConnectEvent = {
  id: string;
  sessionId: string;
  source: ConnectSurface;
  intent: CommunicationIntent;
  summary: string;
  governanceImpact: 'info' | 'approval-needed' | 'builder-routed';
  createdAt: string;
};

export type AgentBuildRequest = {
  id: string;
  capability: string;
  requestedFrom: ConnectSurface;
  requestedBy: string;
  status: 'routed-to-builder' | 'pending-approval' | 'internalized-path' | 'blocked';
  builder: 'New Build Agent';
  executionMode: 'serial' | 'parallel-research' | 'parallel-build' | 'parallel-validation';
  parallelLaneCount: number;
  coordinatorSkillId: string;
  routeReason: string;
  auditCorrelationId: string;
  requestedAt: string;
};

export type SkillParallelMode = 'serial-only' | 'parallel-capable' | 'parallel-native';

export type SkillDefinition = {
  id: string;
  name: string;
  category: 'builder' | 'research' | 'validation' | 'operations';
  purpose: string;
  status: 'seeded' | 'learning' | 'internalized';
  validationStatus: 'draft' | 'needs-evidence' | 'validated';
  parallelMode: SkillParallelMode;
  maxConcurrentBranches: number;
  preferredBranches: string[];
  lastLearnedAt: string;
};

// ─── Communication ───────────────────────────────────────────────────────────

export type CommunicationChannel = 'wake' | 'email' | 'text' | 'voice' | 'operator_chat';

// ─── Capability layer ─────────────────────────────────────────────────────────

export type CapabilitySource = 'internal' | 'external-builder' | 'external-tool';
export type CapabilityState =
  | 'observed'
  | 'building'
  | 'validating'
  | 'internalized'
  | 'deprecated';
export type InternalizationStatus =
  | 'not-started'
  | 'in-progress'
  | 'validated'
  | 'internalized';

export type CapabilityValidationRecord = {
  id: string;
  capabilityId: string;
  governanceOutputsMatch: boolean;
  docArtifactsMatch: boolean;
  runtimeCostRecorded: boolean;
  validatedAt: string;
  validatedBy: string;
};

export type BuilderDependency = {
  id: string;
  capabilityId: string;
  builderName: string;
  required: boolean;
  replacedBy: string | null;
};

export type UpgradeDecision = {
  id: string;
  capabilityId: string;
  decision: 'keep-external' | 'wrap' | 'internalize';
  rationale: string;
  decidedAt: string;
};

export type LearningRecord = {
  id: string;
  capabilityId: string;
  event: string;
  provenance: string;
  modelPreference: string;
  safetyNotes: string;
  internalizationStatus: InternalizationStatus;
  externalBuilderStillRequired: boolean;
  recordedAt: string;
};

export type CapabilityDefinition = {
  id: string;
  name: string;
  description: string;
  source: CapabilitySource;
  state: CapabilityState;
  internalizationStatus: InternalizationStatus;
  runtimeCost: 'low' | 'medium' | 'high';
  modelPreference: string;
  safetyNotes: string;
  builderDependency: BuilderDependency | null;
  validationRecord: CapabilityValidationRecord | null;
  learningRecords: LearningRecord[];
  usageCount: number;
  lastUsedAt: string;
  coreAdmission: boolean;
};

// ─── Agent-build contracts ────────────────────────────────────────────────────

export type ModelTier =
  | 'local-default'
  | 'escalate-with-approval'
  | 'human-forced-provider';

export type AgentBlueprint = {
  id: string;
  buildRequestId: string;
  name: string;
  role: string;
  tools: string[];
  modelTier: ModelTier;
  systemPromptSummary: string;
  createdAt: string;
};

export type AgentGovernanceBundle = {
  id: string;
  buildRequestId: string;
  policies: string[];
  approvals: string[];
  auditCorrelationId: string;
  complete: boolean;
};

export type AgentValidationChecklist = {
  id: string;
  buildRequestId: string;
  items: { label: string; passed: boolean }[];
  allPassed: boolean;
  checkedAt: string;
};

export type AgentPromotionRecord = {
  id: string;
  buildRequestId: string;
  promotedAt: string;
  promotedBy: string;
  capabilityId: string;
  notes: string;
};

// ─── Model routing ────────────────────────────────────────────────────────────

export type ProviderRecommendation = {
  tier: ModelTier;
  provider: 'local' | 'codex' | 'claude-code';
  reason: string;
};

export type EscalationRequest = {
  id: string;
  taskSummary: string;
  whyLocalInsufficient: string;
  recommendation: ProviderRecommendation;
  expectedBenefit: string;
  costSpeedTradeoff: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
};

export type EscalationDecision = {
  id: string;
  escalationRequestId: string;
  decision: 'approved' | 'denied';
  decidedBy: string;
  outcome: string;
  decidedAt: string;
};

export type ExecutionBudget = {
  id: string;
  taskId: string;
  maxLocalAttempts: number;
  escalationAllowed: boolean;
  preferredProvider: 'local' | 'codex' | 'claude-code';
  hardCap: boolean;
};

// ─── Self-evolving functions ──────────────────────────────────────────────────

export type SelfEvolvingFunction = {
  id: string;
  name: string;
  objective: string;
  status: 'observing' | 'planning' | 'building' | 'validating' | 'internalized';
  trigger: string;
  parallelMode: SkillParallelMode;
  activeBranches: string[];
  branchCoordinatorSkillId: string;
  nextPromotionGate: string;
  auditCorrelationId: string;
};

// ─── Knowledge governance ─────────────────────────────────────────────────────

export type ConversationDisposition =
  | 'document'
  | 'summarize'
  | 'link'
  | 'archive'
  | 'discard';

export type KnowledgeArtifactKind =
  | 'decision-note'
  | 'summary'
  | 'spec'
  | 'runbook-update'
  | 'memory-record'
  | 'retrieval-index';

export type ArtifactPermanence = 'temporary' | 'working' | 'durable' | 'canonical';

export type ArtifactPlacementTarget =
  | 'docs-root'
  | 'docs-specs'
  | 'docs-architecture'
  | 'docs-manual'
  | 'docs-runbook'
  | 'runtime-store'
  | 'working-notes'
  | 'archive';

export type DocumentationDecision = {
  id: string;
  sourceSessionId: string | null;
  sourceKind: CommunicationIntent | 'internal-review' | 'workflow-analysis';
  disposition: ConversationDisposition;
  rationale: string;
  retrievalValue: 'low' | 'medium' | 'high';
  decidedAt: string;
};

export type ArtifactPlacementDecision = {
  id: string;
  artifactId: string;
  target: ArtifactPlacementTarget;
  pathRecommendation: string;
  permanence: ArtifactPermanence;
  rationale: string;
  decidedAt: string;
};

export type CanonicalSourceLink = {
  id: string;
  concept: string;
  canonicalArtifactId: string;
  supersedesArtifactIds: string[];
  note: string;
};

export type RetrievalRecord = {
  id: string;
  artifactId: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
  updatedAt: string;
  supersededBy: string | null;
};

export type KnowledgeArtifact = {
  id: string;
  title: string;
  kind: KnowledgeArtifactKind;
  summary: string;
  sourceDecisionId: string;
  placementDecisionId: string | null;
  permanence: ArtifactPermanence;
  canonical: boolean;
  owner: 'Freedom' | 'Adam' | 'hybrid-session';
  lastReviewedAt: string;
};

export type SkillAcquisitionDecision = {
  id: string;
  skillName: string;
  triggerPattern: string;
  decision: 'learn-new-skill' | 'strengthen-existing-skill' | 'keep-external' | 'document-procedure';
  expectedFreedomGain: 'low' | 'medium' | 'high';
  validationMethod: string;
  placement: 'core' | 'capability-layer' | 'documentation-only';
  decidedAt: string;
};

export type KnowledgeRetentionPolicy = {
  id: string;
  label: string;
  keepWhen: string[];
  summarizeWhen: string[];
  archiveWhen: string[];
  discardWhen: string[];
  canonicalityRule: string;
};
