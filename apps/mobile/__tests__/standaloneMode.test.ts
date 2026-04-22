import type { ChatSession } from "@freedom/shared";
import {
  LOCAL_ONLY_SESSION_DEVICE_ID,
  LOCAL_ONLY_SESSION_HOST_ID,
  LOCAL_ONLY_SESSION_ROOT_PATH,
  LOCAL_ONLY_SESSION_TITLE,
  createLocalStandaloneSession,
  isLocalOnlySession,
  mergeRemoteAndLocalSessions
} from "../src/services/mobile/standalone";

describe("standalone mobile helpers", () => {
  test("createLocalStandaloneSession builds a phone-only notes thread", () => {
    const session = createLocalStandaloneSession("Freedom Phone");

    expect(session.hostId).toBe(LOCAL_ONLY_SESSION_HOST_ID);
    expect(session.deviceId).toBe(LOCAL_ONLY_SESSION_DEVICE_ID);
    expect(session.rootPath).toBe(LOCAL_ONLY_SESSION_ROOT_PATH);
    expect(session.kind).toBe("notes");
    expect(session.title).toBe(LOCAL_ONLY_SESSION_TITLE);
    expect(isLocalOnlySession(session)).toBe(true);
  });

  test("mergeRemoteAndLocalSessions preserves phone-only threads during desktop refresh", () => {
    const remoteSession = makeSession({
      id: "remote-1",
      hostId: "desktop-host",
      title: "Freedom",
      kind: "operator",
      updatedAt: "2026-04-21T18:00:00.000Z"
    });
    const localSession = {
      ...createLocalStandaloneSession("Freedom Phone"),
      id: "local-1",
      updatedAt: "2026-04-21T19:00:00.000Z",
      lastActivityAt: "2026-04-21T19:00:00.000Z"
    };

    const merged = mergeRemoteAndLocalSessions([remoteSession], [localSession]);

    expect(merged.map((session) => session.id)).toEqual(["remote-1", "local-1"]);
    expect(merged.find((session) => session.id === "local-1")).toMatchObject({
      hostId: LOCAL_ONLY_SESSION_HOST_ID,
      title: LOCAL_ONLY_SESSION_TITLE
    });
  });

  test("mergeRemoteAndLocalSessions does not duplicate ids when desktop later owns the same session id", () => {
    const remoteSession = makeSession({
      id: "session-1",
      hostId: "desktop-host",
      title: "Freedom",
      kind: "operator",
      updatedAt: "2026-04-21T19:00:00.000Z"
    });
    const cachedLocalSession = {
      ...createLocalStandaloneSession("Freedom Phone"),
      id: "session-1",
      updatedAt: "2026-04-21T18:00:00.000Z",
      lastActivityAt: "2026-04-21T18:00:00.000Z"
    };

    const merged = mergeRemoteAndLocalSessions([remoteSession], [cachedLocalSession]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: "session-1",
      hostId: "desktop-host",
      title: "Freedom"
    });
  });
});

function makeSession(overrides: Partial<ChatSession>): ChatSession {
  return {
    id: "session",
    hostId: "host",
    deviceId: "device",
    title: "Chat",
    kind: "project",
    pinned: false,
    archived: false,
    rootPath: "/tmp",
    identity: {
      productName: "Freedom",
      assistantName: "Freedom",
      freedomSessionId: "freedom-session",
      originSurface: "mobile_companion",
      workspaceContext: "/tmp",
      auditCorrelationId: "audit-correlation"
    },
    threadId: null,
    status: "idle",
    activeTurnId: null,
    stopRequested: false,
    lastError: null,
    lastPreview: null,
    lastActivityAt: "2026-04-21T17:00:00.000Z",
    createdAt: "2026-04-21T17:00:00.000Z",
    updatedAt: "2026-04-21T17:00:00.000Z",
    ...overrides
  };
}
