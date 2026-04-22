import { FREEDOM_PRODUCT_NAME, type ChatSession } from "@freedom/shared";
import { normalizeBaseUrl } from "../../config";
import { DISCONNECTED_ASSISTANT_BASE_URL, DISCONNECTED_ASSISTANT_MODE } from "../../generated/runtimeConfig";
import { sortSessionsForDisplay } from "../../utils/operatorConsole";
import { sanitizeSessionsForFreedom } from "./sessionSanitizer";

export type StandaloneAssistantMode = "bundled_model" | "cloud" | "notes_only";

export const LOCAL_ONLY_SESSION_HOST_ID = "mobile-standalone";
export const LOCAL_ONLY_SESSION_DEVICE_ID = "mobile-standalone-device";
export const LOCAL_ONLY_SESSION_ROOT_PATH = "mobile://standalone";
export const LOCAL_ONLY_SESSION_TITLE = `${FREEDOM_PRODUCT_NAME} Standalone`;

export function getStandaloneAssistantMode(): StandaloneAssistantMode {
  const configuredMode = String(DISCONNECTED_ASSISTANT_MODE);
  if (configuredMode === "bundled_model" || configuredMode === "cloud") {
    return configuredMode;
  }
  return "notes_only";
}

export function getStandaloneCompanionBaseUrl(): string {
  return normalizeBaseUrl(DISCONNECTED_ASSISTANT_BASE_URL || "");
}

export function isLocalOnlySession(session: ChatSession | null | undefined): boolean {
  return Boolean(session && session.hostId === LOCAL_ONLY_SESSION_HOST_ID);
}

export function mergeRemoteAndLocalSessions(remoteSessions: ChatSession[], cachedSessions: ChatSession[]): ChatSession[] {
  const mergedById = new Map<string, ChatSession>();

  for (const session of sanitizeSessionsForFreedom(remoteSessions)) {
    mergedById.set(session.id, session);
  }

  for (const session of sanitizeSessionsForFreedom(cachedSessions)) {
    if (isLocalOnlySession(session) && !mergedById.has(session.id)) {
      mergedById.set(session.id, session);
    }
  }

  return sortSessionsForDisplay([...mergedById.values()]);
}

export function createLocalStandaloneSession(deviceName: string): ChatSession {
  const stamp = new Date().toISOString();
  const sessionId = `session-mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: sessionId,
    hostId: LOCAL_ONLY_SESSION_HOST_ID,
    deviceId: LOCAL_ONLY_SESSION_DEVICE_ID,
    title: LOCAL_ONLY_SESSION_TITLE,
    kind: "notes",
    pinned: false,
    archived: false,
    rootPath: LOCAL_ONLY_SESSION_ROOT_PATH,
    identity: {
      productName: FREEDOM_PRODUCT_NAME,
      assistantName: FREEDOM_PRODUCT_NAME,
      freedomSessionId: sessionId,
      originSurface: "mobile_companion",
      workspaceContext: LOCAL_ONLY_SESSION_ROOT_PATH,
      auditCorrelationId: `audit-${sessionId}`
    },
    threadId: null,
    status: "idle",
    activeTurnId: null,
    stopRequested: false,
    lastError: null,
    lastPreview: `Standalone notes on ${deviceName.trim() || "this phone"}.`,
    lastActivityAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function humanizeSurfaceConnectivity(input: {
  token: string | null;
  offlineMode: boolean;
}): string {
  if (!input.token) {
    return "Phone standalone";
  }
  if (!input.offlineMode) {
    return "Desktop linked";
  }

  switch (getStandaloneAssistantMode()) {
    case "bundled_model":
      return "Offline / On-device";
    case "cloud":
      return "Disconnected / Cloud";
    default:
      return "Disconnected / Notes";
  }
}

export function standaloneSurfaceHint(): string {
  switch (getStandaloneAssistantMode()) {
    case "bundled_model":
      return "Voice, saved notes, and the on-device model stay available on this phone.";
    case "cloud":
      return "Voice, saved notes, and hosted web lookup stay available without a desktop link.";
    default:
      return "Voice capture and saved notes stay available on this phone. Pair later for desktop sync.";
  }
}
