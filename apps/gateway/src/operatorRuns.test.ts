import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionOperatorRunStatus,
  describeConsequenceReviewRequirement,
  describeOperatorRunTransitionError,
  requiresConsequenceReviewForExecution,
} from "./operatorRuns.js";

test("allows the normal approval-to-execution path", () => {
  assert.equal(canTransitionOperatorRunStatus("awaiting-approval", "queued"), true);
  assert.equal(canTransitionOperatorRunStatus("queued", "running"), true);
  assert.equal(canTransitionOperatorRunStatus("running", "completed"), true);
});

test("allows a run to pause for review midstream", () => {
  assert.equal(canTransitionOperatorRunStatus("running", "awaiting-approval"), true);
  assert.equal(canTransitionOperatorRunStatus("running", "paused"), true);
  assert.equal(canTransitionOperatorRunStatus("paused", "queued"), true);
});

test("blocks skipping directly from approval hold to completed", () => {
  assert.equal(canTransitionOperatorRunStatus("awaiting-approval", "completed"), false);
  assert.match(
    describeOperatorRunTransitionError("awaiting-approval", "completed"),
    /Allowed next states: queued, paused, cancelled, failed\./,
  );
});

test("treats completed runs as terminal", () => {
  assert.equal(canTransitionOperatorRunStatus("completed", "running"), false);
  assert.match(
    describeOperatorRunTransitionError("completed", "running"),
    /terminal/,
  );
});

test("requires consequence review before execution resumes for governed runs", () => {
  assert.equal(requiresConsequenceReviewForExecution("operator-approval", "queued", false), true);
  assert.equal(requiresConsequenceReviewForExecution("release-approval", "running", false), true);
  assert.equal(requiresConsequenceReviewForExecution("none", "queued", false), false);
  assert.equal(requiresConsequenceReviewForExecution("operator-review", "queued", true), false);
  assert.match(
    describeConsequenceReviewRequirement("queued"),
    /structured consequence review/,
  );
});
