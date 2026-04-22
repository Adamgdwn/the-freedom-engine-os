import { create } from "zustand";
import { Platform } from "react-native";
import {
  buildProjectStarterPrompt,
  getAssistantVoiceCatalogEntry,
  normalizeAssistantVoicePresetId,
  type AssistantVoiceProfile,
  type AssistantVoicePresetId,
  type VoiceSessionBinding
} from "@freedom/shared";
import type {
  ChatMessage,
  ChatSession,
  ConversationBuildLaneSummary,
  HostStatus,
  InputMode,
  NotificationEvent,
  OutboundRecipient,
  PairedDevice,
  ResponseStyle,
  StreamEvent,
  WakeControl
} from "@freedom/shared";
import type { RNLlamaOAICompatibleMessage } from "llama.rn";
import type { ProjectTemplateId } from "@freedom/shared";
import { FREEDOM_PRIMARY_SESSION_TITLE, FREEDOM_PRODUCT_NAME, FREEDOM_RUNTIME_NAME } from "@freedom/shared";
import { ApiClient } from "../services/api/client";
import { loadSettings, saveSettings, type StoredSettings } from "../services/storage/settingsStorage";
import {
  loadOfflineState,
  saveOfflineState,
  type OfflineImportDraft
} from "../services/storage/offlineStorage";
import { clearDeviceToken, loadDeviceToken, saveDeviceToken } from "../services/storage/tokenStorage";
import { FcmService } from "../services/notifications/fcmService";
import {
  OFFLINE_ASSISTANT_SYSTEM_PROMPT,
  OfflineAssistantService,
  type OfflineModelState
} from "../services/offline/offlineAssistant";
import { CloudCompanionService } from "../services/offline/cloudCompanion";
import { AssistantSpeechRuntime } from "../services/voice/assistantSpeechRuntime";
import { RealtimeVoiceService } from "../services/voice/realtimeVoiceService";
import { TtsService, type TtsVoiceOption } from "../services/voice/ttsService";
import { VoiceService } from "../services/voice/voiceService";
import { WakeRelayClient } from "../services/wake/wakeRelayClient";
import { normalizeBaseUrl, websocketUrlFromBase } from "../config";
import {
  DEFAULT_BASE_URL,
  VOICE_BACKCHANNEL_MAX_WORDS,
  VOICE_INTERRUPT_MIN_CHARS,
  VOICE_RUNTIME_MODE,
  VOICE_SESSION_ENABLED,
  VOICE_TTS_MIN_CHARS
} from "../generated/runtimeConfig";
import {
  createLocalStandaloneSession,
  getStandaloneAssistantMode,
  getStandaloneCompanionBaseUrl,
  isLocalOnlySession,
  mergeRemoteAndLocalSessions,
  standaloneSurfaceHint
} from "../services/mobile/standalone";
import { sanitizeSessionForFreedom } from "../services/mobile/sessionSanitizer";
import {
  findOperatorSession,
  findManualStopTargetSession,
  isPairingRepairErrorMessage,
  isSessionBusy,
  isQueuedVoiceAutoSendPending,
  OPERATOR_SESSION_TITLE,
  pairingRepairMessage,
  findSendTargetSession,
  pickPreferredSessionId,
  requiresVoiceReview,
  sortSessionsForDisplay
} from "../utils/operatorConsole";
import {
  isExternalSendCancellation,
  isExternalSendConfirmation,
  isValidExternalEmail,
  parseExternalSendRequest,
  type ParsedExternalSendRequest
} from "../utils/externalSend";
import {
  isLikelyAssistantEcho,
  type VoiceSessionPhase,
  mergeVoiceTranscriptSegments,
  normalizeVoiceTranscript,
  shouldInterruptAssistant
} from "../services/voice/voiceSessionMachine";

type View = "pairing" | "start" | "host" | "sessions" | "chat";
type MobileVoiceRuntimeMode = "realtime_primary" | "device_fallback" | "on_device_offline";
type DisconnectedAssistantMode = "bundled_model" | "cloud" | "notes_only";
type EditableField =
  | "baseUrl"
  | "deviceName"
  | "pairingCode"
  | "composer"
  | "newSessionRootPath"
  | "newSessionTitle"
  | "responseStyle"
  | "outboundRecipientLabelDraft"
  | "outboundRecipientEmailDraft"
  | "projectIntent"
  | "projectInstructions"
  | "projectOutputType"
  | "projectTemplateId";

interface VoiceTelemetry {
  turnsStarted: number;
  turnsCompleted: number;
  interruptions: number;
  reconnects: number;
  lastHeardAt: string | null;
  lastAssistantStartedAt: string | null;
  lastRoundTripMs: number | null;
}

interface ExternalDraftState {
  sessionId: string;
  messageId: string;
  recipientId: string | null;
  recipientLabel: string | null;
  recipientDestination: string;
  subject: string;
  intro: string;
  confirmationRequired: boolean;
}

interface PendingExternalRequestState {
  sessionId: string;
  userMessageId: string;
  recipientId: string | null;
  recipientLabel: string | null;
  recipientDestination: string;
  requestedByVoice: boolean;
  requestedSubject: string | null;
  requestedBody: string | null;
}

interface OfflineImportState extends OfflineImportDraft {}

export interface AppState {
  booting: boolean;
  refreshing: boolean;
  sendingMessage: boolean;
  realtimeConnected: boolean;
  view: View;
  baseUrl: string;
  deviceName: string;
  pairingCode: string;
  token: string | null;
  currentDeviceId: string | null;
  hostStatus: HostStatus | null;
  buildLaneSummary: ConversationBuildLaneSummary | null;
  devices: PairedDevice[];
  sessions: ChatSession[];
  selectedSessionId: string | null;
  messagesBySession: Record<string, ChatMessage[]>;
  composer: string;
  composerInputMode: InputMode;
  newSessionRootPath: string;
  newSessionTitle: string;
  projectIntent: string;
  projectInstructions: string;
  projectOutputType: string;
  projectTemplateId: ProjectTemplateId;
  responseStyle: ResponseStyle;
  assistantVoices: TtsVoiceOption[];
  selectedAssistantVoiceId: string | null;
  selectedFreedomVoicePresetId: AssistantVoicePresetId;
  wakeControl: WakeControl | null;
  wakeRequesting: boolean;
  offlineMode: boolean;
  offlineModelState: OfflineModelState;
  offlineModelDetail: string | null;
  offlineImportDrafts: Record<string, OfflineImportState>;
  offlineSummarizing: boolean;
  offlineImporting: boolean;
  outboundRecipients: OutboundRecipient[];
  outboundRecipientLabelDraft: string;
  outboundRecipientEmailDraft: string;
  externalDraft: ExternalDraftState | null;
  pendingExternalRequest: PendingExternalRequestState | null;
  sendingExternalMessage: boolean;
  renameDraftBySession: Record<string, string>;
  autoSpeak: boolean;
  autoSendVoice: boolean;
  voiceAutoSendPreferenceTouched: boolean;
  voiceAvailable: boolean;
  voiceRuntimeMode: MobileVoiceRuntimeMode;
  voiceRuntimeBinding: VoiceSessionBinding | null;
  pushAvailable: boolean;
  pushSyncing: boolean;
  listening: boolean;
  voiceSessionActive: boolean;
  voiceTargetSessionId: string | null;
  voiceMuted: boolean;
  voiceSessionPhase: VoiceSessionPhase;
  liveTranscript: string;
  voiceAudioLevel: number;
  voiceAssistantDraft: string | null;
  voiceTelemetry: VoiceTelemetry;
  lastSpokenMessageId: string | null;
  notice: string | null;
  error: string | null;
  bootstrap(): Promise<void>;
  connectPairing(): Promise<void>;
  disconnect(): Promise<void>;
  refresh(): Promise<void>;
  reconnectRealtime(): Promise<void>;
  selectSession(sessionId: string): Promise<void>;
  createProjectSession(): Promise<void>;
  renameSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  sendMessage(): Promise<void>;
  generateOfflineImportSummary(): Promise<void>;
  updateOfflineImportSummary(sessionId: string, value: string): void;
  updateOfflineImportDraftTurn(sessionId: string, index: number, value: string): void;
  removeOfflineImportDraftTurn(sessionId: string, index: number): void;
  importOfflineSession(): Promise<void>;
  continueWithFreedom(): void;
  enterStandaloneMode(): Promise<void>;
  stopSession(): Promise<void>;
  renameCurrentDevice(): Promise<void>;
  enablePushNotifications(): Promise<void>;
  toggleNotificationPreference(event: NotificationEvent): Promise<void>;
  sendDeviceTestNotification(deviceId: string, event: NotificationEvent): Promise<void>;
  revokeDevice(deviceId: string): Promise<void>;
  toggleAutoSpeak(): Promise<void>;
  toggleAutoSendVoice(): Promise<void>;
  testAssistantVoice(): Promise<void>;
  triggerWakeHomebase(): Promise<void>;
  addOutboundRecipient(): Promise<void>;
  deleteOutboundRecipient(recipientId: string): Promise<void>;
  beginExternalMessageDraft(messageId: string, sessionId: string): void;
  cancelExternalMessageDraft(): void;
  updateExternalDraft(field: "recipientId" | "recipientDestination" | "subject" | "intro", value: string): void;
  sendExternalMessage(): Promise<void>;
  toggleListening(): Promise<void>;
  toggleVoiceMute(): Promise<void>;
  setResponseStyle(style: ResponseStyle): Promise<void>;
  selectAssistantVoice(voiceId: string | null): Promise<void>;
  selectFreedomVoicePreset(voiceId: AssistantVoicePresetId): Promise<void>;
  setRenameDraft(sessionId: string, value: string): void;
  setField<K extends EditableField>(field: K, value: AppState[K]): void;
  setView(view: View): void;
}

const api = new ApiClient();
const voice = new VoiceService();
const realtimeVoice = new RealtimeVoiceService();
const fcm = new FcmService();
const tts = new TtsService();
const assistantSpeech = new AssistantSpeechRuntime(tts);
const offlineAssistant = new OfflineAssistantService();
const cloudCompanion = new CloudCompanionService();
const wakeRelay = new WakeRelayClient();
let socket: WebSocket | null = null;
let unsubscribePushTokenRefresh: (() => void) | null = null;
let voiceInterruptRequested = false;
let backendInterruptTurnId: string | null = null;
// Keep recognition live during spoken replies so barge-in can fire while Freedom is
// talking. Assistant echo filtering handles the self-hear suppression instead.
const SHOULD_PAUSE_RECOGNITION_DURING_TTS = Platform.OS === "android";
const VOICE_CONTINUATION_GRACE_MS = 450;
const VOICE_PARTIAL_FALLBACK_COMMIT_MS = 1800;
let pendingVoiceTranscript: string | null = null;
let pendingVoiceCommitTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPartialVoiceCommitTimer: ReturnType<typeof setTimeout> | null = null;

function prefersRealtimePrimaryVoice(): boolean {
  return (VOICE_RUNTIME_MODE as string) === "realtime_primary";
}

function usesRealtimeVoicePath(state: Pick<AppState, "voiceRuntimeMode" | "voiceSessionActive">): boolean {
  return state.voiceSessionActive && state.voiceRuntimeMode === "realtime_primary";
}

function usesDeviceVoicePath(state: Pick<AppState, "voiceRuntimeMode" | "voiceSessionActive">): boolean {
  return state.voiceSessionActive && (state.voiceRuntimeMode === "device_fallback" || state.voiceRuntimeMode === "on_device_offline");
}

function getDisconnectedAssistantMode(): DisconnectedAssistantMode {
  const mode = getStandaloneAssistantMode();
  if (mode === "bundled_model" || mode === "cloud") {
    return mode;
  }
  return "notes_only";
}

function getDisconnectedAssistantRuntimeMode(): MobileVoiceRuntimeMode {
  return getDisconnectedAssistantMode() === "bundled_model" ? "on_device_offline" : "device_fallback";
}

function getDisconnectedAssistantReadyState(): { state: OfflineModelState; detail: string | null } {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return offlineAssistant.getStatus();
    case "cloud": {
      const companionBaseUrl = getConfiguredDisconnectedAssistantBaseUrl();
      return {
        state: "ready",
        detail: companionBaseUrl
          ? `Web companion ready via ${companionBaseUrl}.`
          : "Web companion ready."
      };
    }
    default:
      return {
        state: "missing",
        detail: "This slim build keeps cached chats and saved ideas, but it does not bundle the old on-device model."
      };
  }
}

function getDisconnectedModeNotice(): string {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return "Desktop unreachable. Cached chats and on-device ideation are still available.";
    case "cloud":
      return "Desktop unreachable. Cached chats and the web companion are still available.";
    default:
      return "Desktop unreachable. Cached chats and saved ideas are still available.";
  }
}

function getDisconnectedTurnNotice(): string {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return "Running on-device ideation while the desktop is unreachable.";
    case "cloud":
      return "Running the web companion while the desktop is unreachable.";
    default:
      return "Saving this idea locally while the desktop is unreachable.";
  }
}

function getDisconnectedVoiceStartNotice(): string {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return "Offline voice starting. Speak naturally and Freedom will answer from the on-device model.";
    case "cloud":
      return "Disconnected voice starting. Speak naturally and Freedom will answer through the web companion.";
    default:
      return "Disconnected voice starting. Speak naturally and Freedom will save your ideas for later sync.";
  }
}

const defaultVoiceTelemetry = (): VoiceTelemetry => ({
  turnsStarted: 0,
  turnsCompleted: 0,
  interruptions: 0,
  reconnects: 0,
  lastHeardAt: null,
  lastAssistantStartedAt: null,
  lastRoundTripMs: null
});

const DEFAULT_DEVICE_NAME = "Freedom Phone";

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function normalizeStoredSettings(settings: Partial<StoredSettings> & Pick<StoredSettings, "baseUrl" | "deviceName" | "autoSpeak" | "autoSendVoice">): StoredSettings {
  return {
    baseUrl: settings.baseUrl,
    deviceName: settings.deviceName,
    currentDeviceId: settings.currentDeviceId ?? null,
    autoSpeak: settings.autoSpeak,
    autoSendVoice: settings.autoSendVoice,
    voiceAutoSendPreferenceTouched: settings.voiceAutoSendPreferenceTouched ?? false,
    responseStyle: settings.responseStyle ?? "natural",
    assistantVoiceId: settings.assistantVoiceId ?? null,
    freedomVoicePresetId: normalizeAssistantVoicePresetId(settings.freedomVoicePresetId ?? "marin"),
    wakeControl: settings.wakeControl ?? null
  };
}

function buildStoredSettings(state: AppState, overrides: Partial<StoredSettings> = {}): StoredSettings {
  return normalizeStoredSettings({
    baseUrl: overrides.baseUrl ?? state.baseUrl,
    deviceName: overrides.deviceName ?? state.deviceName,
    currentDeviceId: overrides.currentDeviceId ?? state.currentDeviceId,
    autoSpeak: overrides.autoSpeak ?? state.autoSpeak,
    autoSendVoice: overrides.autoSendVoice ?? state.autoSendVoice,
    voiceAutoSendPreferenceTouched: overrides.voiceAutoSendPreferenceTouched ?? state.voiceAutoSendPreferenceTouched,
    responseStyle: overrides.responseStyle ?? state.responseStyle,
    assistantVoiceId: overrides.assistantVoiceId ?? state.selectedAssistantVoiceId,
    freedomVoicePresetId: overrides.freedomVoicePresetId ?? state.selectedFreedomVoicePresetId,
    wakeControl: overrides.wakeControl ?? state.wakeControl
  });
}

