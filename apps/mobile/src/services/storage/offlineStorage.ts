import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage, ChatSession, MobileConversationMemory, MobileLearningSignal } from "@freedom/shared";
import { sanitizeSessionsForFreedom } from "../mobile/sessionSanitizer";

const OFFLINE_STATE_KEY = "freedom-mobile.offline-state";
const MAX_CACHED_SESSIONS = 20;
const MAX_CACHED_MESSAGES_PER_SESSION = 100;

export interface OfflineImportDraft {
  sessionId: string;
  summary: string;
  draftTurns: string[];
  importedAt: string | null;
  continueDraft: string | null;
  updatedAt: string;
}

export interface PendingLearningSignalSync {
  queueId: string;
  signal: MobileLearningSignal;
  sourceSessionId: string;
  capturedAt: string;
  lastSyncAttemptAt: string | null;
  error: string | null;
}

export interface PendingConversationMemorySync {
  queueId: string;
  memory: MobileConversationMemory;
  sourceSessionId: string;
  capturedAt: string;
  lastSyncAttemptAt: string | null;
  error: string | null;
}

export interface StoredOfflineState {
  sessions: ChatSession[];
  messagesBySession: Record<string, ChatMessage[]>;
  importsBySession: Record<string, OfflineImportDraft>;
  pendingLearningSignals?: PendingLearningSignalSync[];
  pendingConversationMemories?: PendingConversationMemorySync[];
  selectedSessionId: string | null;
  memoryDigest?: {
    configured: boolean;
    updatedAt: string;
    context: string;
  } | null;
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-MAX_CACHED_MESSAGES_PER_SESSION);
}

function trimState(state: StoredOfflineState): StoredOfflineState {
  const sessions = sanitizeSessionsForFreedom([...state.sessions])
    .sort((left, right) => (right.lastActivityAt ?? right.updatedAt).localeCompare(left.lastActivityAt ?? left.updatedAt))
    .slice(0, MAX_CACHED_SESSIONS);
  const allowedSessionIds = new Set(sessions.map((session) => session.id));
  const messagesBySession = Object.fromEntries(
    Object.entries(state.messagesBySession)
      .filter(([sessionId]) => allowedSessionIds.has(sessionId))
      .map(([sessionId, messages]) => [sessionId, trimMessages(messages)])
  );
  const importsBySession = Object.fromEntries(
    Object.entries(state.importsBySession).filter(([sessionId]) => allowedSessionIds.has(sessionId))
  );

  return {
    sessions,
    messagesBySession,
    importsBySession,
    pendingLearningSignals: (state.pendingLearningSignals ?? []).slice(-50),
    pendingConversationMemories: (state.pendingConversationMemories ?? []).slice(-50),
    selectedSessionId: state.selectedSessionId && allowedSessionIds.has(state.selectedSessionId) ? state.selectedSessionId : sessions[0]?.id ?? null,
    memoryDigest: state.memoryDigest ?? null
  };
}

export async function loadOfflineState(): Promise<StoredOfflineState | null> {
  const raw = await AsyncStorage.getItem(OFFLINE_STATE_KEY);
  if (!raw) {
    return null;
  }

  return trimState(JSON.parse(raw) as StoredOfflineState);
}

export async function saveOfflineState(state: StoredOfflineState): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_STATE_KEY, JSON.stringify(trimState(state)));
}

export async function clearOfflineState(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_STATE_KEY);
}
