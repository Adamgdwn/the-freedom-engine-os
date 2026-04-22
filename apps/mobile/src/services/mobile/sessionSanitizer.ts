import type { ChatSession } from "@freedom/shared";

const LEGACY_PROJECT_SEGMENT = "codex_adam_connect";
const CURRENT_PROJECT_SEGMENT = "the-freedom-engine-os";

function sanitizeFreedomReference(value: string | null | undefined): string | null | undefined {
  if (typeof value !== "string" || !value) {
    return value;
  }

  return value
    .replaceAll(LEGACY_PROJECT_SEGMENT, CURRENT_PROJECT_SEGMENT)
    .replaceAll("Adam Connect", "Freedom")
    .replaceAll("adam-connect", "freedom")
    .replaceAll("adamconnect", "freedom");
}

export function sanitizeSessionForFreedom(session: ChatSession): ChatSession {
  return {
    ...session,
    title: sanitizeFreedomReference(session.title) ?? session.title,
    rootPath: sanitizeFreedomReference(session.rootPath) ?? session.rootPath,
    lastPreview: sanitizeFreedomReference(session.lastPreview) ?? session.lastPreview,
    identity: session.identity
      ? {
          ...session.identity,
          workspaceContext: sanitizeFreedomReference(session.identity.workspaceContext) ?? session.identity.workspaceContext
        }
      : session.identity
  };
}

export function sanitizeSessionsForFreedom(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((session) => sanitizeSessionForFreedom(session));
}