async function persistSettings(get: () => AppState, overrides: Partial<StoredSettings> = {}): Promise<void> {
  await saveSettings(buildStoredSettings(get(), overrides));
}

async function loadAssistantVoiceState(preferredVoiceId: string | null): Promise<{
  assistantVoices: TtsVoiceOption[];
  selectedAssistantVoiceId: string | null;
}> {
  const appliedVoice = await tts.setPreferredVoice(preferredVoiceId).catch(() => null);
  const assistantVoices = await tts.listVoices().catch(() => []);
  const selectedAssistantVoiceId =
    preferredVoiceId && appliedVoice?.id && assistantVoices.some((voiceOption) => voiceOption.id === appliedVoice.id) ? appliedVoice.id : null;

  return {
    assistantVoices,
    selectedAssistantVoiceId
  };
}

function buildLocalFreedomVoiceProfile(voiceId: AssistantVoicePresetId): AssistantVoiceProfile {
  const entry = getAssistantVoiceCatalogEntry(voiceId);
  return {
    targetVoice: entry.id,
    displayName: entry.label,
    gender: entry.gender,
    accent: null,
    tone: entry.toneHints.join(", "),
    warmth: entry.warmth,
    pace: entry.pace,
    notes: null,
    source: "manual",
    updatedAt: new Date().toISOString()
  };
}

function resolveSelectedFreedomVoicePresetId(
  storedVoiceId: string | null | undefined,
  hostStatus: HostStatus | null | undefined
): AssistantVoicePresetId {
  return normalizeAssistantVoicePresetId(hostStatus?.voiceProfile?.targetVoice ?? storedVoiceId ?? "marin");
}

function getEffectiveFreedomVoiceProfile(
  state: Pick<AppState, "hostStatus" | "selectedFreedomVoicePresetId">
): AssistantVoiceProfile {
  return state.hostStatus?.voiceProfile ?? buildLocalFreedomVoiceProfile(state.selectedFreedomVoicePresetId);
}

function getFreedomSpeechProvider(state: Pick<AppState, "baseUrl" | "offlineMode" | "token" | "selectedFreedomVoicePresetId" | "hostStatus">) {
  if (!state.offlineMode && state.baseUrl) {
    return {
      endpointUrl: state.baseUrl,
      authorization: state.token ? `Bearer ${state.token}` : null,
      voiceProfile: getEffectiveFreedomVoiceProfile(state),
      label: "the desktop link"
    };
  }

  const standaloneBaseUrl = getConfiguredDisconnectedAssistantBaseUrl();
  if (!standaloneBaseUrl) {
    return null;
  }

  return {
    endpointUrl: standaloneBaseUrl,
    authorization: null,
    voiceProfile: getEffectiveFreedomVoiceProfile(state),
    label: "the standalone companion"
  };
}

