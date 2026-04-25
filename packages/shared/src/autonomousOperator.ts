import { z } from "zod";

export const autonomyLevels = ["A0", "A1", "A2", "A3"] as const;
export const autonomyLevelSchema = z.enum(autonomyLevels);

export const operatorOutcomeOptions = [
  "build",
  "automate",
  "delegate",
  "simplify",
  "stop",
  "defer",
  "redesign",
] as const;
export const operatorOutcomeOptionSchema = z.enum(operatorOutcomeOptions);

export const autonomyApprovalClasses = [
  "none",
  "operator-review",
  "operator-approval",
  "release-approval",
  "blocked",
] as const;
export const autonomyApprovalClassSchema = z.enum(autonomyApprovalClasses);

export const operatorRunStatuses = [
  "draft",
  "queued",
  "running",
  "awaiting-approval",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;
export const operatorRunStatusSchema = z.enum(operatorRunStatuses);

export const operatorEvidenceKinds = [
  "analysis",
  "validation",
  "test",
  "build",
  "audit",
  "memory",
  "documentation",
] as const;
export const operatorEvidenceKindSchema = z.enum(operatorEvidenceKinds);

export const consequenceSeverityLevels = ["low", "medium", "high"] as const;
export const consequenceSeveritySchema = z.enum(consequenceSeverityLevels);

export const consequenceEffectSchema = z.object({
  summary: z.string().min(1).max(400),
  severity: consequenceSeveritySchema,
  mitigated: z.boolean(),
  mitigation: z.string().min(1).max(400).nullable(),
});

export const consequenceReviewSchema = z.object({
  summary: z.string().min(1).max(800),
  secondOrderEffects: z.array(consequenceEffectSchema).max(8),
  thirdOrderEffects: z.array(consequenceEffectSchema).max(8),
  blastRadius: z.string().min(1).max(400),
  reversibility: z.string().min(1).max(400),
  dependencyImpact: z.string().min(1).max(400),
  operatorBurdenImpact: z.string().min(1).max(400),
  securityPrivacyImpact: z.string().min(1).max(400),
  stopTriggers: z.array(z.string().min(1).max(240)).max(8),
  reviewedAt: z.string().datetime(),
});

export const outcomeAssessmentSchema = z.object({
  option: operatorOutcomeOptionSchema,
  rationale: z.string().min(1).max(800),
  expectedFreedomGain: consequenceSeveritySchema,
  expectedOrganizationalGain: consequenceSeveritySchema,
  confidence: consequenceSeveritySchema,
  checkpoint: z.string().min(1).max(400),
  selected: z.boolean(),
});

export const executionEvidenceSchema = z.object({
  id: z.string().min(1).max(160),
  kind: operatorEvidenceKindSchema,
  summary: z.string().min(1).max(600),
  source: z.string().min(1).max(240),
  createdAt: z.string().datetime(),
});

export const operatorLearningSignalKindSchema = z.enum(["workflow", "capability"]);
export const operatorLearningSignalStatusSchema = z.enum(["observed", "tracking", "internalized"]);

export const operatorLearningSignalSchema = z.object({
  topic: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  kind: operatorLearningSignalKindSchema,
  status: operatorLearningSignalStatusSchema,
});

export const capabilityInternalizationRecommendationSchema = z.object({
  capabilityKey: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(1000),
  recommendation: z.enum(["observe", "invest", "internalize"]),
  confidence: consequenceSeveritySchema,
  evidenceCount: z.number().int().nonnegative(),
  repeatedRuns: z.number().int().nonnegative(),
  lastObservedAt: z.string().datetime(),
  nextCheckpoint: z.string().min(1).max(400),
});

export const operatorLearningOutcomeSchema = z.object({
  summary: z.string().min(1).max(1000),
  learningSignals: z.array(operatorLearningSignalSchema).max(4),
  capabilityRecommendations: z.array(capabilityInternalizationRecommendationSchema).max(3),
  recordedAt: z.string().datetime(),
});

export const operatorEvidenceAppendSchema = z.object({
  kind: operatorEvidenceKindSchema,
  summary: z.string().min(1).max(600),
  source: z.string().min(1).max(240),
});

export const autonomousOperatorRunSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  autonomyLevel: autonomyLevelSchema,
  approvalClass: autonomyApprovalClassSchema,
  status: operatorRunStatusSchema,
  requestedFrom: z.enum(["desktop_shell", "mobile_companion", "voice_runtime", "web_control_plane"]),
  sessionId: z.string().min(1).max(160).nullable(),
  hostId: z.string().min(1).max(160).nullable(),
  taskId: z.string().min(1).max(160).nullable(),
  userMessageId: z.string().min(1).max(160).nullable(),
  turnId: z.string().min(1).max(160).nullable(),
  selectedOutcome: operatorOutcomeOptionSchema.nullable(),
  outcomeAssessments: z.array(outcomeAssessmentSchema).max(7),
  consequenceReview: consequenceReviewSchema.nullable(),
  evidence: z.array(executionEvidenceSchema).max(20),
  learningOutcome: operatorLearningOutcomeSchema.nullable(),
  nextCheckpoint: z.string().min(1).max(400),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const mobileDeferredOperatorRunSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  sourceSessionId: z.string().min(1).max(160),
  requestedAt: z.string().datetime(),
  consequenceReview: consequenceReviewSchema.nullable(),
  importedAt: z.string().datetime().nullable(),
  importedOperatorRunId: z.string().min(1).max(160).nullable(),
});

