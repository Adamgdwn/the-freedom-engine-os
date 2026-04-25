import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import type { AutonomousOperatorRun, ConsequenceReview } from "@freedom/shared";

import { GatewayStore } from "./store.js";

async function createTempStore(): Promise<{ store: GatewayStore; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(tmpdir(), "freedom-gateway-store-"));
  const store = new GatewayStore(dir);
  return {
    store,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

async function pairHost(store: GatewayStore, hostName: string, rootPath: string): Promise<{
  hostToken: string;
  deviceToken: string;
  hostId: string;
}> {
  const registered = await store.registerHost({
    hostName,
    approvedRoots: [rootPath],
  });
  const paired = await store.completePairing(registered.pairingCode, `${hostName} Phone`);
  return {
    hostToken: registered.hostToken,
    deviceToken: paired.deviceToken,
    hostId: registered.host.id,
  };
}

function buildConsequenceReview(): ConsequenceReview {
  return {
    summary: "Contained to the governed desktop lane with a reversible path.",
    secondOrderEffects: [],
    thirdOrderEffects: [],
    blastRadius: "Desktop operator lane only.",
    reversibility: "Reversible before release.",
    dependencyImpact: "No new dependency contracts.",
    operatorBurdenImpact: "Requires explicit review before queueing.",
    securityPrivacyImpact: "No sensitive exposure increase.",
    stopTriggers: ["Scope expands beyond reviewed desktop work"],
    reviewedAt: "2026-04-25T12:00:00.000Z",
  };
}

function buildRun(overrides: Partial<AutonomousOperatorRun> = {}): AutonomousOperatorRun {
  return {
    id: overrides.id ?? "oprun-1",
    title: overrides.title ?? "Governed operator run",
    summary: overrides.summary ?? "Harden the governed operator path.",
    autonomyLevel: "A3",
    approvalClass: overrides.approvalClass ?? "operator-review",
    status: overrides.status ?? "awaiting-approval",
    requestedFrom: overrides.requestedFrom ?? "mobile_companion",
    sessionId: overrides.sessionId ?? null,
    hostId: overrides.hostId ?? null,
    taskId: overrides.taskId ?? null,
    userMessageId: overrides.userMessageId ?? null,
    turnId: overrides.turnId ?? null,
    selectedOutcome: overrides.selectedOutcome ?? "build",
    outcomeAssessments: overrides.outcomeAssessments ?? [],
    consequenceReview: overrides.consequenceReview ?? null,
    evidence: overrides.evidence ?? [],
    learningOutcome: overrides.learningOutcome ?? null,
    nextCheckpoint: overrides.nextCheckpoint ?? "Record consequence review before queueing.",
    createdAt: overrides.createdAt ?? "2026-04-25T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-25T12:00:00.000Z",
  };
}

test("host-scoped operator run creation stamps the caller host and rejects foreign sessions", async () => {
  const { store, cleanup } = await createTempStore();
  try {
    const hostA = await pairHost(store, "Desktop A", "/tmp/a");
    const hostB = await pairHost(store, "Desktop B", "/tmp/b");
    const sessionA = await store.createSession(hostA.deviceToken, {
      rootPath: "/tmp/a",
      kind: "operator",
      title: "A session",
    });
    const sessionB = await store.createSession(hostB.deviceToken, {
      rootPath: "/tmp/b",
      kind: "operator",
      title: "B session",
    });

    const created = await store.upsertHostOperatorRun(
      hostA.deviceToken,
      buildRun({
        id: "oprun-owned",
        sessionId: sessionA.id,
        hostId: null,
      }),
    );

    assert.equal(created.hostId, hostA.hostId);

    await assert.rejects(
      () =>
        store.upsertHostOperatorRun(
          hostA.deviceToken,
          buildRun({
            id: "oprun-foreign-session",
            sessionId: sessionB.id,
          }),
        ),
      /does not belong to this host/,
    );
  } finally {
    await cleanup();
  }
});

test("governed runs cannot queue without consequence review and remain host-owned on update", async () => {
  const { store, cleanup } = await createTempStore();
  try {
    const hostA = await pairHost(store, "Desktop A", "/tmp/a");
    const hostB = await pairHost(store, "Desktop B", "/tmp/b");
    const sessionA = await store.createSession(hostA.deviceToken, {
      rootPath: "/tmp/a",
      kind: "operator",
      title: "A session",
    });

    await store.upsertHostOperatorRun(
      hostA.deviceToken,
      buildRun({
        id: "oprun-gated",
        sessionId: sessionA.id,
      }),
    );

    await assert.rejects(
      () => store.updateHostOperatorRun(hostA.deviceToken, "oprun-gated", { status: "queued" }),
      /structured consequence review/,
    );

    const reviewed = await store.updateHostOperatorRun(hostA.deviceToken, "oprun-gated", {
      consequenceReview: buildConsequenceReview(),
    });
    assert.equal(reviewed.hostId, hostA.hostId);

    const queued = await store.updateHostOperatorRun(hostA.hostToken, "oprun-gated", { status: "queued" });
    assert.equal(queued.status, "queued");

    await assert.rejects(
      () => store.updateHostOperatorRun(hostB.deviceToken, "oprun-gated", { status: "paused" }),
      /does not belong to this host/,
    );
  } finally {
    await cleanup();
  }
});

test("offline import remains idempotent for the same client import id", async () => {
  const { store, cleanup } = await createTempStore();
  try {
    const host = await pairHost(store, "Desktop A", "/tmp/a");
    const session = await store.createSession(host.deviceToken, {
      rootPath: "/tmp/a",
      kind: "operator",
      title: "Import session",
    });

    const input = {
      clientImportId: "mobile-offline-import-1",
      summary: "Offline planning summary",
      draftTurns: ["First stand-alone note", "Second stand-alone note"],
      createdAt: "2026-04-25T12:00:00.000Z",
      source: "mobile_offline" as const,
    };

    const first = await store.importOfflineSession(host.deviceToken, session.id, input);
    const second = await store.importOfflineSession(host.deviceToken, session.id, input);
    const messages = await store.listMessages(host.deviceToken, session.id);

    assert.equal(first.imported, true);
    assert.equal(second.imported, false);
    assert.equal(messages.filter((message) => message.role === "system").length, 2);
  } finally {
    await cleanup();
  }
});