function createLocalMessageId(prefix: "msg" | "import"): string {
  return `${prefix}-mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureStandaloneConversationSessionId(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<string> {
  const existingSessionId = get().voiceTargetSessionId ?? get().selectedSessionId ?? get().sessions[0]?.id;
  if (existingSessionId) {
    return existingSessionId;
  }

  const localSession = createLocalStandaloneSession(get().deviceName);
  set((state) => ({
    sessions: sortSessionsForDisplay([localSession, ...state.sessions.filter((session) => session.id !== localSession.id)]),
    selectedSessionId: localSession.id,
    renameDraftBySession: {
      ...state.renameDraftBySession,
      [localSession.id]: localSession.title
    },
    offlineMode: true,
    view: "chat",
    notice: standaloneSurfaceHint(),
    error: null
  }));
  await persistOfflineSnapshot(get);
  return localSession.id;
}

function isDesktopUnreachableErrorMessage(message: string): boolean {
  return message.includes("Could not reach the desktop host");
}

function isNotFoundErrorMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === "not found." || normalized === "not found" || normalized.includes("404");
}

function buildOfflineImportSummaryFallback(messages: ChatMessage[], draftTurns: string[]): string {
  const userPreview = draftTurns.slice(-3).map((turn, index) => `${index + 1}. ${turn}`).join("\n");
  const assistantPreview = messages
    .filter((item) => item.role === "assistant")
    .slice(-2)
    .map((item) => item.content.trim())
    .filter(Boolean)
    .join("\n\n");

  return [
    "Offline mobile ideation captured while the desktop was unreachable.",
    draftTurns.length ? `Key user prompts:\n${userPreview}` : null,
    assistantPreview ? `Recent offline reasoning:\n${assistantPreview}` : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildOfflineImportDraft(draft: OfflineImportDraft | undefined, messages: ChatMessage[], draftTurns: string[]): OfflineImportDraft {
  return {
    sessionId: draft?.sessionId ?? messages[0]?.sessionId ?? "",
    summary: draft?.summary?.trim() || buildOfflineImportSummaryFallback(messages, draftTurns),
    draftTurns,
    importedAt: draft?.importedAt ?? null,
    continueDraft: draft?.continueDraft ?? null,
    updatedAt: new Date().toISOString()
  };
}

async function persistOfflineSnapshot(get: () => AppState): Promise<void> {
  await saveOfflineState({
    sessions: get().sessions,
    messagesBySession: get().messagesBySession,
    importsBySession: get().offlineImportDrafts,
    selectedSessionId: get().selectedSessionId
  });
}

function pushLocalMessage(
  state: AppState,
  sessionId: string,
  message: ChatMessage
): Record<string, ChatMessage[]> {
  const currentMessages = state.messagesBySession[sessionId] ?? [];
  const nextMessages = [...currentMessages.filter((item) => item.id !== message.id), message].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );

  return {
    ...state.messagesBySession,
    [sessionId]: nextMessages
  };
}

function updateSessionLocally(state: AppState, sessionId: string, overrides: Partial<ChatSession>): ChatSession[] {
  return sortSessionsForDisplay(
    state.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            ...overrides
          }
        : session
    )
  );
}

function buildOfflineContextMessages(messages: ChatMessage[], prompt: string): RNLlamaOAICompatibleMessage[] {
  const history = messages
    .filter((item) => item.role === "user" || item.role === "assistant" || item.role === "system")
    .slice(-10)
    .map((item): RNLlamaOAICompatibleMessage => ({
      role: item.role,
      content: item.content
    }));

  return [
    {
      role: "system",
      content: OFFLINE_ASSISTANT_SYSTEM_PROMPT
    },
    ...history,
    {
      role: "user",
      content: prompt
    }
  ];
}

function truncateOfflinePreview(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function buildNotesOnlyReply(): string {
  return (
    "Freedom saved that idea locally for later sync. " +
    "This slim build does not bundle the old on-device model, and no web companion is configured yet."
  );
}

function getConfiguredDisconnectedAssistantBaseUrl(): string {
  return getStandaloneCompanionBaseUrl();
}

function listDisconnectedAssistantBaseUrls(_currentBaseUrl: string | null | undefined): string[] {
  const configuredBaseUrl = getConfiguredDisconnectedAssistantBaseUrl();
  return configuredBaseUrl ? [configuredBaseUrl] : [];
}

async function requestDisconnectedCloudCompanionReply(
  currentBaseUrl: string,
  request: (baseUrl: string) => Promise<string>
): Promise<string> {
  const candidateBaseUrls = listDisconnectedAssistantBaseUrls(currentBaseUrl);
  let lastError: Error | null = null;

  for (const candidateBaseUrl of candidateBaseUrls) {
    try {
      return await request(candidateBaseUrl);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Could not reach the web companion.");
}

async function ensureOfflineModelPrepared(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  if (getDisconnectedAssistantMode() !== "bundled_model") {
    const status = getDisconnectedAssistantReadyState();
    set({
      offlineModelState: status.state,
      offlineModelDetail: status.detail
    });
    return;
  }

  const status = await offlineAssistant.ensureReady((state, detail) => {
    set({
      offlineModelState: state,
      offlineModelDetail: detail
    });
  });
  set({
    offlineModelState: status.state,
    offlineModelDetail: status.detail
  });
}

async function requestDisconnectedAssistantReply(messages: ChatMessage[], prompt: string, baseUrl: string): Promise<string> {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return offlineAssistant.generateReply({
        messages: buildOfflineContextMessages(messages, prompt)
      });
    case "cloud":
      return requestDisconnectedCloudCompanionReply(baseUrl, (candidateBaseUrl) =>
        cloudCompanion.generateReply(
          candidateBaseUrl,
          buildOfflineContextMessages(messages, prompt).flatMap((message) => {
            if (message.role === "system" || message.role === "user" || message.role === "assistant") {
              return [
                {
                  role: message.role,
                  content: typeof message.content === "string" ? message.content : ""
                }
              ];
            }
            return [];
          })
        )
      );
    default:
      return buildNotesOnlyReply();
  }
}

async function requestDisconnectedImportSummary(messages: ChatMessage[], draftTurns: string[], baseUrl: string): Promise<string> {
  switch (getDisconnectedAssistantMode()) {
    case "bundled_model":
      return offlineAssistant.generateReply({
        messages: [
          {
            role: "system",
            content: "Summarize these offline mobile ideation notes for later desktop review. Keep it factual, concise, and focused on next steps."
          },
          {
            role: "user",
            content: draftTurns.map((turn, index) => `${index + 1}. ${turn}`).join("\n")
          }
        ],
        nPredict: 220,
        temperature: 0.35
      });
    case "cloud":
      return requestDisconnectedCloudCompanionReply(baseUrl, (candidateBaseUrl) =>
        cloudCompanion.summarizeDraftTurns(candidateBaseUrl, draftTurns)
      );
    default:
      return buildOfflineImportSummaryFallback(messages, draftTurns);
  }
}

async function sendOfflineIdeationTurn(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  clearPendingVoiceTranscript();
  const text = get().composer.trim();
  if (!text) {
    return;
  }

  const sessionId = await ensureStandaloneConversationSessionId(get, set);
  const targetSession = get().sessions.find((item) => item.id === sessionId) ?? null;
  if (!targetSession) {
    throw new Error("Open a cached chat before sending offline.");
  }

  set({
    sendingMessage: true,
    offlineMode: true,
    error: null,
    notice: getDisconnectedTurnNotice()
  });

  await ensureOfflineModelPrepared(set);
  const now = new Date().toISOString();
  const userMessage: ChatMessage = {
    id: createLocalMessageId("msg"),
    sessionId,
    role: "user",
    content: text,
    status: "completed",
    errorMessage: null,
    clientRequestId: null,
    inputMode: get().composerInputMode,
    responseStyle: get().responseStyle,
    transcriptPolished: get().composerInputMode === "voice_polished",
    createdAt: now,
    updatedAt: now
  };
  const assistantMessageId = createLocalMessageId("msg");
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    sessionId,
    role: "assistant",
    content: "",
    status: "streaming",
    errorMessage: null,
    clientRequestId: null,
    inputMode: null,
    responseStyle: get().responseStyle,
    transcriptPolished: null,
    createdAt: now,
    updatedAt: now
  };

  set((state) => {
    const nextMessages = pushLocalMessage(
      {
        ...state,
        messagesBySession: pushLocalMessage(state, sessionId, userMessage)
      } as AppState,
      sessionId,
      assistantMessage
    );
    const draftTurns = [...(state.offlineImportDrafts[sessionId]?.draftTurns ?? []), text];
    return {
      composer: "",
      composerInputMode: "text",
      messagesBySession: nextMessages,
      sessions: updateSessionLocally(state, sessionId, {
        lastPreview: truncateOfflinePreview(text),
        lastActivityAt: now,
        updatedAt: now
      }),
      selectedSessionId: sessionId,
      view: "chat",
      voiceSessionPhase: state.voiceSessionActive ? "processing" : state.voiceSessionPhase,
      voiceAssistantDraft: "",
      offlineImportDrafts: {
        ...state.offlineImportDrafts,
        [sessionId]: buildOfflineImportDraft(state.offlineImportDrafts[sessionId], nextMessages[sessionId] ?? [], draftTurns)
      }
    };
  });
  await persistOfflineSnapshot(get);

  try {
    const messages = get().messagesBySession[sessionId] ?? [];
    const reply =
      getDisconnectedAssistantMode() === "bundled_model"
        ? await offlineAssistant.generateReply({
            messages: buildOfflineContextMessages(messages, text),
            onToken: (content) => {
              const updatedAt = new Date().toISOString();
              set((state) => ({
                messagesBySession: pushLocalMessage(state, sessionId, {
                  ...((state.messagesBySession[sessionId] ?? []).find((item) => item.id === assistantMessageId) ?? assistantMessage),
                  content,
                  status: "streaming",
                  updatedAt
                }),
                voiceAssistantDraft: state.voiceSessionActive ? content : state.voiceAssistantDraft,
                voiceSessionPhase: state.voiceSessionActive ? "processing" : state.voiceSessionPhase
              }));
            }
          })
        : await requestDisconnectedAssistantReply(messages, text, get().baseUrl);
    const completedAt = new Date().toISOString();
    set((state) => ({
      sendingMessage: false,
      messagesBySession: pushLocalMessage(state, sessionId, {
        ...assistantMessage,
        content: reply,
        status: "completed",
        updatedAt: completedAt
      }),
      sessions: updateSessionLocally(state, sessionId, {
        lastPreview: truncateOfflinePreview(reply || text),
        lastActivityAt: completedAt,
        updatedAt: completedAt
      }),
      voiceAssistantDraft: state.voiceSessionActive ? reply : null,
      voiceSessionPhase: state.voiceSessionActive ? "assistant-speaking" : state.voiceSessionPhase,
      notice: "Offline ideation captured. Review and import notes when the desktop comes back.",
      error: null,
      voiceTelemetry:
        state.voiceSessionActive
          ? {
              ...state.voiceTelemetry,
              turnsStarted: state.voiceTelemetry.turnsStarted + 1,
              turnsCompleted: state.voiceTelemetry.turnsCompleted + 1,
              lastRoundTripMs: state.voiceTelemetry.lastHeardAt ? Date.now() - new Date(state.voiceTelemetry.lastHeardAt).getTime() : null
            }
          : state.voiceTelemetry
    }));
    if (get().voiceSessionActive || get().autoSpeak) {
      assistantSpeech.ingest(assistantMessageId, reply, "completed", VOICE_TTS_MIN_CHARS);
    }
    await persistOfflineSnapshot(get);
  } catch (error) {
    const failedAt = new Date().toISOString();
    set((state) => ({
      sendingMessage: false,
      messagesBySession: pushLocalMessage(state, sessionId, {
        ...assistantMessage,
        content: "",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Offline ideation failed.",
        updatedAt: failedAt
      }),
      voiceAssistantDraft: null,
      voiceSessionPhase: state.voiceSessionActive ? "error" : state.voiceSessionPhase,
      error: error instanceof Error ? error.message : "Offline ideation failed."
    }));
    await persistOfflineSnapshot(get);
    throw error;
  }
}

export const useAppStore = create<AppState>((set, get) => {
  tts.setFreedomSpeechProviderResolver(() => getFreedomSpeechProvider(get()));

  return {
  booting: true,
  refreshing: false,
  sendingMessage: false,
  realtimeConnected: false,
  view: "start",
  baseUrl: DEFAULT_BASE_URL,
  deviceName: DEFAULT_DEVICE_NAME,
  pairingCode: "",
  token: null,
  currentDeviceId: null,
  hostStatus: null,
  buildLaneSummary: null,
  devices: [],
  sessions: [],
  selectedSessionId: null,
  messagesBySession: {},
  composer: "",
  composerInputMode: "text",
  newSessionRootPath: "",
  newSessionTitle: "",
  projectIntent: "",
  projectInstructions: "",
  projectOutputType: "implementation plan",
  projectTemplateId: "greenfield",
  responseStyle: "natural",
  assistantVoices: [],
  selectedAssistantVoiceId: null,
  selectedFreedomVoicePresetId: "marin",
  wakeControl: null,
  wakeRequesting: false,
  offlineMode: false,
  offlineModelState: getDisconnectedAssistantReadyState().state,
  offlineModelDetail: getDisconnectedAssistantReadyState().detail,
  offlineImportDrafts: {},
  offlineSummarizing: false,
  offlineImporting: false,
  outboundRecipients: [],
  outboundRecipientLabelDraft: "",
  outboundRecipientEmailDraft: "",
  externalDraft: null,
  pendingExternalRequest: null,
  sendingExternalMessage: false,
  renameDraftBySession: {},
  autoSpeak: false,
  autoSendVoice: true,
  voiceAutoSendPreferenceTouched: false,
  voiceAvailable: false,
  voiceRuntimeMode: VOICE_RUNTIME_MODE,
  voiceRuntimeBinding: null,
  pushAvailable: false,
  pushSyncing: false,
  listening: false,
  voiceSessionActive: false,
  voiceTargetSessionId: null,
  voiceMuted: false,
  voiceSessionPhase: "idle",
  liveTranscript: "",
  voiceAudioLevel: -2,
  voiceAssistantDraft: null,
  voiceTelemetry: defaultVoiceTelemetry(),
  lastSpokenMessageId: null,
  notice: null,
  error: null,
  async bootstrap() {
    voice.stopStreamingSession();
    void realtimeVoice.stopSession();
    assistantSpeech.configure({
      onBeforeSpeak: () => {
        pauseVoiceLoopForAssistant(get, set);
      },
      onSpeakingChange: (speaking) => {
        set((state) => {
          if (!state.voiceSessionActive) {
            return {};
          }

          if (speaking) {
            return {
              voiceSessionPhase: state.voiceMuted ? "muted" : "assistant-speaking",
              voiceTelemetry: {
                ...state.voiceTelemetry,
                lastAssistantStartedAt: new Date().toISOString()
              }
            };
          }

          if (state.voiceSessionPhase === "assistant-speaking" || state.voiceSessionPhase === "muted") {
            return {
              listening: SHOULD_PAUSE_RECOGNITION_DURING_TTS ? false : state.listening,
              voiceAssistantDraft: speaking ? state.voiceAssistantDraft : null,
              voiceSessionPhase: state.voiceMuted ? "muted" : state.error ? "error" : "listening"
            };
          }

          return {};
        });

        if (!speaking && !get().voiceMuted) {
          ensureVoiceLoopListening(get, set).catch(() => undefined);
        }
      },
      onSpeechError: (message) => {
        set((state) => ({
          notice: message,
          voiceAssistantDraft: null,
          listening: SHOULD_PAUSE_RECOGNITION_DURING_TTS ? false : state.listening,
          voiceSessionPhase: state.voiceSessionActive ? (state.voiceMuted ? "muted" : "listening") : state.voiceSessionPhase
        }));
        if (!get().voiceMuted) {
          ensureVoiceLoopListening(get, set).catch(() => undefined);
        }
      }
    });

    const [settings, token, cachedOfflineState, deviceVoiceAvailable, realtimeVoiceAvailable] = await Promise.all([
      settleWithin(loadSettings(), 1200, null),
      settleWithin(loadDeviceToken(), 1200, null),
      settleWithin(loadOfflineState(), 1200, null),
      settleWithin(voice.isAvailable(), 1200, false),
      settleWithin(realtimeVoice.isAvailable(), 1200, false)
    ]);

    const assistantVoiceState = await settleWithin(
      loadAssistantVoiceState(null),
      1800,
      {
        assistantVoices: [],
        selectedAssistantVoiceId: null
      }
    );
    if (settings?.assistantVoiceId) {
      await saveSettings({
        ...normalizeStoredSettings({
          baseUrl: settings.baseUrl,
          deviceName: settings.deviceName,
          currentDeviceId: settings.currentDeviceId ?? null,
          autoSpeak: settings.autoSpeak,
          autoSendVoice: settings.autoSendVoice,
          voiceAutoSendPreferenceTouched: settings.voiceAutoSendPreferenceTouched ?? false,
          responseStyle: settings.responseStyle,
          assistantVoiceId: null,
          freedomVoicePresetId: settings.freedomVoicePresetId ?? "marin",
          wakeControl: settings.wakeControl ?? null
        })
      });
    }

    const shouldMigrateLegacyVoiceAutoSend = settings?.autoSendVoice === false && settings.voiceAutoSendPreferenceTouched !== true;
    const resolvedAutoSendVoice = shouldMigrateLegacyVoiceAutoSend ? true : (settings?.autoSendVoice ?? true);

    if (settings && shouldMigrateLegacyVoiceAutoSend) {
      await saveSettings({
        ...normalizeStoredSettings({
          ...settings,
          autoSendVoice: true,
          voiceAutoSendPreferenceTouched: false
        })
      });
    }

    const resolvedVoiceRuntimeMode: MobileVoiceRuntimeMode =
      prefersRealtimePrimaryVoice() && realtimeVoiceAvailable
        ? "realtime_primary"
        : deviceVoiceAvailable
          ? "device_fallback"
          : realtimeVoiceAvailable
            ? "realtime_primary"
            : prefersRealtimePrimaryVoice()
              ? "realtime_primary"
              : "device_fallback";

    set({
      baseUrl: settings?.baseUrl ?? DEFAULT_BASE_URL,
      deviceName: settings?.deviceName ?? DEFAULT_DEVICE_NAME,
      currentDeviceId: settings?.currentDeviceId ?? null,
      autoSpeak: settings?.autoSpeak ?? false,
      autoSendVoice: resolvedAutoSendVoice,
      voiceAutoSendPreferenceTouched: settings?.voiceAutoSendPreferenceTouched ?? false,
      responseStyle: settings?.responseStyle ?? "natural",
      assistantVoices: assistantVoiceState.assistantVoices,
      selectedAssistantVoiceId: assistantVoiceState.selectedAssistantVoiceId,
      selectedFreedomVoicePresetId: resolveSelectedFreedomVoicePresetId(settings?.freedomVoicePresetId, null),
      wakeControl: settings?.wakeControl ?? null,
      outboundRecipients: [],
      token,
      sessions: cachedOfflineState?.sessions ?? [],
      selectedSessionId: cachedOfflineState?.selectedSessionId ?? null,
      messagesBySession: cachedOfflineState?.messagesBySession ?? {},
      offlineImportDrafts: cachedOfflineState?.importsBySession ?? {},
      voiceAvailable: realtimeVoiceAvailable || deviceVoiceAvailable,
      voiceRuntimeMode: resolvedVoiceRuntimeMode,
      voiceRuntimeBinding: null,
      pushAvailable: fcm.isAvailable(),
      realtimeConnected: false,
      offlineMode: !token,
      offlineModelState: getDisconnectedAssistantReadyState().state,
      offlineModelDetail: getDisconnectedAssistantReadyState().detail,
      notice: token ? "Restoring the saved desktop link." : null,
      booting: false,
      view: token || (cachedOfflineState?.sessions?.length ?? 0) > 0 ? "start" : "pairing"
    });

    if (settings?.baseUrl && token) {
      await get().refresh();
      syncPushTokenRefresh(settings.baseUrl, token, get, set);
      connectSocket(settings.baseUrl, token, set, get);
    }
  },
  async connectPairing() {
    const baseUrl = normalizeBaseUrl(get().baseUrl);
    set({ error: null });
    try {
      const paired = await api.completePairing(baseUrl, get().pairingCode.trim().toUpperCase(), get().deviceName.trim());
      await persistSettings(get, {
        baseUrl,
        deviceName: get().deviceName.trim(),
        currentDeviceId: paired.device.id
      });
      await saveDeviceToken(paired.deviceToken);
      set({
        token: paired.deviceToken,
        baseUrl,
        currentDeviceId: paired.device.id,
        devices: [paired.device],
        hostStatus: {
          host: paired.host,
          auth: { status: "logged_out", detail: "Waiting for desktop heartbeat." },
          tailscale: {
            installed: false,
            connected: false,
            detail: "Waiting for desktop Tailscale status.",
            dnsName: null,
            ipv4: null,
            suggestedUrl: null,
            transportSecurity: "insecure",
            installUrl: "https://tailscale.com/download",
            loginUrl: "https://login.tailscale.com/start"
          },
          wakeControl: settingsWakeControl(get),
          outboundEmail: {
            enabled: false,
            provider: "none",
            fromAddress: null,
            replyToAddress: null,
            recipientCount: 0
          },
          availability: "reconnecting",
          repairState: "reconnecting",
          runState: "ready",
          activeSessionCount: 0,
          pairedDeviceCount: 1
        },
        buildLaneSummary: null,
        pairingCode: "",
        newSessionRootPath: paired.host.approvedRoots[0] ?? "",
        realtimeConnected: false,
        notice: `${FREEDOM_PRODUCT_NAME} is paired. Your primary chat will be ready for quick turns.`,
        view: "start"
      });
      syncPushTokenRefresh(baseUrl, paired.deviceToken, get, set);
      connectSocket(baseUrl, paired.deviceToken, set, get);
      await get().refresh();
      await ensureOperatorSession(get, set);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Pairing failed. Check the desktop URL and pairing code, then try again."
      });
      throw error;
    }
  },
  async disconnect() {
    clearPendingVoiceTranscript();
    disconnectSocket();
    voice.stopStreamingSession();
    void realtimeVoice.stopSession();
    assistantSpeech.reset();
    tts.stop();
    unsubscribePushTokenRefresh?.();
    unsubscribePushTokenRefresh = null;
    await clearDeviceToken();
    set({
      baseUrl: get().baseUrl || DEFAULT_BASE_URL,
      deviceName: get().deviceName || DEFAULT_DEVICE_NAME,
      pairingCode: "",
      token: null,
      currentDeviceId: null,
      hostStatus: null,
      buildLaneSummary: null,
      devices: [],
      composer: "",
      composerInputMode: "text",
      newSessionRootPath: "",
      newSessionTitle: "",
      projectIntent: "",
      projectInstructions: "",
      projectOutputType: "implementation plan",
      projectTemplateId: "greenfield",
      responseStyle: get().responseStyle,
      assistantVoices: get().assistantVoices,
      selectedAssistantVoiceId: get().selectedAssistantVoiceId,
      selectedFreedomVoicePresetId: get().selectedFreedomVoicePresetId,
      wakeControl: null,
      wakeRequesting: false,
      offlineMode: true,
      offlineModelState: getDisconnectedAssistantReadyState().state,
      offlineModelDetail: getDisconnectedAssistantReadyState().detail,
      offlineSummarizing: false,
      offlineImporting: false,
      outboundRecipients: [],
      outboundRecipientLabelDraft: "",
      outboundRecipientEmailDraft: "",
      externalDraft: null,
      pendingExternalRequest: null,
      sendingExternalMessage: false,
      autoSpeak: get().autoSpeak,
      autoSendVoice: get().autoSendVoice,
      voiceAutoSendPreferenceTouched: get().voiceAutoSendPreferenceTouched,
      listening: false,
      voiceRuntimeMode: getDisconnectedAssistantRuntimeMode(),
      voiceRuntimeBinding: null,
      voiceSessionActive: false,
      voiceTargetSessionId: null,
      voiceMuted: false,
      voiceSessionPhase: "idle",
      liveTranscript: "",
      voiceAudioLevel: -2,
      voiceAssistantDraft: null,
      voiceTelemetry: defaultVoiceTelemetry(),
      lastSpokenMessageId: null,
      refreshing: false,
      sendingMessage: false,
      realtimeConnected: false,
      error: null,
      notice: get().sessions.length
        ? "Desktop link removed. Saved phone sessions remain available."
        : "Desktop link removed. This phone can still capture notes and voice locally.",
      view: get().sessions.length ? "start" : "pairing"
    });
    voiceInterruptRequested = false;
  },
  async refresh() {
    const token = get().token;
    const baseUrl = get().baseUrl;
    if (!token || !baseUrl) {
      const standaloneSessions = sortSessionsForDisplay(get().sessions.map((session) => sanitizeSessionForFreedom(session)));
      const nextSelected = pickPreferredSessionId(get().selectedSessionId, standaloneSessions);
      set((state) => ({
        offlineMode: true,
        realtimeConnected: false,
        sessions: standaloneSessions,
        selectedSessionId: nextSelected,
        renameDraftBySession: standaloneSessions.reduce<Record<string, string>>((accumulator, session) => {
          accumulator[session.id] = state.renameDraftBySession[session.id] ?? session.title;
          return accumulator;
        }, {}),
        notice: standaloneSessions.length
          ? "Refreshing this phone locally. Saved standalone threads remain available without a desktop link."
          : standaloneSurfaceHint(),
        error: null
      }));
      await persistOfflineSnapshot(get);
      return;
    }

    set({ refreshing: true });
    try {
      const previousView = get().view;
      const [hostStatus, buildLaneSummary, sessions, devices, outboundRecipients] = await Promise.all([
        api.getHostStatus(token, baseUrl),
        api.getBuildLaneSummary(token, baseUrl).catch((error) => {
          if (error instanceof Error && isNotFoundErrorMessage(error.message)) {
            return null;
          }
          throw error;
        }),
        api.listSessions(token, baseUrl),
        api.listDevices(token, baseUrl),
        api.listOutboundRecipients(token, baseUrl).catch((error) => {
          if (error instanceof Error && isNotFoundErrorMessage(error.message)) {
            return [];
          }
          throw error;
        })
      ]);
      const mergedSessions = mergeRemoteAndLocalSessions(sessions, get().sessions);
      const currentSelected = get().selectedSessionId;
      const nextSelected = pickPreferredSessionId(currentSelected, mergedSessions);
      const currentDeviceId =
        get().currentDeviceId && devices.some((device) => device.id === get().currentDeviceId)
          ? get().currentDeviceId
          : devices.find((device) => device.deviceName === get().deviceName)?.id ?? devices[0]?.id ?? null;

      const resolvedFreedomVoicePresetId = resolveSelectedFreedomVoicePresetId(
        get().selectedFreedomVoicePresetId,
        hostStatus
      );

      if (
        currentDeviceId !== get().currentDeviceId ||
        !wakeControlsEqual(hostStatus.wakeControl, get().wakeControl) ||
        resolvedFreedomVoicePresetId !== get().selectedFreedomVoicePresetId
      ) {
        await persistSettings(get, {
          baseUrl,
          currentDeviceId,
          freedomVoicePresetId: resolvedFreedomVoicePresetId,
          wakeControl: hostStatus.wakeControl
        });
      }

      set({
        hostStatus,
        buildLaneSummary,
        wakeControl: hostStatus.wakeControl,
        devices,
        outboundRecipients,
        currentDeviceId,
        selectedFreedomVoicePresetId: resolvedFreedomVoicePresetId,
        sessions: mergedSessions,
        selectedSessionId: nextSelected,
        newSessionRootPath: get().newSessionRootPath || hostStatus.host.approvedRoots[0] || "",
        renameDraftBySession: mergedSessions.reduce<Record<string, string>>((accumulator, session) => {
          accumulator[session.id] = get().renameDraftBySession[session.id] ?? session.title;
          return accumulator;
        }, {}),
        offlineMode: false,
        notice: null,
        error: null
      });

      if (nextSelected) {
        await get().selectSession(nextSelected);
        if (previousView === "start") {
          set({ view: "start" });
        }
      } else if (hostStatus.host.approvedRoots[0]) {
        const operatorSession = await ensureOperatorSession(get, set, {
          token,
          baseUrl,
          hostStatus
        });
        if (operatorSession) {
          await get().selectSession(operatorSession.id);
          if (previousView === "start") {
            set({ view: "start" });
          }
        }
      }

      if (!socket || socket.readyState === WebSocket.CLOSED || !get().realtimeConnected) {
        connectSocket(baseUrl, token, set, get);
      }

      await persistOfflineSnapshot(get);
      maybeAutoSendVoiceResult(get, set).catch(() => undefined);
    } catch (error) {
      if (error instanceof Error && isDesktopUnreachableErrorMessage(error.message)) {
        set({
          offlineMode: true,
          realtimeConnected: false,
          notice: getDisconnectedModeNotice(),
          error: null
        });
        await persistOfflineSnapshot(get);
      } else {
        await handleStoreError(error, set, get, "Could not refresh this phone's desktop state.");
      }
    } finally {
      set({ refreshing: false });
    }
  },
  async reconnectRealtime() {
    const token = requireValue(get().token, "Pair this phone with the desktop first.");
    const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
    set((state) => ({
      notice: "Reconnecting the realtime desktop link.",
      error: null,
      realtimeConnected: false,
      voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase
    }));
    connectSocket(baseUrl, token, set, get);
    await get().refresh();
  },
  async selectSession(sessionId: string) {
    try {
      const localSession = get().sessions.find((item) => item.id === sessionId) ?? null;
      if (isLocalOnlySession(localSession)) {
        set({
          selectedSessionId: sessionId,
          view: "chat",
          offlineMode: true,
          notice: "This thread lives only on this phone until you import it into desktop history.",
          error: null
        });
        await persistOfflineSnapshot(get);
        return;
      }

      const token = get().token;
      const baseUrl = get().baseUrl;
      if (!token || !baseUrl) {
        const cachedMessages = get().messagesBySession[sessionId] ?? [];
        set({
          selectedSessionId: sessionId,
          view: "chat",
          offlineMode: true,
          notice: "Showing cached chat while this phone is disconnected from the desktop link.",
          error: null
        });
        if (cachedMessages.length) {
          await persistOfflineSnapshot(get);
          return;
        }
      }

      const requiredToken = requireValue(token, "Pair this phone with the desktop first.");
      const requiredBaseUrl = requireValue(baseUrl, "Desktop URL is required.");
      const messages = await api.listMessages(requiredToken, requiredBaseUrl, sessionId);
      const pinnedVoiceTitle =
        get().voiceSessionActive && get().voiceTargetSessionId && get().voiceTargetSessionId !== sessionId
          ? get().sessions.find((item) => item.id === get().voiceTargetSessionId)?.title ?? null
          : null;
      set((state) => ({
        selectedSessionId: sessionId,
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: messages
        },
        view: "chat",
        notice: pinnedVoiceTitle ? `Voice loop stays attached to ${pinnedVoiceTitle} until you stop it.` : null,
        error: null
      }));
      await persistOfflineSnapshot(get);
    } catch (error) {
      if (error instanceof Error && isNotFoundErrorMessage(error.message)) {
        const cachedMessages = get().messagesBySession[sessionId];
        if (cachedMessages?.length) {
          set((state) => ({
            sessions: state.sessions.map((session) => (session.id === sessionId ? sanitizeSessionForFreedom(session) : session)),
            selectedSessionId: sessionId,
            view: "chat",
            offlineMode: true,
            notice: "That desktop chat is unavailable right now. Showing the cached copy on this phone instead.",
            error: null
          }));
          await persistOfflineSnapshot(get);
          return;
        }

        const remainingSessions = get().sessions.filter((session) => session.id !== sessionId);
        const fallbackSessionId = pickPreferredSessionId(null, remainingSessions);
        set({
          sessions: remainingSessions,
          selectedSessionId: fallbackSessionId,
          view: fallbackSessionId ? "chat" : "start",
          notice: fallbackSessionId
            ? "That desktop chat is gone. Freedom opened the next available thread."
            : "That desktop chat is gone. Start a fresh thread when you are ready.",
          error: null
        });
        await persistOfflineSnapshot(get);
        if (fallbackSessionId) {
          await get().selectSession(fallbackSessionId);
        }
        return;
      }

      if (error instanceof Error && isDesktopUnreachableErrorMessage(error.message)) {
        const cachedMessages = get().messagesBySession[sessionId];
        if (cachedMessages) {
          set({
            selectedSessionId: sessionId,
            view: "chat",
            offlineMode: true,
            notice: "Desktop unreachable. Showing cached chat and disconnected companion tools.",
            error: null
          });
          await persistOfflineSnapshot(get);
          return;
        }
      }

      await handleStoreError(error, set, get, "Could not open that chat.");
    }
  },
  async createProjectSession() {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const rootPath = get().newSessionRootPath || get().hostStatus?.host.approvedRoots[0];
      const title = get().newSessionTitle.trim();
      const intent = get().projectIntent.trim();

      if (!intent) {
        set({ error: `Add a project goal so ${FREEDOM_PRODUCT_NAME} knows how to kick this chat off.` });
        return;
      }

      const starterPrompt = buildProjectStarterPrompt({
        projectName: title,
        rootPath,
        intent,
        starterInstructions: get().projectInstructions,
        desiredOutputType: get().projectOutputType,
        templateId: get().projectTemplateId,
        responseStyle: get().responseStyle
      });

      const session = await api.createSession(token, baseUrl, {
        rootPath,
        kind: "project",
        starterPrompt,
        ...(title ? { title } : {})
      });
      const kickoffMessage = await api.postMessage(token, baseUrl, session.id, {
        text: starterPrompt,
        inputMode: "text",
        responseStyle: get().responseStyle,
        transcriptPolished: true
      });

      set((state) => ({
        sessions: sortSessionsForDisplay([session, ...state.sessions.filter((item) => item.id !== session.id)]),
        selectedSessionId: session.id,
        newSessionTitle: "",
        projectIntent: "",
        projectInstructions: "",
        projectOutputType: "implementation plan",
        projectTemplateId: "greenfield",
        renameDraftBySession: {
          ...state.renameDraftBySession,
          [session.id]: session.title
        },
        messagesBySession: {
          ...state.messagesBySession,
          [session.id]: [...(state.messagesBySession[session.id] ?? []), kickoffMessage]
        },
        view: "chat",
        notice: `Project kickoff sent. ${FREEDOM_PRODUCT_NAME} is starting with the new project brief.`,
        error: null
      }));
      await get().refresh();
    } catch (error) {
      await handleStoreError(error, set, get, "Could not start the project kickoff.");
    }
  },
  async renameSession(sessionId: string) {
    try {
      const targetSession = get().sessions.find((item) => item.id === sessionId) ?? null;
      const title = (get().renameDraftBySession[sessionId] ?? "").trim();
      if (!title) {
        set({ error: "Chat names cannot be empty." });
        return;
      }

      if (isLocalOnlySession(targetSession)) {
        set((state) => ({
          sessions: sortSessionsForDisplay(
            state.sessions.map((session) => (session.id === sessionId ? { ...session, title, updatedAt: new Date().toISOString() } : session))
          ),
          renameDraftBySession: {
            ...state.renameDraftBySession,
            [sessionId]: title
          },
          notice: "Local phone thread renamed.",
          error: null
        }));
        await persistOfflineSnapshot(get);
        return;
      }

      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");

      const session = await api.updateSession(token, baseUrl, sessionId, { title });
      set((state) => ({
        sessions: sortSessionsForDisplay([session, ...state.sessions.filter((item) => item.id !== session.id)]),
        renameDraftBySession: {
          ...state.renameDraftBySession,
          [session.id]: session.title
        },
        notice: null,
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not rename that chat.");
    }
  },
  async deleteSession(sessionId: string) {
    try {
      const targetSession = get().sessions.find((item) => item.id === sessionId) ?? null;
      if (isLocalOnlySession(targetSession)) {
        set((state) => {
          const remainingSessions = sortSessionsForDisplay(state.sessions.filter((item) => item.id !== sessionId));
          const nextSelectedSessionId =
            state.selectedSessionId === sessionId ? pickPreferredSessionId(null, remainingSessions) : state.selectedSessionId;
          const nextMessagesBySession = { ...state.messagesBySession };
          delete nextMessagesBySession[sessionId];
          const nextRenameDrafts = { ...state.renameDraftBySession };
          delete nextRenameDrafts[sessionId];
          const nextImports = { ...state.offlineImportDrafts };
          delete nextImports[sessionId];

          return {
            sessions: remainingSessions,
            selectedSessionId: nextSelectedSessionId,
            messagesBySession: nextMessagesBySession,
            renameDraftBySession: nextRenameDrafts,
            offlineImportDrafts: nextImports,
            voiceTargetSessionId: state.voiceTargetSessionId === sessionId ? null : state.voiceTargetSessionId,
            view: nextSelectedSessionId ? state.view : state.token ? "start" : "pairing",
            notice: "Local phone thread removed.",
            error: null
          };
        });
        await persistOfflineSnapshot(get);
        return;
      }

      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      await api.deleteSession(token, baseUrl, sessionId);

      set((state) => {
        const remainingSessions = sortSessionsForDisplay(state.sessions.filter((item) => item.id !== sessionId));
        const nextSelectedSessionId =
          state.selectedSessionId === sessionId
            ? pickPreferredSessionId(null, remainingSessions)
            : state.selectedSessionId;

        const nextMessagesBySession = { ...state.messagesBySession };
        delete nextMessagesBySession[sessionId];

        const nextRenameDrafts = { ...state.renameDraftBySession };
        delete nextRenameDrafts[sessionId];

        return {
          sessions: remainingSessions,
          selectedSessionId: nextSelectedSessionId,
          messagesBySession: nextMessagesBySession,
          renameDraftBySession: nextRenameDrafts,
          voiceTargetSessionId: state.voiceTargetSessionId === sessionId ? null : state.voiceTargetSessionId,
          view: nextSelectedSessionId ? state.view : "sessions",
          notice: null,
          error: null
        };
      });

      const nextSelectedSessionId = get().selectedSessionId;
      if (nextSelectedSessionId) {
        await get().selectSession(nextSelectedSessionId);
      }
    } catch (error) {
      await handleStoreError(error, set, get, "Could not delete that chat.");
    }
  },
  async sendMessage() {
    if (get().sendingMessage) {
      return;
    }

    clearPendingVoiceTranscript();
    const text = get().composer.trim();
    if (!text) {
      return;
    }

    if (tryHandleExternalDraftVoiceCommand(text, get, set)) {
      return;
    }

    if (get().offlineMode) {
      await sendOfflineIdeationTurn(get, set);
      return;
    }

    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");

      const isVoiceTurn = get().composerInputMode === "voice" || get().composerInputMode === "voice_polished";
      let sessionId = isVoiceTurn ? get().voiceTargetSessionId ?? get().selectedSessionId : get().selectedSessionId;
      if (!sessionId) {
        const operatorSession = await ensureOperatorSession(get, set, {
          token,
          baseUrl,
          hostStatus: get().hostStatus
        });
        sessionId = operatorSession?.id ?? pickPreferredSessionId(null, get().sessions);
        if (sessionId) {
          await get().selectSession(sessionId);
        }
      }
      const resolvedSessionId = requireValue(sessionId, "Open or start a chat before sending a message.");
      const targetSession = findSendTargetSession(resolvedSessionId, get().sessions);
      const wasBusy = isSessionBusy(targetSession);

      set({ sendingMessage: true, error: null });
      const parsedExternalRequest = parseExternalSendRequest(text, get().outboundRecipients);
      const message = await api.postMessage(token, baseUrl, resolvedSessionId, {
        text,
        inputMode: get().composerInputMode,
        responseStyle: get().responseStyle,
        transcriptPolished: get().composerInputMode === "voice_polished"
      });
      voiceInterruptRequested = false;
      set((state) => ({
        composer: "",
        composerInputMode: "text",
        sendingMessage: false,
        voiceTargetSessionId:
          state.voiceSessionActive && isVoiceTurn ? resolvedSessionId : state.voiceTargetSessionId,
        notice:
          wasBusy && isVoiceTurn
            ? `${FREEDOM_RUNTIME_NAME} captured your interrupt and routed it without blocking the session.`
            : wasBusy
              ? `${FREEDOM_RUNTIME_NAME} routed your new request alongside the current work when it was safe to do so.`
              : null,
        liveTranscript: "",
        voiceAudioLevel: -2,
        pendingExternalRequest: parsedExternalRequest
          ? buildPendingExternalRequest(resolvedSessionId, message.id, parsedExternalRequest, state.composerInputMode === "voice")
          : state.pendingExternalRequest,
        voiceSessionPhase:
          state.voiceSessionActive && isVoiceTurn
            ? "processing"
            : state.voiceSessionActive && state.voiceSessionPhase !== "review"
              ? state.voiceSessionPhase
              : "idle",
        messagesBySession: {
          ...state.messagesBySession,
          [resolvedSessionId]: [
            ...(state.messagesBySession[resolvedSessionId] ?? []).filter((item) => item.id !== message.id),
            message
          ]
        },
        voiceTelemetry:
          state.voiceSessionActive && isVoiceTurn
            ? {
                ...state.voiceTelemetry,
                turnsStarted: state.voiceTelemetry.turnsStarted + 1
              }
            : state.voiceTelemetry,
        error: null
      }));
      if (parsedExternalRequest) {
        set({
          notice: `${FREEDOM_RUNTIME_NAME} will prepare an email draft for ${parsedExternalRequest.recipientDestination} after this reply finishes, then wait for your confirmation.`,
          error: null
        });
      }
      await persistOfflineSnapshot(get);
      await get().refresh();
    } catch (error) {
      if (error instanceof Error && isDesktopUnreachableErrorMessage(error.message)) {
        set({
          offlineMode: true,
          realtimeConnected: false,
          notice: getDisconnectedTurnNotice(),
          error: null
        });
        await sendOfflineIdeationTurn(get, set);
        return;
      }

      await handleStoreError(error, set, get, "Could not send that message.");
    } finally {
      set({ sendingMessage: false });
    }
  },
  async generateOfflineImportSummary() {
    const sessionId = requireValue(get().selectedSessionId, "Open a cached chat before preparing an import summary.");
    const draft = get().offlineImportDrafts[sessionId];
    if (!draft || !draft.draftTurns.length) {
      set({
        error: "No offline ideation turns are waiting for import in this chat.",
        notice: null
      });
      return;
    }

    set({ offlineSummarizing: true, notice: "Summarizing offline ideation for import review.", error: null });
    try {
      await ensureOfflineModelPrepared(set);
      const summary = await requestDisconnectedImportSummary(get().messagesBySession[sessionId] ?? [], draft.draftTurns, get().baseUrl);
      set((state) => ({
        offlineSummarizing: false,
        offlineImportDrafts: {
          ...state.offlineImportDrafts,
          [sessionId]: {
            ...state.offlineImportDrafts[sessionId],
            summary,
            updatedAt: new Date().toISOString()
          }
        },
        notice: "Offline import summary is ready to review.",
        error: null
      }));
      await persistOfflineSnapshot(get);
    } catch (error) {
      set({
        offlineSummarizing: false,
        error: error instanceof Error ? error.message : "Could not summarize offline ideation."
      });
    }
  },
  updateOfflineImportSummary(sessionId, value) {
    set((state) => ({
      offlineImportDrafts: state.offlineImportDrafts[sessionId]
        ? {
            ...state.offlineImportDrafts,
            [sessionId]: {
              ...state.offlineImportDrafts[sessionId],
              summary: value,
              updatedAt: new Date().toISOString()
            }
          }
        : state.offlineImportDrafts
    }));
    void persistOfflineSnapshot(get);
  },
  updateOfflineImportDraftTurn(sessionId, index, value) {
    set((state) => {
      const draft = state.offlineImportDrafts[sessionId];
      if (!draft) {
        return {};
      }
      const nextDraftTurns = draft.draftTurns.map((turn, draftIndex) => (draftIndex === index ? value : turn));
      return {
        offlineImportDrafts: {
          ...state.offlineImportDrafts,
          [sessionId]: {
            ...draft,
            draftTurns: nextDraftTurns,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
    void persistOfflineSnapshot(get);
  },
  removeOfflineImportDraftTurn(sessionId, index) {
    set((state) => {
      const draft = state.offlineImportDrafts[sessionId];
      if (!draft) {
        return {};
      }
      const nextDraftTurns = draft.draftTurns.filter((_, draftIndex) => draftIndex !== index);
      return {
        offlineImportDrafts: {
          ...state.offlineImportDrafts,
          [sessionId]: {
            ...draft,
            draftTurns: nextDraftTurns,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
    void persistOfflineSnapshot(get);
  },
  async importOfflineSession() {
    const sessionId = requireValue(get().selectedSessionId, "Open the chat you want to import first.");
    const selectedSession = get().sessions.find((item) => item.id === sessionId) ?? null;
    const draft = get().offlineImportDrafts[sessionId];
    if (!draft || !draft.draftTurns.length) {
      set({
        notice: null,
        error: "No offline ideation notes are ready to import from this chat."
      });
      return;
    }

    const token = requireValue(get().token, "Pair this phone with the desktop first.");
    const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
    set({
      offlineImporting: true,
      notice: "Importing offline notes into canonical history without starting desktop work.",
      error: null
    });

    try {
      const importTargetSession =
        isLocalOnlySession(selectedSession)
          ? await ensureOperatorSession(get, set, {
              token,
              baseUrl,
              hostStatus: get().hostStatus
            })
          : selectedSession;
      const importTargetSessionId = requireValue(
        importTargetSession?.id ?? sessionId,
        "Freedom needs a live desktop chat before it can import phone-only notes."
      );
      const response = await api.importOfflineSession(token, baseUrl, importTargetSessionId, {
        clientImportId: `mobile-offline-${importTargetSessionId}-${new Date().toISOString()}`,
        summary: draft.summary.trim(),
        draftTurns: draft.draftTurns.map((turn) => turn.trim()).filter(Boolean),
        createdAt: draft.updatedAt,
        source: "mobile_offline"
      });
      const continueDraft =
        "I imported mobile offline ideation notes into this chat. Please review those imported notes and continue from them.";
      set((state) => ({
        offlineMode: false,
        offlineImporting: false,
        selectedSessionId: response.session.id,
        sessions: mergeRemoteAndLocalSessions(
          [response.session, ...state.sessions.filter((item) => !isLocalOnlySession(item) && item.id !== response.session.id)],
          state.sessions
        ),
        messagesBySession: {
          ...state.messagesBySession,
          [response.session.id]: [
            ...(state.messagesBySession[response.session.id] ?? []),
            ...response.messages.filter(
              (message: ChatMessage) =>
                !(state.messagesBySession[response.session.id] ?? []).some((existingMessage) => existingMessage.id === message.id)
            )
          ].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        },
        offlineImportDrafts: Object.fromEntries(
          Object.entries({
            ...state.offlineImportDrafts,
            [response.session.id]: {
              ...state.offlineImportDrafts[sessionId],
              sessionId: response.session.id,
              importedAt: new Date().toISOString(),
              continueDraft,
              updatedAt: new Date().toISOString()
            }
          }).filter(([draftSessionId]) => draftSessionId !== sessionId || !isLocalOnlySession(selectedSession))
        ) as typeof state.offlineImportDrafts,
        notice: isLocalOnlySession(selectedSession)
          ? "Phone-only notes imported into desktop history. Review them there before continuing."
          : "Offline notes imported safely. Review them, then continue only when you are ready.",
        error: null
      }));
      if (!isLocalOnlySession(selectedSession)) {
        set((state) => ({
          offlineImportDrafts: {
            ...state.offlineImportDrafts,
            [sessionId]: {
              ...state.offlineImportDrafts[sessionId],
              importedAt: new Date().toISOString(),
              continueDraft,
              updatedAt: new Date().toISOString()
            }
          }
        }));
      }
      await persistOfflineSnapshot(get);
    } catch (error) {
      set({
        offlineImporting: false,
        error: error instanceof Error ? error.message : "Could not import offline notes."
      });
    }
  },
  continueWithFreedom() {
    const sessionId = get().selectedSessionId;
    const continueDraft = sessionId ? get().offlineImportDrafts[sessionId]?.continueDraft : null;
    if (!continueDraft) {
      set({
        notice: null,
        error: "Import offline notes first so Freedom has a canonical summary to continue from."
      });
      return;
    }

    set({
      composer: continueDraft,
      composerInputMode: "text",
      notice: "Drafted a follow-up turn. Review it and send when you want the desktop to act.",
      error: null
    });
  },
  async enterStandaloneMode() {
    set({
      offlineMode: true,
      view: "start",
      notice: standaloneSurfaceHint(),
      error: null
    });
    await persistOfflineSnapshot(get);
  },
  async stopSession() {
    try {
      const shouldStopVoiceLoop = get().voiceSessionActive || Boolean(get().voiceAssistantDraft);
      if (shouldStopVoiceLoop) {
        stopActiveVoiceLoop(set, {
          notice: null,
          error: null
        });
      } else {
        clearPendingVoiceTranscript();
        assistantSpeech.stop();
      }
      await offlineAssistant.stop().catch(() => undefined);

      if (get().offlineMode) {
        set({
          sendingMessage: false,
          notice: "Offline voice loop stopped on this phone.",
          error: null
        });
        return;
      }

      const token = get().token;
      const baseUrl = get().baseUrl;
      const targetSession = findManualStopTargetSession(get().voiceTargetSessionId ?? get().selectedSessionId, get().sessions);

      if (!token || !baseUrl || !targetSession) {
        if (shouldStopVoiceLoop) {
          set({
            notice: "Voice loop stopped on this phone.",
            error: null
          });
          return;
        }

        throw new Error("Open a chat before stopping a run.");
      }

      const stoppedSession = await api.stopSession(token, baseUrl, targetSession.id);
      set((state) => ({
        sessions: sortSessionsForDisplay([stoppedSession, ...state.sessions.filter((item) => item.id !== stoppedSession.id)]),
        notice: shouldStopVoiceLoop
          ? isSessionBusy(targetSession)
            ? "Voice loop stopped. Waiting for the desktop to halt the current run."
            : `Voice loop stopped. ${FREEDOM_RUNTIME_NAME} is also checking this chat for a stuck or queued run.`
          : isSessionBusy(targetSession)
            ? "Stop requested. Waiting for the desktop to halt the current run."
            : `Stop requested for recovery. ${FREEDOM_RUNTIME_NAME} is checking for a stuck or queued run in this chat.`,
        error: null
      }));
      await get().refresh();
    } catch (error) {
      await handleStoreError(error, set, get, "Could not stop the current run.");
    }
  },
  async renameCurrentDevice() {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const deviceId = requireValue(get().currentDeviceId, "Current device settings are not available yet.");
      const renamed = await api.renameDevice(token, baseUrl, deviceId, {
        deviceName: get().deviceName.trim()
      });
      await persistSettings(get, {
        baseUrl,
        deviceName: renamed.deviceName,
        currentDeviceId: deviceId
      });
      set((state) => ({
        deviceName: renamed.deviceName,
        devices: state.devices.map((device) => (device.id === renamed.id ? renamed : device)),
        notice: "This phone's device name was updated.",
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not rename this phone.");
    }
  },
  async enablePushNotifications() {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const deviceId = requireValue(get().currentDeviceId, "Current device settings are not available yet.");
      set({ pushSyncing: true, notice: null, error: null });
      const pushToken = await fcm.requestPushToken();
      const updatedDevice = await api.registerPushToken(token, baseUrl, deviceId, { pushToken });
      syncPushTokenRefresh(baseUrl, token, get, set);
      await persistSettings(get, {
        baseUrl,
        currentDeviceId: deviceId
      });
      set((state) => ({
        devices: state.devices.map((device) => (device.id === updatedDevice.id ? updatedDevice : device)),
        pushSyncing: false,
        notice: "Android background updates are enabled for this phone.",
        error: null
      }));
    } catch (error) {
      set({ pushSyncing: false });
      await handleStoreError(error, set, get, "Could not enable Android background updates.");
    }
  },
  async toggleNotificationPreference(event) {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const deviceId = requireValue(get().currentDeviceId, "Current device settings are not available yet.");
      const currentDevice = get().devices.find((device) => device.id === deviceId);
      if (!currentDevice) {
        throw new Error("Current device settings are not available yet.");
      }
      const updatedDevice = await api.updateNotificationPrefs(token, baseUrl, deviceId, {
        ...currentDevice.notificationPrefs,
        [event]: !currentDevice.notificationPrefs[event]
      });
      set((state) => ({
        devices: state.devices.map((device) => (device.id === updatedDevice.id ? updatedDevice : device)),
        notice: null,
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not update Android background update preferences.");
    }
  },
  async sendDeviceTestNotification(deviceId, event) {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      await api.sendTestNotification(token, baseUrl, deviceId, event);
      await get().refresh();
      set({ notice: "Test notification requested.", error: null });
    } catch (error) {
      await handleStoreError(error, set, get, "Could not send a test notification.");
    }
  },
  async revokeDevice(deviceId) {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const revoked = await api.revokeDevice(token, baseUrl, deviceId);
      if (deviceId === get().currentDeviceId) {
        await enterRepairMode(set, get, "This phone was revoked. Pair again with the saved desktop URL and pairing code.");
        return;
      }
      set((state) => ({
        devices: state.devices.filter((device) => device.id !== revoked.id),
        notice: `${revoked.deviceName} was revoked.`,
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not revoke that device.");
    }
  },
  async toggleAutoSpeak() {
    const next = !get().autoSpeak;
    await persistSettings(get, { autoSpeak: next });
    set({ autoSpeak: next });
  },
  async toggleAutoSendVoice() {
    const next = !get().autoSendVoice;
    await persistSettings(get, { autoSendVoice: next, voiceAutoSendPreferenceTouched: true });
    set({
      autoSendVoice: next,
      voiceAutoSendPreferenceTouched: true,
      notice: next
        ? "Voice auto-send is on. Low-risk spoken turns will send after capture."
        : "Voice auto-send is off. Captured turns stay in review until you send them.",
      error: null
    });
  },
  async testAssistantVoice() {
    if (get().voiceSessionActive) {
      set({
        notice: "End the live voice loop before running the spoken-reply test.",
        error: null
      });
      return;
    }

    voice.stopStreamingSession();
    assistantSpeech.stop();
    const assistantVoiceState = await loadAssistantVoiceState(get().selectedAssistantVoiceId);
    const detail = await tts.describeAvailability();
    const previewVoice = getEffectiveFreedomVoiceProfile(get()).displayName;
    const spoken = tts.speak(`This is ${FREEDOM_PRODUCT_NAME} in ${previewVoice}. If you can hear this, Freedom voice playback is working on this phone.`);
    set({
      assistantVoices: assistantVoiceState.assistantVoices,
      selectedAssistantVoiceId: assistantVoiceState.selectedAssistantVoiceId,
      notice: spoken ? `Testing Freedom voice playback. ${detail}` : detail,
      error: null
    });
  },
  async triggerWakeHomebase() {
    const wakeControl = get().wakeControl;
    if (!wakeControl?.enabled) {
      set({
        notice: null,
        error: "Wake-on-request is not configured on this desktop yet."
      });
      return;
    }

    set({
      wakeRequesting: true,
      notice: `Sending a wake request for ${wakeControl.targetLabel ?? "Homebase"}...`,
      error: null
    });

    try {
      const result = await wakeRelay.wake(wakeControl);
      set({
        wakeRequesting: false,
        notice:
          result.status === "awake"
            ? `${result.targetLabel} is waking up now. ${FREEDOM_RUNTIME_NAME} will reconnect when the desktop heartbeat comes back.`
            : `${result.targetLabel} wake result: ${result.status}. ${result.detail ?? "Waiting for the desktop heartbeat."}`,
        error: result.status === "error" ? result.detail ?? "Wake relay reported an error." : null
      });
    } catch (error) {
      set({
        wakeRequesting: false,
        notice: null,
        error: error instanceof Error ? error.message : "Could not reach the wake relay."
      });
    }
  },
  async addOutboundRecipient() {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      const label = get().outboundRecipientLabelDraft.trim();
      const destination = get().outboundRecipientEmailDraft.trim();
      if (!label || !destination) {
        set({
          notice: null,
          error: "Add both a recipient label and an email address first."
        });
        return;
      }

      const recipient = await api.createOutboundRecipient(token, baseUrl, {
        label,
        destination
      });
      set((state) => ({
        outboundRecipients: [...state.outboundRecipients.filter((item) => item.id !== recipient.id), recipient].sort((left, right) =>
          left.label.localeCompare(right.label)
        ),
        outboundRecipientLabelDraft: "",
        outboundRecipientEmailDraft: "",
        hostStatus: state.hostStatus
          ? {
              ...state.hostStatus,
              outboundEmail: {
                ...state.hostStatus.outboundEmail,
                recipientCount: state.hostStatus.outboundEmail.recipientCount + 1
              }
            }
          : state.hostStatus,
        notice: `${recipient.label} is now a trusted outbound recipient.`,
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not add that outbound recipient.");
    }
  },
  async deleteOutboundRecipient(recipientId) {
    try {
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      await api.deleteOutboundRecipient(token, baseUrl, recipientId);
      set((state) => ({
        outboundRecipients: state.outboundRecipients.filter((item) => item.id !== recipientId),
        externalDraft:
          state.externalDraft?.recipientId === recipientId
            ? {
                ...state.externalDraft,
                recipientId: null
              }
            : state.externalDraft,
        hostStatus: state.hostStatus
          ? {
              ...state.hostStatus,
              outboundEmail: {
                ...state.hostStatus.outboundEmail,
                recipientCount: Math.max(0, state.hostStatus.outboundEmail.recipientCount - 1)
              }
            }
          : state.hostStatus,
        notice: "Trusted outbound recipient removed.",
        error: null
      }));
    } catch (error) {
      await handleStoreError(error, set, get, "Could not remove that outbound recipient.");
    }
  },
  beginExternalMessageDraft(messageId, sessionId) {
    const session = get().sessions.find((item) => item.id === sessionId) ?? null;
    const message = get().messagesBySession[sessionId]?.find((item) => item.id === messageId) ?? null;
    if (!session || !message || message.role !== "assistant" || message.status !== "completed") {
      set({
        notice: null,
        error: "Choose a completed assistant reply before sending it externally."
      });
      return;
    }

    set((state) => ({
      externalDraft: {
        sessionId,
        messageId,
        recipientId: state.outboundRecipients[0]?.id ?? null,
        recipientLabel: state.outboundRecipients[0]?.label ?? null,
        recipientDestination: state.outboundRecipients[0]?.destination ?? "",
        subject: buildExternalSubject(session.title, message.content),
        intro: "",
        confirmationRequired: false
      },
      notice: state.outboundRecipients.length
        ? "External send draft ready. Choose a recipient, review the subject, and send when ready."
        : "External send draft ready. Add a trusted recipient on the Host tab before sending.",
      error: null,
      view: "chat"
    }));
  },
  cancelExternalMessageDraft() {
    set({
      externalDraft: null,
      pendingExternalRequest: null,
      sendingExternalMessage: false,
      notice: null,
      error: null
    });
  },
  updateExternalDraft(field, value) {
    set((state) => ({
      externalDraft: state.externalDraft
        ? {
            ...state.externalDraft,
            ...(field === "recipientId"
              ? resolveExternalDraftRecipientSelection(state.outboundRecipients, value)
              : field === "recipientDestination"
                ? {
                    recipientId: null,
                    recipientLabel: null,
                    recipientDestination: value
                  }
                : { [field]: value })
          }
        : state.externalDraft
    }));
  },
  async sendExternalMessage() {
    try {
      const draft = requireValue(get().externalDraft, "Choose a completed assistant reply before sending it externally.");
      const token = requireValue(get().token, "Pair this phone with the desktop first.");
      const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
      if (!draft.recipientId && !draft.recipientDestination.trim()) {
        set({
          notice: null,
          error: "Choose or enter an email recipient before sending externally."
        });
        return;
      }
      if (!draft.recipientId && !isValidExternalEmail(draft.recipientDestination)) {
        set({
          notice: null,
          error: "Enter a valid email address before sending externally."
        });
        return;
      }

      set({
        sendingExternalMessage: true,
        notice: null,
        error: null
      });
      const response = await api.sendExternalMessage(token, baseUrl, {
        sessionId: draft.sessionId,
        messageId: draft.messageId,
        ...(draft.recipientId ? { recipientId: draft.recipientId } : {}),
        ...(!draft.recipientId
          ? {
              recipientDestination: draft.recipientDestination.trim(),
              recipientLabel: draft.recipientLabel ?? draft.recipientDestination.trim()
            }
          : {}),
        subject: draft.subject.trim(),
        intro: draft.intro.trim()
      });
      set({
        sendingExternalMessage: false,
        externalDraft: null,
        pendingExternalRequest: null,
        notice: `External report sent to ${response.recipient.destination}.`,
        error: null
      });
      await get().refresh();
    } catch (error) {
      set({ sendingExternalMessage: false });
      await handleStoreError(error, set, get, "Could not send that external report.");
    }
  },
  async toggleListening() {
    if (!VOICE_SESSION_ENABLED) {
      set({
        listening: false,
        voiceSessionActive: false,
        voiceTargetSessionId: null,
        voiceMuted: false,
        voiceRuntimeBinding: null,
        voiceSessionPhase: "error",
        notice: null,
        error: "Realtime voice sessions are disabled in this build."
      });
      return;
    }

    if (!get().voiceAvailable) {
      set({
        listening: false,
        voiceSessionActive: false,
        voiceTargetSessionId: null,
        voiceMuted: false,
        voiceRuntimeBinding: null,
        voiceSessionPhase: "error",
        notice: null,
        error: "Voice input is not available on this phone yet."
      });
      return;
    }

    if (get().voiceSessionActive) {
      stopActiveVoiceLoop(set, {
        notice: null,
        error: null
      });
      return;
    }

    let targetSessionId: string;
    try {
      targetSessionId = await resolveVoiceTargetSessionId(get, set);
    } catch (error) {
      await handleStoreError(error, set, get, "Open or start a chat before starting the voice loop.");
      return;
    }

    set({
      view: "chat",
      notice: get().offlineMode
        ? getDisconnectedVoiceStartNotice()
        : prefersRealtimePrimaryVoice()
          ? `Realtime voice starting. ${FREEDOM_RUNTIME_NAME} is switching this phone onto the primary LiveKit voice path.`
          : `Voice loop starting. Speak naturally and ${FREEDOM_RUNTIME_NAME} will keep listening between turns on the local capture path.`,
      error: null,
      voiceSessionActive: true,
      voiceTargetSessionId: targetSessionId,
      voiceMuted: false,
      listening: true,
      voiceRuntimeMode: get().offlineMode ? getDisconnectedAssistantRuntimeMode() : prefersRealtimePrimaryVoice() ? "realtime_primary" : "device_fallback",
      voiceRuntimeBinding: null,
      voiceSessionPhase: "connecting",
      liveTranscript: "",
      voiceAudioLevel: -2,
      voiceAssistantDraft: null
    });
    assistantSpeech.reset();
    voiceInterruptRequested = false;

    if (!get().offlineMode && prefersRealtimePrimaryVoice()) {
      try {
        await startRealtimeVoiceSession(get, set, targetSessionId);
        return;
      } catch {
        set({
          notice: "Realtime voice could not start cleanly, so Freedom is falling back to the local capture plus hosted speech path.",
          error: null,
          voiceRuntimeMode: "device_fallback",
          voiceRuntimeBinding: null,
          voiceSessionPhase: "connecting",
          listening: true
        });
      }
    }

    if (!(await tts.prepare())) {
      set({
        notice: "Voice loop is live, but Freedom spoken replies are unavailable until a hosted Freedom speech path is reachable.",
        error: null
      });
    }

    await startVoiceLoopRecognition(get, set);
  },
  async toggleVoiceMute() {
    const state = get();
    if (!state.voiceSessionActive) {
      set({
        notice: "Start the voice loop first, then mute your microphone when you need a quieter side channel.",
        error: null
      });
      return;
    }

    if (state.voiceMuted) {
      set({
        voiceMuted: false,
        notice: pendingVoiceTranscript
          ? `Microphone live again. Finish your thought, or stay quiet and ${FREEDOM_RUNTIME_NAME} will send the held turn.`
          : "Microphone live again.",
        error: null,
        voiceSessionPhase: "connecting"
      });
      if (usesRealtimeVoicePath(get())) {
        await realtimeVoice.setMuted(false);
        set({ listening: true, voiceSessionPhase: "listening" });
      } else {
        await startVoiceLoopRecognition(get, set);
      }
      if (pendingVoiceTranscript) {
        schedulePendingVoiceCommit(get, set);
      }
      return;
    }

    clearPendingVoiceCommitTimer();
    if (usesRealtimeVoicePath(state)) {
      await realtimeVoice.setMuted(true);
    } else {
      voice.stopStreamingSession();
    }
    set({
      voiceMuted: true,
      listening: false,
      voiceAudioLevel: -2,
      voiceSessionPhase: "muted",
      notice: pendingVoiceTranscript
        ? `Microphone muted. ${FREEDOM_RUNTIME_NAME} is holding your unfinished turn until you unmute.`
        : `Microphone muted. ${FREEDOM_RUNTIME_NAME} will keep speaking, but it will ignore your side until you unmute.`,
      error: null
    });
  },
  async setResponseStyle(style) {
    await persistSettings(get, { responseStyle: style });
    set({ responseStyle: style, notice: `Reply style set to ${style}.`, error: null });
  },
  async selectAssistantVoice(voiceId) {
    const assistantVoiceState = await loadAssistantVoiceState(voiceId);
    await persistSettings(get, {
      assistantVoiceId: assistantVoiceState.selectedAssistantVoiceId
    });
    const requestedVoice = voiceId ? assistantVoiceState.assistantVoices.find((voiceOption) => voiceOption.id === voiceId) ?? null : null;
    const selectedVoice =
      assistantVoiceState.assistantVoices.find((voiceOption) => voiceOption.id === assistantVoiceState.selectedAssistantVoiceId) ?? null;
    set({
      assistantVoices: assistantVoiceState.assistantVoices,
      selectedAssistantVoiceId: assistantVoiceState.selectedAssistantVoiceId,
      notice: selectedVoice
        ? `Spoken reply voice set to ${selectedVoice.label}. Use Test Spoken Reply to preview it.`
        : requestedVoice
          ? `Tried to switch to ${requestedVoice.label}, but the phone did not confirm the change. Test Spoken Reply may still be using the current default voice.`
        : `Spoken reply voice reset to automatic. ${FREEDOM_RUNTIME_NAME} will use the phone's default English voice.`,
      error: null
    });
  },
  async selectFreedomVoicePreset(voiceId) {
    const targetVoice = normalizeAssistantVoicePresetId(voiceId);
    const entry = getAssistantVoiceCatalogEntry(targetVoice);
    try {
      if (get().token && !get().offlineMode) {
        const token = requireValue(get().token, "Pair this phone with the desktop first.");
        const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
        const updated = await api.updateVoiceProfile(token, baseUrl, {
          targetVoice,
          notes: null
        });
        await persistSettings(get, { freedomVoicePresetId: updated.targetVoice });
        const updatedEntry = getAssistantVoiceCatalogEntry(updated.targetVoice);
        set((state) => ({
          selectedFreedomVoicePresetId: updated.targetVoice,
          hostStatus: state.hostStatus
            ? {
                ...state.hostStatus,
                voiceProfile: updated
              }
            : state.hostStatus,
          notice: `${updatedEntry.label} is set as Freedom's live and fallback voice. Start a fresh Talk session to hear it clearly.`,
          error: null
        }));
        return;
      }

      await persistSettings(get, { freedomVoicePresetId: targetVoice });
      set({
        selectedFreedomVoicePresetId: targetVoice,
        notice: `${entry.label} is set as Freedom's standalone voice. The same preset will carry into live voice when the desktop link is back.`,
        error: null
      });
    } catch (error) {
      await handleStoreError(error, set, get, "Could not update Freedom's live voice.");
    }
  },
  setRenameDraft(sessionId, value) {
    set((state) => ({
      renameDraftBySession: {
        ...state.renameDraftBySession,
        [sessionId]: value
      }
    }));
  },
  setField(field, value) {
    if (field === "composer" && value === "") {
      set({ composer: "", composerInputMode: "text" });
      return;
    }
    set({ [field]: value } as Pick<AppState, typeof field>);
  },
  setView(view) {
    set({ view });
  }
};
});

