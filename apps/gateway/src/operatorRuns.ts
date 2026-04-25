import type { AutonomyApprovalClass, OperatorRunStatus } from "@freedom/shared";

const allowedTransitions: Record<OperatorRunStatus, OperatorRunStatus[]> = {
  draft: ["awaiting-approval", "queued", "paused", "cancelled"],
  queued: ["running", "awaiting-approval", "paused", "cancelled", "failed"],
  running: ["awaiting-approval", "paused", "completed", "failed", "cancelled"],
  "awaiting-approval": ["queued", "paused", "cancelled", "failed"],
  paused: ["queued", "awaiting-approval", "cancelled", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionOperatorRunStatus(
  current: OperatorRunStatus,
  next: OperatorRunStatus,
): boolean {
  return current === next || allowedTransitions[current].includes(next);
}

export function describeOperatorRunTransitionError(
  current: OperatorRunStatus,
  next: OperatorRunStatus,
): string {
  if (current === next) {
    return "";
  }

  const allowed = allowedTransitions[current];
  if (!allowed.length) {
    return `Operator runs in status '${current}' are terminal and cannot move to '${next}'.`;
  }

  return `Operator runs cannot move from '${current}' to '${next}'. Allowed next states: ${allowed.join(", ")}.`;
}

export function requiresConsequenceReviewForExecution(
  approvalClass: AutonomyApprovalClass,
  next: OperatorRunStatus,
  hasConsequenceReview: boolean,
): boolean {
  if (hasConsequenceReview || approvalClass === "none") {
    return false;
  }

  return next === "queued" || next === "running";
}

export function describeConsequenceReviewRequirement(
  next: OperatorRunStatus,
): string {
  return `Operator runs cannot move to '${next}' until a structured consequence review is recorded.`;
}
