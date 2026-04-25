import type {
  AutonomousOperatorRun,
  OperatorLearningOutcome,
  OperatorLearningSignal,
  SyncMobileLearningSignalsRequest,
} from "@freedom/shared";

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "operator-pattern";
}

function buildCapabilityKey(run: AutonomousOperatorRun): string {
  return normalizeKey(run.title).slice(0, 72) || "operator-pattern";
}

function countValidationEvidence(run: AutonomousOperatorRun): number {
  return run.evidence.filter((item) => item.kind === "validation" || item.kind === "test" || item.kind === "build").length;
}

function countDocumentationEvidence(run: AutonomousOperatorRun): number {
  return run.evidence.filter((item) => item.kind === "documentation" || item.kind === "memory").length;
}

function countCompletedRunsWithKey(runs: AutonomousOperatorRun[], capabilityKey: string): number {
  return runs.filter((run) => run.status === "completed" && buildCapabilityKey(run) === capabilityKey).length;
}

export function deriveOperatorLearningOutcome(
  run: AutonomousOperatorRun,
  relatedRuns: AutonomousOperatorRun[],
): OperatorLearningOutcome | null {
  if (run.status !== "completed") {
    return null;
  }

  const capabilityKey = buildCapabilityKey(run);
  const validationEvidenceCount = countValidationEvidence(run);
  const documentationEvidenceCount = countDocumentationEvidence(run);
  const evidenceCount = run.evidence.length;
  const repeatedRuns = countCompletedRunsWithKey(relatedRuns, capabilityKey);
  const enoughEvidenceForDurableLearning = validationEvidenceCount > 0 || evidenceCount >= 3;

  const recommendation =
    repeatedRuns >= 3 && validationEvidenceCount >= 2
      ? "internalize"
      : repeatedRuns >= 2 || (validationEvidenceCount >= 1 && documentationEvidenceCount >= 1)
        ? "invest"
        : "observe";
  const confidence =
    validationEvidenceCount >= 2
      ? "high"
      : validationEvidenceCount >= 1 || evidenceCount >= 3
        ? "medium"
        : "low";

  const learningSignals: OperatorLearningSignal[] = enoughEvidenceForDurableLearning
    ? [{
        topic: `Validated operator pattern: ${truncateText(run.title, 140)}`,
        summary: truncateText(
          [
            `Freedom completed the governed run "${run.title}" with ${evidenceCount} evidence item${evidenceCount === 1 ? "" : "s"}.`,
            run.consequenceReview ? "A structured consequence review stayed attached through completion." : null,
            recommendation === "internalize"
              ? "This pattern now looks stable enough to consider internalization."
              : recommendation === "invest"
                ? "This pattern is repeating and should be reviewed for capability internalization."
                : "Keep observing this pattern before promoting it further."
          ].filter(Boolean).join(" "),
          1000,
        ),
        kind: run.selectedOutcome === "build" ? "capability" : "workflow",
        status:
          recommendation === "internalize"
            ? "internalized"
            : recommendation === "invest"
              ? "tracking"
              : "observed",
      }]
    : [];

  return {
    summary: truncateText(
      `Completed governed run "${run.title}" produced ${evidenceCount} evidence item${evidenceCount === 1 ? "" : "s"} and now maps to ${recommendation} for the repeated pattern "${capabilityKey}".`,
      1000,
    ),
    learningSignals,
    capabilityRecommendations: [{
      capabilityKey,
      title: truncateText(run.title, 200),
      rationale: truncateText(
        [
          `This run completed with ${validationEvidenceCount} validation/build signal${validationEvidenceCount === 1 ? "" : "s"} and ${documentationEvidenceCount} memory/documentation signal${documentationEvidenceCount === 1 ? "" : "s"}.`,
          repeatedRuns > 1 ? `The same governed pattern has now completed ${repeatedRuns} time${repeatedRuns === 1 ? "" : "s"}.` : "This is still an early observation for this governed pattern.",
          recommendation === "internalize"
            ? "Validation and repetition are strong enough to plan internalization review."
            : recommendation === "invest"
              ? "The pattern is repeating enough to justify a reviewed internalization investigation."
              : "Keep gathering evidence before promoting this pattern into a larger capability decision."
        ].join(" "),
        1000,
      ),
      recommendation,
      confidence,
      evidenceCount,
      repeatedRuns,
      lastObservedAt: run.updatedAt,
      nextCheckpoint:
        recommendation === "internalize"
          ? "Open a governed internalization review, validate the pattern again, and decide whether an external dependency should be kept, wrapped, or absorbed."
          : recommendation === "invest"
            ? "Track this pattern across more completed runs and compare the repeated evidence before opening an internalization review."
            : "Keep observing this pattern and collect stronger validation evidence before recommending internalization.",
    }],
    recordedAt: run.updatedAt,
  };
}

export function buildDurableLearningSignalsFromOutcome(
  run: AutonomousOperatorRun,
  outcome: OperatorLearningOutcome | null,
): SyncMobileLearningSignalsRequest["signals"] {
  if (!outcome?.learningSignals.length) {
    return [];
  }

  const capabilityKey = buildCapabilityKey(run);
  return outcome.learningSignals.map((signal, index) => ({
    id: `operator-learning-${signal.kind}-${capabilityKey}-${index + 1}`,
    topic: signal.topic,
    summary: signal.summary,
    kind: signal.kind,
    status: signal.status,
    createdAt: run.createdAt,
    updatedAt: outcome.recordedAt,
    sourceSessionId: run.sessionId,
    capturedAt: outcome.recordedAt,
  }));
}