export const operatorRunLedgerSchema = z.object({
  configured: z.boolean(),
  runs: z.array(autonomousOperatorRunSchema),
  activeCount: z.number().int().nonnegative(),
  awaitingApprovalCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable(),
});

export const operatorRunPatchSchema = z
  .object({
    approvalClass: autonomyApprovalClassSchema.optional(),
    status: operatorRunStatusSchema.optional(),
    selectedOutcome: operatorOutcomeOptionSchema.nullable().optional(),
    sessionId: z.string().min(1).max(160).nullable().optional(),
    hostId: z.string().min(1).max(160).nullable().optional(),
    taskId: z.string().min(1).max(160).nullable().optional(),
    userMessageId: z.string().min(1).max(160).nullable().optional(),
    turnId: z.string().min(1).max(160).nullable().optional(),
    nextCheckpoint: z.string().min(1).max(400).optional(),
    consequenceReview: consequenceReviewSchema.nullable().optional(),
    appendEvidence: operatorEvidenceAppendSchema.optional(),
    learningOutcome: operatorLearningOutcomeSchema.nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Operator run update must include at least one change.",
  });

export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;
export type OperatorOutcomeOption = z.infer<typeof operatorOutcomeOptionSchema>;
export type AutonomyApprovalClass = z.infer<typeof autonomyApprovalClassSchema>;
export type OperatorRunStatus = z.infer<typeof operatorRunStatusSchema>;
export type OperatorEvidenceKind = z.infer<typeof operatorEvidenceKindSchema>;
export type ConsequenceSeverity = z.infer<typeof consequenceSeveritySchema>;
export type ConsequenceEffect = z.infer<typeof consequenceEffectSchema>;
export type ConsequenceReview = z.infer<typeof consequenceReviewSchema>;
export type OutcomeAssessment = z.infer<typeof outcomeAssessmentSchema>;
export type ExecutionEvidence = z.infer<typeof executionEvidenceSchema>;
export type OperatorLearningSignalKind = z.infer<typeof operatorLearningSignalKindSchema>;
export type OperatorLearningSignalStatus = z.infer<typeof operatorLearningSignalStatusSchema>;
export type OperatorLearningSignal = z.infer<typeof operatorLearningSignalSchema>;
export type CapabilityInternalizationRecommendation = z.infer<typeof capabilityInternalizationRecommendationSchema>;
export type OperatorLearningOutcome = z.infer<typeof operatorLearningOutcomeSchema>;
export type OperatorEvidenceAppend = z.infer<typeof operatorEvidenceAppendSchema>;
export type AutonomousOperatorRun = z.infer<typeof autonomousOperatorRunSchema>;
export type MobileDeferredOperatorRun = z.infer<typeof mobileDeferredOperatorRunSchema>;
export type OperatorRunLedger = z.infer<typeof operatorRunLedgerSchema>;
export type OperatorRunPatch = z.infer<typeof operatorRunPatchSchema>;
