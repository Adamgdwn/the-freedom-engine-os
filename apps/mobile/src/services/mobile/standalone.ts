import {
  FREEDOM_PHONE_PRODUCT_NAME,
  FREEDOM_PRODUCT_NAME,
  humanizeMobileConnectionState,
  type ChatSession,
  type MobileConnectionState
} from "@freedom/shared";
import { normalizeBaseUrl } from "../../config";
import {
  DISCONNECTED_ASSISTANT_BASE_URL,
  DISCONNECTED_ASSISTANT_MODE,
  RELAY_SHARED_SECRET
} from "../../generated/runtimeConfig";
import { sortSessionsForDisplay } from "../../utils/operatorConsole";
import { sanitizeSessionsForFreedom } from "./sessionSanitizer";

export type StandaloneAssistantMode = "bundled_model" | "cloud" | "notes_only";
const RELAY_SECRET_PLACEHOLDER = "PUT_A_LONG_RANDOM_SECRET_HERE";

export const LOCAL_ONLY_SESSION_HOST_ID = "mobile-standalone";
export const LOCAL_ONLY_SESSION_DEVICE_ID = "mobile-standalone-device";
export const LOCAL_ONLY_SESSION_ROOT_PATH = "mobile://standalone";
export const LOCAL_ONLY_SESSION_TITLE = `${FREEDOM_PRODUCT_NAME} on this phone`;

function getRawStandaloneCompanionBaseUrl(): string {
  return normalizeBaseUrl(DISCONNECTED_ASSISTANT_BASE_URL || "");
}

export function isUsableStandaloneRelaySecret(secret: string | null | undefined): boolean {
  const trimmed = secret?.trim() ?? "";
  return Boolean(trimmed) && trimmed !== RELAY_SECRET_PLACEHOLDER;
}

export function hasConfiguredStandaloneHostedCompanion(): boolean {
  return Boolean(getRawStandaloneCompanionBaseUrl()) && isUsableStandaloneRelaySecret(RELAY_SHARED_SECRET);
}

export function getStandaloneRelaySharedSecret(): string | null {
  return hasConfiguredStandaloneHostedCompanion() ? RELAY_SHARED_SECRET.trim() : null;
}

export function getStandaloneAssistantMode(): StandaloneAssistantMode {
  const configuredMode = String(DISCONNECTED_ASSISTANT_MODE);
  if (configuredMode === "bundled_model") {
    return "bundled_model";
  }
  if (configuredMode === "cloud" && hasConfiguredStandaloneHostedCompanion()) {
    return "cloud";
  }
  return "notes_only";
}

export function getStandaloneCompanionBaseUrl(): string {
  return hasConfiguredStandaloneHostedCompanion() ? getRawStandaloneCompanionBaseUrl() : "";
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
    lastPreview: `Saved on ${deviceName.trim() || "this phone"}.`,
    lastActivityAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function humanizeSurfaceConnectivity(input: {
  token: string | null;
  connectionState: MobileConnectionState;
}): string {
  if (!input.token) {
    return "On this phone";
  }
  return humanizeMobileConnectionState(input.connectionState);
}

export function standaloneSurfaceHint(): string {
  switch (getStandaloneAssistantMode()) {
    case "bundled_model":
      return `${FREEDOM_PHONE_PRODUCT_NAME} keeps voice, saved work, and the on-device model available on this phone.`;
    case "cloud":
      return `${FREEDOM_PHONE_PRODUCT_NAME} keeps voice, saved work, and hosted web lookup available while the desktop is away.`;
    default:
      return `${FREEDOM_PHONE_PRODUCT_NAME} keeps voice capture and saved work available on this phone. Pair later for desktop sync.`;
  }
}
