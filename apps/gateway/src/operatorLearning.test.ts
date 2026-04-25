import assert from "node:assert/strict";
import test from "node:test";

import type { AutonomousOperatorRun } from "@freedom/shared";

import { buildDurableLearningSignalsFromOutcome, deriveOperatorLearningOutcome } from "./operatorLearning.js";

function buildRun(overrides: Partial<AutonomousOperatorRun> = {}): AutonomousOperatorRun {
  return {
    id: overrides.id ?? "oprun-1",
    title: overrides.title ?? "Operator autonomy gate",
    summary: overrides.summary ?? "Tighten governed operator execution before internalization.",
    autonomyLevel: "A3",
    approvalClass: "operator-review",
    status: overrides.status ?? "completed",
    requestedFrom: "mobile_companion",
    sessionId: overrides.sessionId ?? "session-1",
    hostId: overrides.hostId ?? "host-1",
    taskId: overrides.taskId ?? null,
    userMessageId: overrides.userMessageId ?? null,
    turnId: overrides.turnId ?? null,
    selectedOutcome: overrides.selectedOutcome ?? "build",
    outcomeAssessments: overrides.outcomeAssessments ?? [],
    consequenceReview: overrides.consequenceReview ?? {
      summary: "Contained to the governed desktop lane.",
      secondOrderEffects: [],
      thirdOrderEffects: [],
      blastRadius: "Desktop operator lane only.",
      reversibility: "Reversible before release.",
      dependencyImpact: "No new dependency risk.",
      operatorBurdenImpact: "Adds one review checkpoint.",
      securityPrivacyImpact: "No new exposure.",
      stopTriggers: ["Scope expands"],
      reviewedAt: "2026-04-25T10:00:00.000Z",
    },
    evidence: overrides.evidence ?? [
      {
        id: "ev-1",
        kind: "validation",
        summary: "Validation evidence attached.",
        source: "test",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
      {
        id: "ev-2",
        kind: "documentation",
        summary: "Documentation updated.",
        source: "docs",
        createdAt: "2026-04-25T10:01:00.000Z",
      },
    ],
    learningOutcome: overrides.learningOutcome ?? null,
    nextCheckpoint: overrides.nextCheckpoint ?? "Review learning outcome.",
    createdAt: overrides.createdAt ?? "2026-04-25T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-25T10:02:00.000Z",
  };
}

test("derives an internalization recommendation once a validated pattern repeats", () => {
  const current = buildRun({ id: "oprun-3" });
  const prior = [buildRun({ id: "oprun-1" }), buildRun({ id: "oprun-2" })];

  const outcome = deriveOperatorLearningOutcome(current, [...prior, current]);
  assert.ok(outcome);
  assert.equal(outcome.capabilityRecommendations[0]?.recommendation, "invest");
  assert.equal(outcome.learningSignals[0]?.status, "tracking");
});

test("promotes a repeated, strongly validated pattern to internalize", () => {
  const current = buildRun({
    id: "oprun-4",
    evidence: [
      {
        id: "ev-1",
        kind: "validation",
        summary: "Validation evidence attached.",
        source: "test",
        createdAt: "2026-04-25T10:00:00.000Z",
      },
      {
        id: "ev-2",
        kind: "test",
        summary: "Test evidence attached.",
        source: "test",
        createdAt: "2026-04-25T10:01:00.000Z",
      },
      {
        id: "ev-3",
        kind: "documentation",
        summary: "Documentation updated.",
        source: "docs",
        createdAt: "2026-04-25T10:02:00.000Z",
      },
    ],
  });
  const related = [buildRun({ id: "oprun-1" }), buildRun({ id: "oprun-2" }), current];

  const outcome = deriveOperatorLearningOutcome(current, related);
  assert.ok(outcome);
  assert.equal(outcome.capabilityRecommendations[0]?.recommendation, "internalize");
  assert.equal(outcome.learningSignals[0]?.status, "internalized");
});

test("builds deterministic durable learning signals from the learning outcome", () => {
  const run = buildRun();
  const outcome = deriveOperatorLearningOutcome(run, [run]);
  const signals = buildDurableLearningSignalsFromOutcome(run, outcome);

  assert.equal(signals.length, 1);
  assert.match(signals[0]?.id ?? "", /^operator-learning-capability-operator-autonomy-gate-1$/);
  assert.equal(signals[0]?.sourceSessionId, "session-1");
});