function buildVoiceSessionCallbacks(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Parameters<VoiceService["startStreamingSession"]>[0] {
  return {
    onListening: () => {
      set((state) => ({
        listening: state.voiceMuted ? false : true,
        voiceSessionPhase:
          state.voiceMuted
            ? "muted"
            : state.voiceSessionPhase === "assistant-speaking" ||
                state.voiceSessionPhase === "processing" ||
                state.voiceSessionPhase === "review" ||
                Boolean(pendingVoiceTranscript)
              ? state.voiceSessionPhase
              : "listening",
        notice: null,
        error: null
      }));
    },
    onSpeechStart: () => {
      if (get().voiceMuted) {
        return;
      }
      clearPendingVoiceCommitTimer();
      set((state) => ({
        listening: true,
        voiceSessionPhase: state.voiceSessionActive ? "user-speaking" : state.voiceSessionPhase
      }));
    },
    onSpeechEnd: () => {
      if (pendingVoiceTranscript) {
        schedulePartialVoiceFallbackCommit(get, set);
      }
      set((state) => {
        if (!state.voiceSessionActive) {
          return {};
        }

        if (state.voiceSessionPhase === "user-speaking") {
          return {
            voiceSessionPhase: state.liveTranscript ? "processing" : "listening"
          };
        }

        return {};
      });
    },
    onVolume: (value) => {
      if (get().voiceMuted) {
        return;
      }
      set({ voiceAudioLevel: value });
    },
    onPartialTranscript: (text) => {
      if (get().voiceMuted) {
        return;
      }
      const normalized = normalizeVoiceTranscript(text);
      if (!normalized) {
        return;
      }

      const merged = pendingVoiceTranscript ? mergeVoiceTranscriptSegments(pendingVoiceTranscript, normalized) : normalized;
      pendingVoiceTranscript = merged;

      if (isVoiceAssistantActive(get) && isLikelyAssistantEcho(merged, get().voiceAssistantDraft ?? "")) {
        clearPendingPartialVoiceCommitTimer();
        set({
          liveTranscript: "",
          voiceAudioLevel: -2,
          voiceSessionPhase: "assistant-speaking"
        });
        return;
      }

      set((state) => ({
        liveTranscript: merged,
        voiceSessionPhase: "user-speaking",
        voiceTelemetry: {
          ...state.voiceTelemetry,
          lastHeardAt: new Date().toISOString()
        }
      }));
      schedulePartialVoiceFallbackCommit(get, set);

      if (!voiceInterruptRequested && isVoiceAssistantActive(get) && shouldInterruptAssistant(merged, VOICE_INTERRUPT_MIN_CHARS, VOICE_BACKCHANNEL_MAX_WORDS)) {
        voiceInterruptRequested = true;
        assistantSpeech.stop();
        void requestImmediateVoiceInterrupt(get, set).catch(() => undefined);
        set((state) => ({
          voiceSessionPhase: "interrupted",
          notice: "Interrupt heard. Freedom stopped speaking and is capturing your next turn now.",
          voiceTelemetry: {
            ...state.voiceTelemetry,
            interruptions: state.voiceTelemetry.interruptions + 1
          }
        }));
      }
    },
    onFinalTranscript: (text) => {
      if (get().voiceMuted) {
        return;
      }
      const normalized = normalizeVoiceTranscript(text);
      if (!normalized) {
        set({ liveTranscript: "", voiceSessionPhase: "listening" });
        return;
      }

      const merged = pendingVoiceTranscript ? mergeVoiceTranscriptSegments(pendingVoiceTranscript, normalized) : normalized;
      pendingVoiceTranscript = merged;
      clearPendingPartialVoiceCommitTimer();

      if (isVoiceAssistantActive(get) && isLikelyAssistantEcho(merged, get().voiceAssistantDraft ?? "")) {
        clearPendingVoiceTranscript();
        set({ liveTranscript: "", voiceAudioLevel: -2, voiceSessionPhase: "assistant-speaking" });
        return;
      }

      if (isVoiceAssistantActive(get) && !voiceInterruptRequested && !shouldInterruptAssistant(merged, VOICE_INTERRUPT_MIN_CHARS, VOICE_BACKCHANNEL_MAX_WORDS)) {
        clearPendingVoiceTranscript();
        set({ liveTranscript: "", voiceSessionPhase: "assistant-speaking" });
        return;
      }

      set((state) => ({
        liveTranscript: merged,
        voiceSessionPhase: state.voiceSessionActive ? "listening" : state.voiceSessionPhase,
        voiceAudioLevel: -2,
        notice: null,
        error: null,
        view: "chat",
        voiceTelemetry: {
          ...state.voiceTelemetry,
          lastHeardAt: new Date().toISOString()
        }
      }));
      schedulePendingVoiceCommit(get, set);
    },
    onReconnect: () => {
      if (get().voiceMuted) {
        set({ listening: false, voiceSessionPhase: "muted" });
        return;
      }
      set((state) => ({
        listening: false,
        voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase,
        voiceTelemetry: {
          ...state.voiceTelemetry,
          reconnects: state.voiceTelemetry.reconnects + 1
        }
      }));
    },
    onError: (message) => {
      clearPendingVoiceTranscript();
      assistantSpeech.stop();
      set({
        listening: false,
        voiceSessionActive: false,
        voiceTargetSessionId: null,
        voiceMuted: false,
        voiceSessionPhase: "error",
        liveTranscript: "",
        voiceAudioLevel: -2,
        notice: null,
        error: message
      });
      voiceInterruptRequested = false;
    }
  };
}

function createVoiceSessionId(): string {
  return `voice-mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildRealtimeVoiceCallbacks(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Parameters<RealtimeVoiceService["startSession"]>[1] {
  return {
    onConnected: (binding) => {
      set({
        listening: !get().voiceMuted,
        voiceRuntimeMode: binding.runtimeMode,
        voiceRuntimeBinding: binding,
        voiceSessionPhase: get().voiceMuted ? "muted" : "listening",
        liveTranscript: "",
        voiceAudioLevel: -2,
        notice: null,
        error: null,
        view: "chat"
      });
    },
    onDisconnected: (expected) => {
      if (expected) {
        return;
      }

      set((state) => ({
        listening: false,
        voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase,
        voiceTelemetry: {
          ...state.voiceTelemetry,
          reconnects: state.voiceTelemetry.reconnects + 1
        },
        error: "Realtime voice disconnected. Trying to recover the room connection."
      }));
    },
    onReconnecting: () => {
      set((state) => ({
        listening: false,
        voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase,
        voiceTelemetry: {
          ...state.voiceTelemetry,
          reconnects: state.voiceTelemetry.reconnects + 1
        }
      }));
    },
    onReconnected: () => {
      set((state) => ({
        listening: !state.voiceMuted,
        voiceSessionPhase: state.voiceMuted ? "muted" : "listening",
        error: null
      }));
    },
    onStateChange: (state) => {
      set((current) => ({
        listening: current.voiceMuted ? false : true,
        voiceSessionPhase:
          state === "speaking"
            ? "assistant-speaking"
            : state === "processing"
              ? "processing"
              : current.voiceMuted
                ? "muted"
                : "listening",
        voiceAssistantDraft: state === "listening" ? null : current.voiceAssistantDraft
      }));

      if (state === "listening") {
        voiceInterruptRequested = false;
      }
    },
    onTranscript: ({ text, source, final }) => {
      const normalized = normalizeVoiceTranscript(text);
      if (!normalized) {
        return;
      }

      if (source === "assistant") {
        set((state) => ({
          liveTranscript: state.liveTranscript,
          voiceAssistantDraft: normalized,
          voiceSessionPhase: state.voiceMuted ? "muted" : "assistant-speaking",
          voiceTelemetry:
            final && state.voiceTelemetry.lastHeardAt
              ? {
                  ...state.voiceTelemetry,
                  turnsCompleted: state.voiceTelemetry.turnsCompleted + 1,
                  lastRoundTripMs: Date.now() - new Date(state.voiceTelemetry.lastHeardAt).getTime()
                }
              : state.voiceTelemetry
        }));
        return;
      }

      set((state) => ({
        liveTranscript: normalized,
        voiceAssistantDraft: state.voiceAssistantDraft,
        voiceSessionPhase: state.voiceMuted ? "muted" : final ? "processing" : "user-speaking",
        voiceTelemetry: {
          ...state.voiceTelemetry,
          lastHeardAt: new Date().toISOString(),
          turnsStarted: final ? state.voiceTelemetry.turnsStarted + 1 : state.voiceTelemetry.turnsStarted
        }
      }));
    },
    onError: (message) => {
      set({
        listening: false,
        voiceSessionActive: false,
        voiceTargetSessionId: null,
        voiceMuted: false,
        voiceRuntimeBinding: null,
        voiceSessionPhase: "error",
        liveTranscript: "",
        voiceAudioLevel: -2,
        notice: null,
        error: message
      });
      voiceInterruptRequested = false;
    }
  };
}

async function startRealtimeVoiceSession(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  targetSessionId: string
): Promise<void> {
  const token = requireValue(get().token, "Pair this phone with the desktop first.");
  const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
  const runtime = await api.createVoiceRuntimeSession(token, baseUrl, {
    voiceSessionId: createVoiceSessionId(),
    chatSessionId: targetSessionId,
    assistantName: FREEDOM_PRODUCT_NAME
  });

  await realtimeVoice.startSession(runtime as Parameters<RealtimeVoiceService["startSession"]>[0], buildRealtimeVoiceCallbacks(get, set));
}

async function startVoiceLoopRecognition(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  if (get().voiceMuted) {
    set({
      listening: false,
      voiceSessionPhase: "muted"
    });
    return;
  }

  try {
    await voice.startStreamingSession(buildVoiceSessionCallbacks(get, set));
  } catch (error) {
    clearPendingVoiceTranscript();
    voice.stopStreamingSession();
    assistantSpeech.stop();
    set({
      listening: false,
      voiceSessionActive: false,
      voiceTargetSessionId: null,
      voiceMuted: false,
      voiceRuntimeBinding: null,
      voiceSessionPhase: "error",
      notice: null,
      error: error instanceof Error ? error.message : "Voice recognition could not start."
    });
    throw error;
  }
}

function stopActiveVoiceLoop(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  overrides?: Pick<AppState, "notice" | "error">
): void {
  clearPendingVoiceTranscript();
  voice.stopStreamingSession();
  void realtimeVoice.stopSession();
  assistantSpeech.stop();
  set({
    listening: false,
    voiceSessionActive: false,
    voiceTargetSessionId: null,
    voiceMuted: false,
    voiceRuntimeBinding: null,
    voiceSessionPhase: "idle",
    liveTranscript: "",
    voiceAudioLevel: -2,
    voiceAssistantDraft: null,
    notice: overrides?.notice ?? null,
    error: overrides?.error ?? null
  });
  voiceInterruptRequested = false;
  backendInterruptTurnId = null;
}

function settingsWakeControl(get: () => AppState): WakeControl {
  return (
    get().wakeControl ?? {
      enabled: false,
      relayBaseUrl: null,
      relayToken: null,
      targetId: null,
      targetLabel: null
    }
  );
}

function wakeControlsEqual(left: WakeControl | null, right: WakeControl | null): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function buildExternalSubject(sessionTitle: string, messageContent: string): string {
  const preview = messageContent.trim().replace(/\s+/g, " ").slice(0, 72).trim();
  return preview ? `${sessionTitle}: ${preview}` : `${sessionTitle}: ${FREEDOM_PRODUCT_NAME} update`;
}

function resolveExternalDraftRecipientSelection(recipients: OutboundRecipient[], recipientId: string): {
  recipientId: string | null;
  recipientLabel: string | null;
  recipientDestination: string;
} {
  const recipient = recipients.find((item) => item.id === recipientId) ?? null;
  return {
    recipientId: recipient?.id ?? null,
    recipientLabel: recipient?.label ?? null,
    recipientDestination: recipient?.destination ?? ""
  };
}

function buildPendingExternalRequest(
  sessionId: string,
  userMessageId: string,
  request: ParsedExternalSendRequest,
  requestedByVoice: boolean
): PendingExternalRequestState {
  return {
    sessionId,
    userMessageId,
    recipientId: request.recipientId,
    recipientLabel: request.recipientLabel,
    recipientDestination: request.recipientDestination,
    requestedByVoice,
    requestedSubject: request.requestedSubject,
    requestedBody: request.requestedBody
  };
}

function buildExternalDraftFromPendingRequest(
  request: PendingExternalRequestState,
  sessionId: string,
  messageId: string,
  sessionTitle: string,
  messageContent: string
): ExternalDraftState {
  return {
    sessionId,
    messageId,
    recipientId: request.recipientId,
    recipientLabel: request.recipientLabel,
    recipientDestination: request.recipientDestination,
    subject: request.requestedSubject ?? buildExternalSubject(sessionTitle, messageContent),
    intro: request.requestedBody ?? "",
    confirmationRequired: true
  };
}

function buildExternalDraftConfirmationPrompt(request: PendingExternalRequestState, draft: ExternalDraftState): string {
  const subjectClause = draft.subject.trim() ? ` Subject: ${draft.subject.trim()}.` : "";
  return `I prepared an email to ${draft.recipientDestination}.${subjectClause} Say yes, send it to confirm, or say cancel.`;
}

function tryHandleExternalDraftVoiceCommand(
  text: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): boolean {
  const draft = get().externalDraft;
  if (!draft) {
    return false;
  }

  if (isExternalSendCancellation(text)) {
    set({
      composer: "",
      composerInputMode: "text",
      externalDraft: null,
      pendingExternalRequest: null,
      notice: "Email draft cancelled.",
      error: null
    });
    return true;
  }

  if (!isExternalSendConfirmation(text)) {
    return false;
  }

  set({
    composer: "",
    composerInputMode: "text",
    notice: `Sending the drafted email to ${draft.recipientDestination}.`,
    error: null
  });
  get().sendExternalMessage().catch(() => undefined);
  return true;
}

function clearPendingVoiceCommitTimer(): void {
  if (!pendingVoiceCommitTimer) {
    return;
  }

  clearTimeout(pendingVoiceCommitTimer);
  pendingVoiceCommitTimer = null;
}

function clearPendingPartialVoiceCommitTimer(): void {
  if (!pendingPartialVoiceCommitTimer) {
    return;
  }

  clearTimeout(pendingPartialVoiceCommitTimer);
  pendingPartialVoiceCommitTimer = null;
}

function clearPendingVoiceTranscript(): void {
  clearPendingVoiceCommitTimer();
  clearPendingPartialVoiceCommitTimer();
  pendingVoiceTranscript = null;
}

function schedulePendingVoiceCommit(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): void {
  clearPendingVoiceCommitTimer();
  pendingVoiceCommitTimer = setTimeout(() => {
    pendingVoiceCommitTimer = null;
    commitPendingVoiceTranscript(get, set).catch(() => undefined);
  }, VOICE_CONTINUATION_GRACE_MS);
}

function schedulePartialVoiceFallbackCommit(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): void {
  clearPendingPartialVoiceCommitTimer();
  pendingPartialVoiceCommitTimer = setTimeout(() => {
    pendingPartialVoiceCommitTimer = null;
    if (!pendingVoiceTranscript || get().voiceMuted || !get().voiceSessionActive) {
      return;
    }

    console.info(`[FreedomVoice] fallback committing partial transcript=${pendingVoiceTranscript}`);
    commitPendingVoiceTranscript(get, set).catch(() => undefined);
  }, VOICE_PARTIAL_FALLBACK_COMMIT_MS);
}

async function commitPendingVoiceTranscript(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  const transcript = normalizeVoiceTranscript(pendingVoiceTranscript ?? "");
  clearPendingPartialVoiceCommitTimer();
  pendingVoiceTranscript = null;
  if (!transcript) {
    return;
  }

  if (get().voiceMuted) {
    pendingVoiceTranscript = transcript;
    return;
  }

  if (requiresVoiceReview(transcript)) {
    voice.stopStreamingSession();
    assistantSpeech.stop();
    set((state) => ({
      composer: transcript,
      composerInputMode: "voice_polished",
      listening: false,
      voiceSessionActive: false,
      voiceTargetSessionId: state.voiceTargetSessionId,
      voiceSessionPhase: "review",
      liveTranscript: "",
      voiceAudioLevel: -2,
      notice: "Review the captured transcript before sending. Voice loop paused for this turn.",
      error: null,
      view: "chat",
      voiceTelemetry: {
        ...state.voiceTelemetry,
        lastHeardAt: new Date().toISOString()
      }
    }));
    voiceInterruptRequested = false;
    return;
  }

  if (!get().autoSendVoice) {
    voice.stopStreamingSession();
    assistantSpeech.stop();
    set((state) => ({
      composer: transcript,
      composerInputMode: "voice",
      listening: false,
      voiceSessionActive: false,
      voiceTargetSessionId: state.voiceTargetSessionId,
      voiceSessionPhase: "review",
      liveTranscript: "",
      voiceAudioLevel: -2,
      notice: "Voice captured. Auto-send is off, so this turn is waiting for review before sending.",
      error: null,
      view: "chat",
      voiceTelemetry: {
        ...state.voiceTelemetry,
        lastHeardAt: new Date().toISOString()
      }
    }));
    voiceInterruptRequested = false;
    return;
  }

  set((state) => ({
    composer: transcript,
    composerInputMode: "voice",
    liveTranscript: "",
    voiceSessionPhase: "processing",
    voiceAudioLevel: -2,
    notice: null,
    error: null,
    view: "chat",
    voiceTelemetry: {
      ...state.voiceTelemetry,
      lastHeardAt: new Date().toISOString()
    }
  }));
  await maybeAutoSendVoiceResult(get, set);
}

function pauseVoiceLoopForAssistant(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): void {
  if (!SHOULD_PAUSE_RECOGNITION_DURING_TTS) {
    return;
  }

  const state = get();
  if (!state.voiceSessionActive) {
    return;
  }

  clearPendingVoiceCommitTimer();
  voice.stopStreamingSession();
  set({
    listening: false,
    liveTranscript: "",
    voiceAudioLevel: -2
  });
}

async function ensureVoiceLoopListening(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  if (!SHOULD_PAUSE_RECOGNITION_DURING_TTS) {
    return;
  }

  const state = get();
  if (!state.voiceSessionActive || state.voiceMuted || state.voiceSessionPhase === "review" || state.listening) {
    return;
  }

  await startVoiceLoopRecognition(get, set);
}

function connectSocket(
  baseUrl: string,
  token: string,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState
): void {
  disconnectSocket({ keepReconnectIntent: true });
  shouldReconnect = true;
  const startRealtime = async () => {
    try {
      const realtime = await api.createRealtimeTicket(token, baseUrl);
      const nextSocket = new WebSocket(`${websocketUrlFromBase(baseUrl)}?ticket=${encodeURIComponent(realtime.ticket)}`);
      let dropHandled = false;
      socket = nextSocket;

      nextSocket.onopen = () => {
        if (socket !== nextSocket) {
          return;
        }
        reconnectAttempts = 0;
        clearReconnectTimer();
        set((state) => ({
          realtimeConnected: true,
          error: null,
          voiceSessionPhase:
            state.voiceSessionActive && state.voiceSessionPhase === "reconnecting" ? "listening" : state.voiceSessionPhase
        }));
        get().refresh().catch(() => undefined);
      };

      nextSocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as StreamEvent | { type: "hello" };
          if (payload.type === "hello") {
            return;
          }
          applyStreamEvent(payload, set, get);
        } catch {
          set({ error: "Received an invalid realtime payload from the desktop gateway." });
        }
      };

      const handleDrop = () => {
        if (dropHandled || socket !== nextSocket) {
          return;
        }
        dropHandled = true;
        socket = null;
        set((state) => ({
          realtimeConnected: false,
          voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase,
          notice: state.offlineMode
            ? getDisconnectedModeNotice()
            : "Realtime connection dropped. Freedom is reconnecting to the desktop link now.",
          error: null
        }));
        get().refresh().catch(() => undefined);
        scheduleReconnect(baseUrl, token, set, get);
      };

      nextSocket.onerror = handleDrop;
      nextSocket.onclose = handleDrop;
    } catch (error) {
      set((state) => ({
        realtimeConnected: false,
        voiceSessionPhase: state.voiceSessionActive ? "reconnecting" : state.voiceSessionPhase,
        notice: state.offlineMode ? getDisconnectedModeNotice() : "Freedom is reconnecting the live desktop link now.",
        error: null
      }));
      get().refresh().catch(() => undefined);
      scheduleReconnect(baseUrl, token, set, get);
    }
  };
  startRealtime().catch(() => undefined);
}

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let shouldReconnect = false;

function disconnectSocket(options?: { keepReconnectIntent?: boolean }): void {
  clearReconnectTimer();
  shouldReconnect = options?.keepReconnectIntent ?? false;
  if (!socket) {
    return;
  }
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  socket.close();
  socket = null;
}

function clearReconnectTimer(): void {
  if (!reconnectTimer) {
    return;
  }
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function scheduleReconnect(
  baseUrl: string,
  token: string,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  _get: () => AppState
): void {
  if (!shouldReconnect || reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;
  const delayMs = Math.min(10_000, 1_000 * 2 ** Math.min(reconnectAttempts - 1, 3));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shouldReconnect) {
      return;
    }
    connectSocket(baseUrl, token, set, _get);
  }, delayMs);
}

function applyStreamEvent(
  payload: StreamEvent,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState
): void {
  if (payload.type === "host_status") {
    const resolvedFreedomVoicePresetId = resolveSelectedFreedomVoicePresetId(get().selectedFreedomVoicePresetId, payload.hostStatus);
    set({
      hostStatus: payload.hostStatus,
      selectedFreedomVoicePresetId: resolvedFreedomVoicePresetId,
      wakeControl: payload.hostStatus.wakeControl,
      newSessionRootPath: get().newSessionRootPath || payload.hostStatus.host.approvedRoots[0] || ""
    });
    void persistSettings(get, {
      freedomVoicePresetId: resolvedFreedomVoicePresetId,
      wakeControl: payload.hostStatus.wakeControl
    }).catch(() => undefined);
    return;
  }

  if (payload.type === "session_upsert") {
    const voiceTargetSessionId = get().voiceTargetSessionId;
    const isVoiceTargetSession = voiceTargetSessionId !== null && payload.session.id === voiceTargetSessionId;
    set((state) => ({
      sessions: sortSessionsForDisplay([payload.session, ...state.sessions.filter((item) => item.id !== payload.session.id)]),
      renameDraftBySession: {
        ...state.renameDraftBySession,
        [payload.session.id]: payload.session.title
      },
      voiceSessionPhase:
        state.voiceSessionActive && isVoiceTargetSession && !isSessionBusy(payload.session) && state.voiceSessionPhase !== "review"
          ? state.voiceSessionPhase === "assistant-speaking"
            ? state.voiceSessionPhase
            : "listening"
          : state.voiceSessionPhase
    }));
    if (isVoiceTargetSession && payload.session.activeTurnId !== backendInterruptTurnId) {
      backendInterruptTurnId = null;
    }
    if (isVoiceTargetSession && !isSessionBusy(payload.session)) {
      voiceInterruptRequested = false;
      backendInterruptTurnId = null;
      maybeAutoSendVoiceResult(get, set).catch(() => undefined);
    }
    return;
  }

  const currentState = get();
  const isSelectedSession = currentState.selectedSessionId === payload.sessionId;
  const isVoiceTargetSession = currentState.voiceTargetSessionId === payload.sessionId;
  const pendingExternalRequest =
    isVoiceTargetSession && currentState.pendingExternalRequest?.sessionId === payload.sessionId ? currentState.pendingExternalRequest : null;
  const preparedExternalDraft =
    payload.message.role === "assistant" &&
    payload.message.status === "completed" &&
    pendingExternalRequest
      ? buildExternalDraftFromPendingRequest(
          pendingExternalRequest,
          payload.sessionId,
          payload.message.id,
          currentState.sessions.find((item) => item.id === payload.sessionId)?.title ?? FREEDOM_PRIMARY_SESSION_TITLE,
          payload.message.content
        )
      : null;
  let shouldDirectFallbackSpeak = false;

  set((state) => {
    const currentMessages = state.messagesBySession[payload.sessionId] ?? [];
    const nextMessages = [...currentMessages.filter((item) => item.id !== payload.message.id), payload.message].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
    const resolvedExternalDraft =
      payload.message.role === "assistant" &&
      payload.message.status === "completed" &&
      pendingExternalRequest
        ? preparedExternalDraft
        : state.externalDraft;
    const voiceSessionUsesDeviceSpeech = usesDeviceVoicePath(state) && isVoiceTargetSession;
    const voiceSessionUsesRealtimeSpeech = usesRealtimeVoicePath(state) && isVoiceTargetSession;
    const shouldVoiceSpeak =
      payload.message.role === "assistant" &&
      tts.isAvailable() &&
      (voiceSessionUsesDeviceSpeech || (state.autoSpeak && isSelectedSession && !voiceSessionUsesRealtimeSpeech));
    const speechQueued =
      shouldVoiceSpeak &&
      assistantSpeech.ingest(payload.message.id, payload.message.content, payload.message.status, VOICE_TTS_MIN_CHARS);
    shouldDirectFallbackSpeak = shouldDirectlyFallbackSpeech(payload.message, voiceSessionUsesDeviceSpeech, Boolean(speechQueued));
    const voiceTelemetry =
      payload.message.role === "assistant" &&
      payload.message.status === "completed" &&
      state.voiceSessionActive &&
      isVoiceTargetSession &&
      state.voiceTelemetry.lastHeardAt
        ? {
            ...state.voiceTelemetry,
            turnsCompleted: state.voiceTelemetry.turnsCompleted + 1,
            lastRoundTripMs: Date.now() - new Date(state.voiceTelemetry.lastHeardAt).getTime()
          }
        : state.voiceTelemetry;

    return {
      messagesBySession: {
        ...state.messagesBySession,
        [payload.sessionId]: nextMessages
      },
      externalDraft: resolvedExternalDraft,
      pendingExternalRequest:
        payload.message.role === "assistant" && payload.message.status !== "streaming" && pendingExternalRequest ? null : state.pendingExternalRequest,
      voiceAssistantDraft:
        payload.message.role === "assistant" && isVoiceTargetSession && voiceSessionUsesDeviceSpeech ? payload.message.content : state.voiceAssistantDraft,
      voiceSessionPhase:
        voiceSessionUsesDeviceSpeech && payload.message.role === "assistant"
          ? speechQueued
            ? "assistant-speaking"
            : payload.message.status === "streaming"
              ? "processing"
              : state.voiceSessionPhase === "review"
                ? state.voiceSessionPhase
                : "listening"
          : state.voiceSessionPhase,
      lastSpokenMessageId:
        shouldVoiceSpeak && payload.message.status === "completed" ? payload.message.id : state.lastSpokenMessageId,
      voiceTelemetry,
      notice:
        payload.message.role === "assistant" && payload.message.status === "completed" && pendingExternalRequest
          ? `Email draft ready for ${pendingExternalRequest.recipientDestination}. Say "yes, send it" or tap Send Email.`
          : payload.message.role === "assistant" &&
              pendingExternalRequest &&
              (payload.message.status === "failed" || payload.message.status === "interrupted")
            ? `The assistant reply was interrupted, so ${FREEDOM_RUNTIME_NAME} did not prepare the email draft.`
            : shouldDirectFallbackSpeak
              ? "Freedom replied, and the phone is retrying spoken playback directly."
            : state.notice
    };
  });

  if (shouldDirectFallbackSpeak) {
    tts.speak(payload.message.content);
  }

  if (preparedExternalDraft && pendingExternalRequest && get().voiceSessionActive && get().voiceTargetSessionId === payload.sessionId) {
    assistantSpeech.queuePrompt(buildExternalDraftConfirmationPrompt(pendingExternalRequest, preparedExternalDraft));
  }
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

async function ensureOperatorSession(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  options?: {
    token?: string | null;
    baseUrl?: string | null;
    hostStatus?: HostStatus | null;
    preferFreshIfBusy?: boolean;
  }
): Promise<ChatSession | null> {
  const existing = findOperatorSession(get().sessions);
  if (existing && !(options?.preferFreshIfBusy && isSessionBusy(existing))) {
    return existing;
  }

  const token = options?.token ?? get().token;
  const baseUrl = options?.baseUrl ?? get().baseUrl;
  const hostStatus = options?.hostStatus ?? get().hostStatus;
  const rootPath = get().newSessionRootPath || hostStatus?.host.approvedRoots[0];

  if (!token || !baseUrl || !rootPath) {
    return null;
  }

  const session = await api.createSession(token, baseUrl, {
    rootPath,
    title: OPERATOR_SESSION_TITLE,
    kind: "operator",
    originSurface: "mobile_companion"
  });

  set((state) => ({
    sessions: sortSessionsForDisplay([session, ...state.sessions.filter((item) => item.id !== session.id)]),
    selectedSessionId: state.selectedSessionId ?? session.id,
    renameDraftBySession: {
      ...state.renameDraftBySession,
      [session.id]: session.title
    },
    view: "chat",
    notice: `${FREEDOM_PRODUCT_NAME} is ready.`,
    error: null
  }));

  return session;
}

async function maybeAutoSendVoiceResult(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  if (!isQueuedVoiceAutoSendPending(get().autoSendVoice, get().composer, get().composerInputMode) || get().sendingMessage) {
    return;
  }

  try {
    await get().sendMessage();
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : "Voice captured, but the desktop could not send the message yet."
    });
  }
}

async function resolveVoiceTargetSessionId(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<string> {
  const existing = get().voiceTargetSessionId ?? get().selectedSessionId;
  if (existing) {
    const existingSession = get().sessions.find((session) => session.id === existing) ?? null;
    if (existingSession && !isSessionBusy(existingSession)) {
      return existing;
    }
  }

  const reusableIdleSession = sortSessionsForDisplay(get().sessions).find((session) => !isSessionBusy(session)) ?? null;
  if (reusableIdleSession) {
    return reusableIdleSession.id;
  }

  if (!get().token || get().offlineMode) {
    set({
      offlineMode: true,
      notice: "Freedom is opening a phone-only thread for this voice session.",
      error: null
    });
    return ensureStandaloneConversationSessionId(get, set);
  }

  if (existing) {
    set({
      notice: "The current chat is still busy, so Freedom is opening a fresh thread for voice.",
      error: null
    });
  }

  const token = requireValue(get().token, "Pair this phone with the desktop first.");
  const baseUrl = requireValue(get().baseUrl, "Desktop URL is required.");
  const operatorSession = await ensureOperatorSession(get, set, {
    token,
    baseUrl,
    hostStatus: get().hostStatus,
    preferFreshIfBusy: true
  });
  const sessionId = operatorSession?.id ?? pickPreferredSessionId(null, get().sessions);
  return requireValue(sessionId, "Open or start a chat before starting the voice loop.");
}

function shouldDirectlyFallbackSpeech(payload: ChatMessage, voiceSessionUsesDeviceSpeech: boolean, speechQueued: boolean): boolean {
  return (
    voiceSessionUsesDeviceSpeech &&
    payload.role === "assistant" &&
    payload.status === "completed" &&
    !speechQueued &&
    payload.content.trim().length > 0
  );
}

async function requestImmediateVoiceInterrupt(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): Promise<void> {
  if (usesRealtimeVoicePath(get())) {
    assistantSpeech.stop();
    try {
      await realtimeVoice.interrupt();
      set((state) => ({
        voiceSessionPhase: state.voiceMuted ? "muted" : "interrupted",
        notice: "Interrupt sent. Freedom should stop the current reply and hand the turn back to you.",
        error: null,
        voiceTelemetry: {
          ...state.voiceTelemetry,
          interruptions: state.voiceTelemetry.interruptions + 1
        }
      }));
    } catch (error) {
      set((state) => ({
        error: state.error ?? (error instanceof Error ? error.message : "Could not interrupt the realtime reply.")
      }));
    }
    return;
  }

  const token = get().token;
  const baseUrl = get().baseUrl;
  const sessionId = get().voiceTargetSessionId;
  const stoppedLocalSpeech = isVoiceAssistantActive(get);
  if (stoppedLocalSpeech) {
    assistantSpeech.stop();
    set((state) => ({
      voiceSessionPhase: state.voiceMuted ? "muted" : "interrupted",
      notice: "Interrupt heard. Freedom stopped speaking and is ready for your next turn.",
      error: null,
      voiceTelemetry: {
        ...state.voiceTelemetry,
        interruptions: state.voiceTelemetry.interruptions + 1
      }
    }));
    if (!get().voiceMuted) {
      ensureVoiceLoopListening(get, set).catch(() => undefined);
    }
  }
  if (!token || !baseUrl || !sessionId) {
    return;
  }

  const session = get().sessions.find((item) => item.id === sessionId) ?? null;
  const activeTurnId = session?.activeTurnId ?? null;
  if (!session || !isSessionBusy(session) || !activeTurnId || backendInterruptTurnId === activeTurnId) {
    return;
  }

  backendInterruptTurnId = activeTurnId;
  try {
    await api.stopSession(token, baseUrl, session.id);
    set((state) => ({
      voiceSessionPhase: state.voiceMuted ? "muted" : "interrupted",
      notice: "Interrupt sent. Freedom should stop the current reply and hand the turn back to you.",
      error: null,
      voiceTelemetry: stoppedLocalSpeech
        ? state.voiceTelemetry
        : {
            ...state.voiceTelemetry,
            interruptions: state.voiceTelemetry.interruptions + 1
          }
    }));
  } catch (error) {
    backendInterruptTurnId = null;
    set((state) => ({
      error: state.error ?? (error instanceof Error ? error.message : "Could not stop the current run quickly enough.")
    }));
  }
}

function isVoiceAssistantActive(get: () => AppState): boolean {
  const state = get();
  return Boolean(assistantSpeech.isActive() || state.voiceSessionPhase === "assistant-speaking");
}

async function handleStoreError(
  error: unknown,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  fallbackMessage: string
): Promise<void> {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (isPairingRepairErrorMessage(message)) {
    await enterRepairMode(set, get, pairingRepairMessage());
    return;
  }

  set((state) => ({
    notice: null,
    error: message || fallbackMessage,
    voiceSessionPhase: state.voiceSessionActive ? "error" : state.voiceSessionPhase
  }));
}

async function enterRepairMode(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  message: string
): Promise<void> {
  clearPendingVoiceTranscript();
  disconnectSocket();
  voice.stopStreamingSession();
  void realtimeVoice.stopSession();
  assistantSpeech.reset();
  tts.stop();
  unsubscribePushTokenRefresh?.();
  unsubscribePushTokenRefresh = null;
  await clearDeviceToken();
  set({
    token: null,
    hostStatus: null,
    buildLaneSummary: null,
    composer: "",
    composerInputMode: "text",
    newSessionRootPath: "",
    newSessionTitle: "",
    projectIntent: "",
    projectInstructions: "",
    projectOutputType: "implementation plan",
    projectTemplateId: "greenfield",
    refreshing: false,
    sendingMessage: false,
    realtimeConnected: false,
    offlineMode: get().sessions.length > 0,
    listening: false,
    voiceRuntimeMode: get().sessions.length > 0 ? getDisconnectedAssistantRuntimeMode() : prefersRealtimePrimaryVoice() ? "realtime_primary" : "device_fallback",
    voiceRuntimeBinding: null,
    voiceSessionActive: false,
    voiceTargetSessionId: null,
    voiceSessionPhase: "idle",
    liveTranscript: "",
    voiceAudioLevel: -2,
    voiceAssistantDraft: null,
    voiceTelemetry: defaultVoiceTelemetry(),
    lastSpokenMessageId: null,
    externalDraft: null,
    pendingExternalRequest: null,
    notice:
      get().sessions.length > 0
        ? "Saved desktop settings were kept. Cached chats and saved ideas are still available while you repair the link."
        : "Saved desktop settings were kept so you can repair this link quickly.",
    error: message,
    view: get().sessions.length > 0 ? "chat" : "pairing"
  });
  await persistOfflineSnapshot(get);
  voiceInterruptRequested = false;
  backendInterruptTurnId = null;
}

function syncPushTokenRefresh(
  baseUrl: string,
  token: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
): void {
  unsubscribePushTokenRefresh?.();
  unsubscribePushTokenRefresh = fcm.subscribeToTokenRefresh((pushToken) => {
    const currentDeviceId = get().currentDeviceId;
    if (!currentDeviceId) {
      return;
    }
    api
      .registerPushToken(token, baseUrl, currentDeviceId, { pushToken })
      .then((updatedDevice) => {
        set((state) => ({
          devices: state.devices.map((device) => (device.id === updatedDevice.id ? updatedDevice : device))
        }));
      })
      .catch(() => undefined);
  });
}
