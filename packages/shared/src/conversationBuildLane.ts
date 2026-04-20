export const buildLaneApprovalStates = [
  "conversation-capture",
  "needs-approval",
  "approved-for-discovery",
  "approved-for-build",
  "approved-for-release",
  "blocked"
] as const;

export const buildLaneRequestedFromValues = [
  "mobile_companion",
  "desktop_shell",
  "voice_runtime",
  "web_control_plane"
] as const;

export type BuildLaneApprovalState = (typeof buildLaneApprovalStates)[number];
export type BuildLaneRequestedFrom = (typeof buildLaneRequestedFromValues)[number];

export interface ConversationBuildLaneItem {
  id: string;
  title: string;
  summary: string;
  objective: string;
  businessCase: string;
  operator: string;
  approvalState: BuildLaneApprovalState;
  autonomyEnvelope: string;
  executionSurface: string;
  reportingPath: string;
  nextCheckpoint: string;
  requestedBy: string;
  requestedFrom: BuildLaneRequestedFrom;
  pricingModel: string | null;
  scalePotential: string | null;
  hostId: string | null;
  requestedAt: string;
  updatedAt: string;
}

export interface ConversationBuildLaneSummary {
  configured: boolean;
  items: ConversationBuildLaneItem[];
  pendingCount: number;
  approvedCount: number;
  blockedCount: number;
}

export type ConversationBuildLaneDraft = Omit<
  ConversationBuildLaneItem,
  "id" | "title" | "requestedAt" | "updatedAt"
>;

const BUILD_LANE_REASON_PREFIX = "[freedom-build-lane-v1]";

type StoredBuildLaneEnvelope = {
  format: "freedom-build-lane-v1";
  summary: string;
  buildLane: ConversationBuildLaneDraft;
};

export function serializeProgrammingRequestReason(
  summary: string,
  buildLane?: ConversationBuildLaneDraft | null
): string {
  const trimmedSummary = summary.trim();
  if (!buildLane) {
    return trimmedSummary;
  }

  const envelope: StoredBuildLaneEnvelope = {
    format: "freedom-build-lane-v1",
    summary: trimmedSummary,
    buildLane
  };
  return `${BUILD_LANE_REASON_PREFIX}\n${JSON.stringify(envelope)}`;
}

export function parseProgrammingRequestReason(
  raw: string,
  requestMeta: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }
): {
  summary: string;
  buildLane: ConversationBuildLaneItem | null;
} {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(BUILD_LANE_REASON_PREFIX)) {
    return { summary: trimmed, buildLane: null };
  }

  const jsonPayload = trimmed.slice(BUILD_LANE_REASON_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(jsonPayload) as Partial<StoredBuildLaneEnvelope>;
    if (parsed.format !== "freedom-build-lane-v1" || !parsed.buildLane) {
      return { summary: trimmed, buildLane: null };
    }

    const draft = parsed.buildLane;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    return {
      summary,
      buildLane: {
        id: requestMeta.id,
        title: requestMeta.title,
        summary,
        objective: coerceString(draft.objective),
        businessCase: coerceString(draft.businessCase),
        operator: coerceString(draft.operator, "Adam Goodwin"),
        approvalState: normalizeBuildLaneApprovalState(draft.approvalState),
        autonomyEnvelope: coerceString(draft.autonomyEnvelope),
        executionSurface: coerceString(draft.executionSurface),
        reportingPath: coerceString(draft.reportingPath),
        nextCheckpoint: coerceString(draft.nextCheckpoint),
        requestedBy: coerceString(draft.requestedBy, "Freedom"),
        requestedFrom: normalizeBuildLaneRequestedFrom(draft.requestedFrom),
        pricingModel: coerceNullableString(draft.pricingModel),
        scalePotential: coerceNullableString(draft.scalePotential),
        hostId: coerceNullableString(draft.hostId),
        requestedAt: requestMeta.createdAt,
        updatedAt: requestMeta.updatedAt
      }
    };
  } catch {
    return { summary: trimmed, buildLane: null };
  }
}

export function isBuildLaneApprovalPending(value: BuildLaneApprovalState): boolean {
  return value === "conversation-capture" || value === "needs-approval";
}

export function isBuildLaneApprovalApproved(value: BuildLaneApprovalState): boolean {
  return value === "approved-for-discovery" || value === "approved-for-build" || value === "approved-for-release";
}

export function humanizeBuildLaneApprovalState(value: BuildLaneApprovalState): string {
  switch (value) {
    case "conversation-capture":
      return "Conversation capture";
    case "needs-approval":
      return "Needs approval";
    case "approved-for-discovery":
      return "Approved for discovery";
    case "approved-for-build":
      return "Approved for build";
    case "approved-for-release":
      return "Approved for release";
    case "blocked":
      return "Blocked";
    default:
      return value;
  }
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function coerceNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBuildLaneApprovalState(value: unknown): BuildLaneApprovalState {
  return buildLaneApprovalStates.includes(value as BuildLaneApprovalState)
    ? (value as BuildLaneApprovalState)
    : "needs-approval";
}

function normalizeBuildLaneRequestedFrom(value: unknown): BuildLaneRequestedFrom {
  return buildLaneRequestedFromValues.includes(value as BuildLaneRequestedFrom)
    ? (value as BuildLaneRequestedFrom)
    : "voice_runtime";
}
