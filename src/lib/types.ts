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
  routeReason: string;
  auditCorrelationId: string;
  requestedAt: string;
};
