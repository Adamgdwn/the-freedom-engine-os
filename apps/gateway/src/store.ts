import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createId, generatePairingCode, nowIso } from "@freedom/shared";
import { AccessToken } from "livekit-server-sdk";
import type {
  AuditEvent,
  AssistantVoiceProfile,
  ChatMessage,
  ChatSession,
  ConversationBuildLaneItem,
  ConversationBuildLaneSummary,
  CreateOutboundRecipientRequest,
  CreateSessionRequest,
  CreateVoiceRuntimeSessionRequest,
  DeferredExecutionState,
  GatewayOverview,
  HostAssistantDeltaRequest,
  HostAvailability,
  HostAuthState,
  HostCompleteTurnRequest,
  HostFailTurnRequest,
  HostHeartbeatRequest,
  HostInterruptTurnRequest,
  HostStartTurnRequest,
  HostStatus,
  HostWorkItem,
  InterruptType,
  MobileConnectionState,
  MobileVoiceState,
  NotificationEvent,
  NotificationPrefs,
  OfflineImportRequest,
  OfflineImportResponse,
  OutboundRecipient,
  PairingCompleteResponse,
  PairedDevice,
  PostMessageRequest,
  RecentSessionActivity,
  RegisterHostRequest,
  RegisterHostResponse,
  RegisterPushTokenRequest,
  RealtimeTicketResponse,
  SyncMobileConversationMemoriesRequest,
  SyncMobileConversationMemoriesResponse,
  RenameDeviceRequest,
  RepairState,
  RegisteredHost,
  RunState,
  SendExternalMessageRequest,
  SendExternalMessageResponse,
  SyncMobileLearningSignalsRequest,
  SyncMobileLearningSignalsResponse,
  StreamEvent,
  TaskItem,
  TailscaleStatus,
  UpdateHostVoiceProfileRequest,
  UpdateNotificationPrefsRequest,
  UpdateSessionRequest,
  VoiceRuntimeSessionResponse,
  WakeControl
} from "@freedom/shared";
import {
  FREEDOM_PRIMARY_SESSION_TITLE,
  FREEDOM_PRODUCT_NAME,
  getAssistantVoiceCatalogEntry,
  getModelRouterConfig,
  hasRunnableLocalDayToDay,
  isBuildLaneApprovalApproved,
  isBuildLaneApprovalPending,
  isPrimaryFreedomSessionTitle,
  parseProgrammingRequestReason,
  normalizeAssistantVoicePresetId
} from "@freedom/shared";
import { createEmailProvider, renderOutboundEmail, resolveOutboundEmailStatus } from "./outboundEmail.js";
import { resolveWakeControl } from "./wakeControl.js";

interface HostRecord extends RegisteredHost {
  auth: HostAuthState;
  tailscale: TailscaleStatus;
  hostToken: string;
  voiceProfile: AssistantVoiceProfile | null;
}

interface DeviceRecord extends PairedDevice {
  deviceToken: string;
}

interface SessionRecord extends ChatSession {
  claimedMessageId: string | null;
  stopClaimedAt: string | null;
}

interface TaskRecord extends TaskItem {
  claimedAt: string | null;
}

type OutboundRecipientRecord = OutboundRecipient;

interface VoiceRuntimeSessionRecord {
  roomName: string;
  hostId: string;
  deviceId: string;
  chatSessionId: string;
  voiceSessionId: string;
  participantIdentity: string;
  createdAt: string;
  expiresAt: string;
}

interface GatewayState {
  hosts: HostRecord[];
  devices: DeviceRecord[];
  sessions: SessionRecord[];
  tasks: TaskRecord[];
  messages: ChatMessage[];
  voiceRuntimeSessions: VoiceRuntimeSessionRecord[];
  outboundRecipients: OutboundRecipientRecord[];
  auditEvents: AuditEvent[];
}

interface DesktopShellState {
  overview: GatewayOverview;
  desktopSession: ChatSession | null;
  desktopMessages: ChatMessage[];
}

export interface MemoryDigest {
  configured: boolean;
  updatedAt: string;
  context: string;
}

interface ProgrammingRequestMemoryRow {
  id: string;
  capability: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TaskMemoryRow {
  topic: string;
  summary: string;
  status: string;
  updated_at: string;
}

interface LearningSignalMemoryRow {
  id?: string;
  topic: string;
  summary: string;
  kind: string;
  status: string;
  created_at?: string;
  updated_at: string;
}

interface ConversationMemoryRow {
  id?: string;
  topic: string;
  summary: string;
  category: "identity" | "preference" | "project" | "relationship" | "context";
  confidence: number;
  status: "observed" | "confirmed" | "active";
  source_session_id?: string | null;
  created_at?: string;
  updated_at: string;
}

interface PersonaOverlayMemoryRow {
  title: string;
  instruction: string;
  status: string;
  change_type: string;
  updated_at: string;
}

type Principal =
  | { kind: "host"; host: HostRecord }
  | { kind: "device"; host: HostRecord; device: DeviceRecord };

interface BroadcastEnvelope {
  hostId: string;
  event: StreamEvent;
}

interface RealtimeTicketRecord {
  hostId: string;
  expiresAt: string;
}

const defaultAuthState: HostAuthState = {
  status: "logged_out",
  detail: "Desktop host has not reported Freedom auth yet."
};

const defaultTailscaleStatus: TailscaleStatus = {
  installed: false,
  connected: false,
  detail: "Desktop host has not reported Freedom runtime network status yet.",
  dnsName: null,
  ipv4: null,
  suggestedUrl: null,
  transportSecurity: "insecure",
  installUrl: "https://tailscale.com/download",
  loginUrl: "https://login.tailscale.com/start"
};

const defaultNotificationPrefs: NotificationPrefs = {
  run_complete: true,
  run_failed: true,
  repair_needed: true,
  approval_needed: true
};

const INTERRUPT_RECLAIM_MS = 5_000;
const STALE_STOP_RECOVERY_MS = 20_000;
const STALE_QUEUE_CLAIM_MS = 15_000;
const DUPLICATE_VOICE_MESSAGE_WINDOW_MS = 3_000;
const HOST_ONLINE_WINDOW_MS = 15_000;
const HOST_RECONNECTING_WINDOW_MS = 60_000;
const MAX_PARALLEL_SESSION_TASKS = 2;
const DEFERRED_WRITE_MS = 200;
const MAX_WORK_WAIT_MS = 20_000;

const defaultState = (): GatewayState => ({
  hosts: [],
  devices: [],
  sessions: [],
  tasks: [],
  messages: [],
  voiceRuntimeSessions: [],
  outboundRecipients: [],
  auditEvents: []
});

export class GatewayStore {
  private readonly dataFile: string;
  private readonly exampleDataFile: string;
  private readonly events = new EventEmitter();
  private state: GatewayState | null = null;
  private readonly realtimeTickets = new Map<string, RealtimeTicketRecord>();
  private readonly workWaiters = new Map<string, Set<() => void>>();
  private pendingWriteTimer: NodeJS.Timeout | null = null;
  private flushInFlight: Promise<void> | null = null;

  constructor(private readonly dataDir: string) {
    this.dataFile = path.join(dataDir, "state.json");
    this.exampleDataFile = path.join(dataDir, "state.example.json");
  }

  onBroadcast(listener: (payload: BroadcastEnvelope) => void): () => void {
    this.events.on("broadcast", listener);
    return () => {
      this.events.off("broadcast", listener);
    };
  }

  async registerHost(input: RegisterHostRequest): Promise<RegisterHostResponse> {
    const state = await this.readState();
    const issuedAt = nowIso();
    let host =
      (input.hostId ? state.hosts.find((item) => item.id === input.hostId) : null) ??
      state.hosts.find((item) => item.hostName === input.hostName);

    if (!host) {
      const pairingCode = generatePairingCode();
      host = {
        id: createId("host"),
        hostName: input.hostName,
        approvedRoots: input.approvedRoots,
        pairingCode,
        pairingCodeIssuedAt: issuedAt,
        createdAt: issuedAt,
        lastSeenAt: issuedAt,
        isOnline: true,
        auth: defaultAuthState,
        tailscale: defaultTailscaleStatus,
        hostToken: createId("hosttoken"),
        voiceProfile: null
      };
      state.hosts.push(host);
    } else {
      host.approvedRoots = input.approvedRoots;
      host.pairingCode = host.pairingCode || generatePairingCode();
      host.pairingCodeIssuedAt = host.pairingCodeIssuedAt || issuedAt;
      host.lastSeenAt = issuedAt;
      host.isOnline = true;
      recoverOrphanedHostTasks(state, host.id, issuedAt);
      host.hostToken = createId("hosttoken");
      host.voiceProfile = host.voiceProfile ?? null;
    }

    this.addAuditEvent(state, {
      hostId: host.id,
      deviceId: null,
      sessionId: null,
      type: "host_registered",
      detail: host.hostName
    });
    await this.writeState(state);
    this.emitHostStatus(host);

    return {
      host: toPublicHost(host),
      hostToken: host.hostToken,
      pairingCode: host.pairingCode
    };
  }

  async completePairing(pairingCode: string, deviceName: string): Promise<PairingCompleteResponse> {
    const state = await this.readState();
    const host = state.hosts.find((item) => item.pairingCode === pairingCode);

    if (!host) {
      throw new Error("Pairing code not found.");
    }

    const now = nowIso();
    let device = state.devices.find((item) => item.hostId === host.id && item.deviceName === deviceName);

    if (!device) {
      device = {
        id: createId("device"),
        hostId: host.id,
        deviceName,
        pushToken: null,
        notificationPrefs: defaultNotificationPrefs,
        revokedAt: null,
        lastNotificationAt: null,
        repairCount: 0,
        repairedAt: null,
        createdAt: now,
        lastSeenAt: now,
        deviceToken: createId("devicetoken")
      };
      state.devices.push(device);
      this.recoverSiblingSessions(state, host, device);
      this.addAuditEvent(state, {
        hostId: host.id,
        deviceId: device.id,
        sessionId: null,
        type: "device_paired",
        detail: device.deviceName
      });
    } else {
      device.lastSeenAt = now;
      device.deviceToken = createId("devicetoken");
      device.revokedAt = null;
      device.repairCount += 1;
      device.repairedAt = now;
      this.addAuditEvent(state, {
        hostId: host.id,
        deviceId: device.id,
        sessionId: null,
        type: "device_repaired",
        detail: device.deviceName
      });
    }

    await this.writeState(state);
    this.emitHostStatus(host);

    return {
      deviceToken: device.deviceToken,
      device: toPublicDevice(device),
      host: toPublicHost(host)
    };
  }

  async getHostStatus(token: string): Promise<HostStatus> {
    const principal = await this.requirePrincipal(token);
    if (principal.kind === "device") {
      await this.touchDevice(principal.device);
      return this.buildHostStatus(principal.host.id);
    }
    return this.buildHostStatus(principal.host.id);
  }

  async getTokenHostId(token: string): Promise<string> {
    const principal = await this.requirePrincipal(token);
    return principal.host.id;
  }

  async getVoiceProfile(token: string): Promise<AssistantVoiceProfile> {
    const principal = await this.requireHost(token);
    return resolveHostVoiceProfile(principal.host);
  }

  async getBuildLaneSummary(token: string): Promise<ConversationBuildLaneSummary> {
    const principal = await this.requirePrincipal(token);
    return loadConversationBuildLaneSummary(principal.host.id);
  }

  async getMemoryDigest(token: string): Promise<MemoryDigest> {
    const principal = await this.requirePrincipal(token);
    const digest = await loadMemoryDigest(principal.host.id);
    const state = await this.readState();
    const derivedContext = buildStateConversationMemoryContext(state, principal.host.id);
    if (!derivedContext || digest.context.includes("Relationship memory:") || digest.context.includes("Conversation continuity:")) {
      return digest;
    }

    return {
      configured: digest.configured,
      updatedAt: digest.updatedAt,
      context: [derivedContext, digest.context].filter(Boolean).join("\n\n").trim()
    };
  }

  async syncMobileLearningSignals(
    token: string,
    input: SyncMobileLearningSignalsRequest
  ): Promise<SyncMobileLearningSignalsResponse> {
    const principal = await this.requireDevice(token);
    const signals = dedupeLearningSignalsForSync(input.signals ?? []);
    if (!signals.length) {
      return { configured: isProgrammingMemoryConfigured(), synced: 0, skipped: 0, syncedSignalIds: [] };
    }

    if (!isProgrammingMemoryConfigured()) {
      return {
        configured: false,
        synced: 0,
        skipped: signals.length,
        syncedSignalIds: []
      };
    }

    const syncedSignalIds = await upsertLearningSignals(signals);
    const synced = syncedSignalIds.length;
    const skipped = Math.max(0, signals.length - synced);

    const state = await this.readState();
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: null,
      type: "mobile_learning_synced",
      originSurface: "mobile_companion",
      detail: `Synced ${synced} learning signal${synced === 1 ? "" : "s"} from Freedom Anywhere${skipped ? ` (${skipped} skipped)` : ""}.`
    });
    await this.writeState(state);

    return {
      configured: true,
      synced,
      skipped,
      syncedSignalIds
    };
  }

  async syncMobileConversationMemories(
    token: string,
    input: SyncMobileConversationMemoriesRequest
  ): Promise<SyncMobileConversationMemoriesResponse> {
    const principal = await this.requireDevice(token);
    const memories = dedupeConversationMemoriesForSync(input.memories ?? []);
    if (!memories.length) {
      return { configured: isProgrammingMemoryConfigured(), synced: 0, skipped: 0, syncedMemoryIds: [] };
    }

    if (!isProgrammingMemoryConfigured()) {
      return {
        configured: false,
        synced: 0,
        skipped: memories.length,
        syncedMemoryIds: []
      };
    }

    const syncedMemoryIds = await upsertConversationMemories(memories);
    const synced = syncedMemoryIds.length;
    const skipped = Math.max(0, memories.length - synced);

    const state = await this.readState();
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: null,
      type: "mobile_learning_synced",
      originSurface: "mobile_companion",
      detail: `Synced ${synced} conversation memor${synced === 1 ? "y" : "ies"} from Freedom Anywhere${skipped ? ` (${skipped} skipped)` : ""}.`
    });
    await this.writeState(state);

    return {
      configured: true,
      synced,
      skipped,
      syncedMemoryIds
    };
  }

  async updateVoiceProfile(token: string, input: UpdateHostVoiceProfileRequest): Promise<AssistantVoiceProfile> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const host = state.hosts.find((item) => item.id === principal.host.id);
    if (!host) {
      throw new Error("Host not found.");
    }

    if (input.resetToDefault) {
      host.voiceProfile = null;
      this.addAuditEvent(state, {
        hostId: host.id,
        deviceId: null,
        sessionId: null,
        type: "voice_profile_reset",
        detail: null
      });
    } else {
      const baseline = resolveHostVoiceProfile(host);
      const targetVoice = normalizeAssistantVoicePresetId(input.targetVoice ?? baseline.targetVoice);
      const catalog = getAssistantVoiceCatalogEntry(targetVoice);
      host.voiceProfile = {
        targetVoice,
        displayName: catalog.label,
        gender: input.gender ?? baseline.gender,
        accent: normalizeOptionalPreference(input.accent, baseline.accent),
        tone: normalizeOptionalPreference(input.tone, baseline.tone),
        warmth: input.warmth ?? baseline.warmth,
        pace: input.pace ?? baseline.pace,
        notes: normalizeOptionalPreference(input.notes, baseline.notes),
        source: "conversation",
        updatedAt: nowIso()
      };
      this.addAuditEvent(state, {
        hostId: host.id,
        deviceId: null,
        sessionId: null,
        type: "voice_profile_updated",
        detail: summarizeHostVoiceProfile(host.voiceProfile)
      });
    }

    await this.writeState(state);
    this.emitHostStatus(host);
    return resolveHostVoiceProfile(host);
  }

  async createRealtimeTicket(token: string): Promise<RealtimeTicketResponse> {
    const principal = await this.requirePrincipal(token);
    const ticket = createId("realtime");
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    this.realtimeTickets.set(ticket, {
      hostId: principal.host.id,
      expiresAt
    });
    return { ticket, expiresAt };
  }

  async createVoiceRuntimeSession(
    token: string,
    input: CreateVoiceRuntimeSessionRequest,
  ): Promise<VoiceRuntimeSessionResponse> {
    const principal = await this.requireDevice(token);
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = process.env.LIVEKIT_URL?.trim();

    if (!apiKey || !apiSecret || !wsUrl) {
      throw new Error("Realtime voice is not configured on this desktop yet.");
    }

    const voiceSessionId = input.voiceSessionId.trim().toLowerCase();
    if (!/^voice-mobile-[a-z0-9-]{8,}$/.test(voiceSessionId)) {
      throw new Error("Voice session id is invalid.");
    }

    const chatSession = await this.requireSessionForDevice(input.chatSessionId.trim(), principal.device.id);
    const state = await this.readState();
    const roomName = `${principal.host.id}-${voiceSessionId}`;
    const participantIdentity = `voice-mobile-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 120_000).toISOString();
    const router = getModelRouterConfig();
    const accessToken = new AccessToken(apiKey, apiSecret, {
      ttl: "2m",
      identity: participantIdentity,
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    state.voiceRuntimeSessions = [
      ...state.voiceRuntimeSessions.filter((item) => item.roomName !== roomName && new Date(item.expiresAt).getTime() > Date.now() - 300_000),
      {
        roomName,
        hostId: principal.host.id,
        deviceId: principal.device.id,
        chatSessionId: chatSession.id,
        voiceSessionId,
        participantIdentity,
        createdAt: nowIso(),
        expiresAt,
      },
    ];
    await this.writeState(state);

    return {
      token: await accessToken.toJwt(),
      wsUrl,
      roomName,
      participantIdentity,
      expiresAt,
      binding: {
        voiceSessionId,
        chatSessionId: chatSession.id,
        assistantName: input.assistantName?.trim() || FREEDOM_PRODUCT_NAME,
        model: router.voiceRuntimeModel,
        runtimeMode: "realtime_primary",
        transport: "livekit_webrtc",
        roomName,
        participantIdentity,
        degraded: false,
      },
    };
  }

  async getVoiceRuntimeBootstrap(token: string, roomName: string): Promise<{
    roomName: string;
    chatSessionId: string;
    sessionTitle: string;
    recentMessages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
  }> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const binding = state.voiceRuntimeSessions.find((item) => item.roomName === roomName && item.hostId === principal.host.id);
    if (!binding) {
      throw new Error("Voice runtime session not found.");
    }

    const session = this.requireSessionForHostState(state, binding.chatSessionId, principal.host.id);
    const recentMessages = state.messages
      .filter(
        (item) =>
          item.sessionId === session.id &&
          (item.role === "user" || item.role === "assistant") &&
          item.status === "completed" &&
          item.content.trim()
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(-10)
      .map((item): { id: string; role: "user" | "assistant"; content: string; createdAt: string } => ({
        id: item.id,
        role: item.role === "user" ? "user" : "assistant",
        content: item.content.trim(),
        createdAt: item.createdAt,
      }));

    return {
      roomName,
      chatSessionId: session.id,
      sessionTitle: session.title,
      recentMessages,
    };
  }

  async appendVoiceRuntimeTranscript(
    token: string,
    input: {
      roomName: string;
      messageId: string;
      role: "user" | "assistant";
      text: string;
    }
  ): Promise<ChatMessage> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const binding = state.voiceRuntimeSessions.find((item) => item.roomName === input.roomName && item.hostId === principal.host.id);
    if (!binding) {
      throw new Error("Voice runtime session not found.");
    }

    const session = this.requireSessionForHostState(state, binding.chatSessionId, principal.host.id);
    const normalizedText = input.text.trim();
    if (!normalizedText) {
      throw new Error("Transcript text is required.");
    }

    const existing = state.messages.find((item) => item.id === input.messageId && item.sessionId === session.id);
    if (existing) {
      return existing;
    }

    const message: ChatMessage = {
      id: input.messageId,
      sessionId: session.id,
      role: input.role,
      content: normalizedText,
      status: "completed",
      errorMessage: null,
      inputMode: "voice",
      responseStyle: null,
      transcriptPolished: input.role === "user",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    state.messages.push(message);
    session.lastPreview = truncatePreview(normalizedText);
    session.lastActivityAt = message.updatedAt;
    session.updatedAt = message.updatedAt;

    if (message.role === "assistant") {
      await promoteConversationMemoriesForSession(session, state.messages.filter((item) => item.sessionId === session.id));
    }
    await this.writeState(state, { defer: true });
    this.emitMessage(principal.host.id, message);
    this.emitSession(session);
    return message;
  }

  async consumeRealtimeTicket(ticket: string): Promise<string> {
    const record = this.realtimeTickets.get(ticket);
    if (!record) {
      throw new Error("Realtime ticket not found.");
    }
    this.realtimeTickets.delete(ticket);
    if (Date.now() >= new Date(record.expiresAt).getTime()) {
      throw new Error("Realtime ticket expired.");
    }
    return record.hostId;
  }

  async heartbeat(token: string, input: HostHeartbeatRequest): Promise<HostStatus> {
    const principal = await this.requireHost(token);
    principal.host.lastSeenAt = nowIso();
    principal.host.isOnline = true;
    principal.host.auth = input.auth;
    principal.host.tailscale = input.tailscale;
    await this.writeState(await this.readState());
    this.emitHostStatus(principal.host);
    return this.buildHostStatus(principal.host.id);
  }

  async listDevices(token: string): Promise<PairedDevice[]> {
    const principal = await this.requireDevice(token);
    await this.touchDevice(principal.device);
    return (await this.readState()).devices
      .filter((item) => item.hostId === principal.host.id && !item.revokedAt)
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .map(toPublicDevice);
  }

  async renameDevice(token: string, deviceId: string, input: RenameDeviceRequest): Promise<PairedDevice> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const device = state.devices.find((item) => item.id === deviceId && item.hostId === principal.host.id && !item.revokedAt);
    if (!device) {
      throw new Error("Device not found.");
    }
    device.deviceName = input.deviceName.trim();
    device.lastSeenAt = nowIso();
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: device.id,
      sessionId: null,
      type: "device_renamed",
      detail: device.deviceName
    });
    await this.writeState(state);
    this.emitHostStatus(principal.host);
    return toPublicDevice(device);
  }

  async revokeDevice(token: string, deviceId: string): Promise<PairedDevice> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const device = state.devices.find((item) => item.id === deviceId && item.hostId === principal.host.id && !item.revokedAt);
    if (!device) {
      throw new Error("Device not found.");
    }
    device.revokedAt = nowIso();
    device.deviceToken = createId("revoked");
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: device.id,
      sessionId: null,
      type: "device_revoked",
      detail: device.deviceName
    });
    await this.writeState(state);
    this.emitHostStatus(principal.host);
    return toPublicDevice(device);
  }

  async registerPushToken(token: string, deviceId: string, input: RegisterPushTokenRequest): Promise<PairedDevice> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const device = state.devices.find((item) => item.id === deviceId && item.hostId === principal.host.id && !item.revokedAt);
    if (!device) {
      throw new Error("Device not found.");
    }
    device.pushToken = input.pushToken.trim();
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: device.id,
      sessionId: null,
      type: "push_token_registered",
      detail: device.deviceName
    });
    await this.writeState(state);
    return toPublicDevice(device);
  }

  async updateNotificationPrefs(
    token: string,
    deviceId: string,
    input: UpdateNotificationPrefsRequest
  ): Promise<PairedDevice> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const device = state.devices.find((item) => item.id === deviceId && item.hostId === principal.host.id && !item.revokedAt);
    if (!device) {
      throw new Error("Device not found.");
    }
    device.notificationPrefs = input;
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: device.id,
      sessionId: null,
      type: "notification_prefs_updated",
      detail: device.deviceName
    });
    await this.writeState(state);
    return toPublicDevice(device);
  }

  async sendTestNotification(token: string, deviceId: string, event: NotificationEvent): Promise<{ ok: true; deviceId: string }> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const device = state.devices.find((item) => item.id === deviceId && item.hostId === principal.host.id && !item.revokedAt);
    if (!device) {
      throw new Error("Device not found.");
    }
    await this.sendNotification(state, principal.host.id, device, event, "Freedom test notification");
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: device.id,
      sessionId: null,
      type: "notification_test_sent",
      detail: event
    });
    await this.writeState(state);
    return { ok: true, deviceId };
  }

  async listOutboundRecipients(token: string): Promise<OutboundRecipient[]> {
    const principal = await this.requireDevice(token);
    await this.touchDevice(principal.device);
    return (await this.readState()).outboundRecipients
      .filter((item) => item.hostId === principal.host.id)
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((item) => ({ ...item }));
  }

  async createOutboundRecipient(token: string, input: CreateOutboundRecipientRequest): Promise<OutboundRecipient> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const label = input.label.trim();
    const destination = input.destination.trim().toLowerCase();
    if (!label) {
      throw new Error("Recipient label is required.");
    }
    if (
      state.outboundRecipients.some(
        (item) => item.hostId === principal.host.id && item.destination.toLowerCase() === destination
      )
    ) {
      throw new Error("That email recipient already exists.");
    }

    const recipient: OutboundRecipientRecord = {
      id: createId("recipient"),
      hostId: principal.host.id,
      label,
      channel: "email",
      destination,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.outboundRecipients.push(recipient);
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: null,
      type: "outbound_recipient_added",
      detail: `${recipient.label} <${recipient.destination}>`
    });
    await this.writeState(state);
    this.emitHostStatus(principal.host);
    return { ...recipient };
  }

  async deleteOutboundRecipient(token: string, recipientId: string): Promise<{ ok: true; deletedRecipientId: string }> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const recipient = state.outboundRecipients.find((item) => item.id === recipientId && item.hostId === principal.host.id);
    if (!recipient) {
      throw new Error("Recipient not found.");
    }

    state.outboundRecipients = state.outboundRecipients.filter((item) => item.id !== recipientId);
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: null,
      type: "outbound_recipient_deleted",
      detail: `${recipient.label} <${recipient.destination}>`
    });
    await this.writeState(state);
    this.emitHostStatus(principal.host);
    return { ok: true, deletedRecipientId: recipientId };
  }

  async sendExternalMessage(token: string, input: SendExternalMessageRequest): Promise<SendExternalMessageResponse> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const provider = createEmailProvider(process.env);
    const outboundStatus = resolveOutboundEmailStatus(
      process.env,
      state.outboundRecipients.filter((item) => item.hostId === principal.host.id).length
    );
    if (!provider || !outboundStatus.enabled || !outboundStatus.fromAddress) {
      throw new Error("Outbound email is not configured on this desktop yet.");
    }

    const session = state.sessions.find((item) => item.id === input.sessionId && item.hostId === principal.host.id);
    if (!session) {
      throw new Error("Chat not found.");
    }

    const message = state.messages.find((item) => item.id === input.messageId && item.sessionId === session.id);
    if (!message || message.role !== "assistant" || message.status !== "completed") {
      throw new Error("Select a completed assistant message before sending externally.");
    }

    const recipient =
      (input.recipientId
        ? state.outboundRecipients.find((item) => item.id === input.recipientId && item.hostId === principal.host.id)
        : null) ??
      (input.recipientDestination
        ? {
            id: createId("recipient"),
            hostId: principal.host.id,
            label: input.recipientLabel?.trim() || input.recipientDestination.trim(),
            channel: "email" as const,
            destination: input.recipientDestination.trim(),
            createdAt: nowIso(),
            updatedAt: nowIso()
          }
        : null);
    if (!recipient) {
      throw new Error("Recipient not found.");
    }

    const rendered = renderOutboundEmail({
      subject: input.subject.trim(),
      intro: input.intro?.trim() ?? "",
      messageContent: message.content,
      sessionTitle: session.title,
      hostName: principal.host.hostName
    });
    let delivery: Awaited<ReturnType<typeof provider.send>>;
    try {
      delivery = await provider.send({
        from: outboundStatus.fromAddress,
        to: recipient.destination,
        replyTo: outboundStatus.replyToAddress,
        subject: input.subject.trim(),
        text: rendered.text,
        html: rendered.html
      });
    } catch (error) {
      this.addAuditEvent(state, {
        hostId: principal.host.id,
        deviceId: principal.device.id,
        sessionId: session.id,
        type: "external_delivery_failed",
        detail: `${recipient.destination}:${error instanceof Error ? error.message : "unknown_error"}`
      });
      await this.writeState(state);
      throw error;
    }
    const deliveredAt = nowIso();
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: session.id,
      type: "external_delivery_sent",
      detail: `${recipient.destination}:${delivery.provider}:${delivery.deliveryId}`
    });
    await this.writeState(state);
    return {
      ok: true,
      deliveryId: delivery.deliveryId,
      recipient: { ...recipient },
      channel: recipient.channel,
      deliveredAt
    };
  }

  async listSessions(token: string): Promise<ChatSession[]> {
    const principal = await this.requireDevice(token);
    await this.touchDevice(principal.device);
    return (await this.readState()).sessions
      .filter((item) => item.deviceId === principal.device.id && !item.archived)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toPublicSession);
  }

  async createSession(token: string, input: CreateSessionRequest): Promise<ChatSession> {
    const principal = await this.requireDevice(token);
    const state = await this.readState();
    const rootPath = input.rootPath ?? principal.host.approvedRoots[0];

    if (!principal.host.approvedRoots.includes(rootPath)) {
      throw new Error("Requested root is not approved for this host.");
    }

    const now = nowIso();
    const existingCount = state.sessions.filter((item) => item.deviceId === principal.device.id).length;
    const sessionId = createId("session");
    const session: SessionRecord = {
      id: sessionId,
      hostId: principal.host.id,
      deviceId: principal.device.id,
      title:
        input.title?.trim() ||
        (input.kind === "operator" ? FREEDOM_PRIMARY_SESSION_TITLE : `Chat ${existingCount + 1}`),
      kind: input.kind ?? "project",
      pinned: input.kind === "operator",
      archived: false,
      rootPath,
      threadId: null,
      status: "idle",
      identity: buildSessionIdentity({
        sessionId,
        originSurface: input.originSurface ?? "mobile_companion",
        workspaceContext: rootPath
      }),
      activeTurnId: null,
      stopRequested: false,
      lastError: null,
      lastPreview: input.starterPrompt?.trim() || null,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
      claimedMessageId: null,
      stopClaimedAt: null
    };

    state.sessions.push(session);
    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: session.id,
      type: "session_created",
      originSurface: session.identity.originSurface,
      auditCorrelationId: session.identity.auditCorrelationId,
      detail: `${session.kind}:${session.title}`
    });
    await this.writeState(state);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async updateSession(token: string, sessionId: string, input: UpdateSessionRequest): Promise<ChatSession> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);
    const state = await this.readState();
    const targetSession = state.sessions.find((item) => item.id === session.id);
    if (!targetSession) {
      throw new Error("Session not found.");
    }

    targetSession.title = input.title.trim();
    targetSession.updatedAt = nowIso();

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: targetSession.id,
      type: "session_renamed",
      detail: targetSession.title
    });
    await this.writeState(state);
    this.emitSession(targetSession);
    return toPublicSession(targetSession);
  }

  async deleteSession(token: string, sessionId: string): Promise<{ ok: true; deletedSessionId: string }> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);
    const state = await this.readState();

    state.sessions = state.sessions.filter((item) => item.id !== session.id);
    state.messages = state.messages.filter((item) => item.sessionId !== session.id);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: session.id,
      type: "session_deleted",
      detail: session.title
    });
    await this.writeState(state);
    return { ok: true, deletedSessionId: session.id };
  }

  async listMessages(token: string, sessionId: string): Promise<ChatMessage[]> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);
    return (await this.readState()).messages
      .filter((item) => item.sessionId === session.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async postMessage(token: string, sessionId: string, input: PostMessageRequest): Promise<ChatMessage> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);

    const state = await this.readState();
    const now = nowIso();
    const targetSession = state.sessions.find((item) => item.id === session.id);
    if (!targetSession) {
      throw new Error("Session not found.");
    }
    const recentDuplicateVoiceMessage = findRecentDuplicateVoiceMessage(state, session.id, input);
    if (recentDuplicateVoiceMessage) {
      return recentDuplicateVoiceMessage;
    }
    const message: ChatMessage = {
      id: createId("msg"),
      sessionId: session.id,
      role: "user",
      content: input.text.trim(),
      status: "pending",
      errorMessage: null,
      inputMode: input.inputMode ?? "text",
      responseStyle: input.responseStyle ?? "natural",
      transcriptPolished: input.transcriptPolished ?? false,
      createdAt: now,
      updatedAt: now
    };

    state.messages.push(message);
    targetSession.lastError = null;
    targetSession.lastPreview = truncatePreview(input.text.trim());
    targetSession.lastActivityAt = now;

    const activeTasks = listSessionTasks(state, session.id).filter(isTaskRunning);
    const interruptType = classifyInterruptType(message.content, activeTasks);

    if (interruptType === "stop_task") {
      message.status = "completed";
      message.updatedAt = now;
      message.errorMessage = null;
      requestStopForSessionTasks(state, session.id, "Stopped by a newer Freedom command.");

      const assistantMessage: ChatMessage = {
        id: createId("msg"),
        sessionId: session.id,
        role: "assistant",
        content: "Stopping the current task now.",
        status: "completed",
        errorMessage: null,
        inputMode: null,
        responseStyle: null,
        transcriptPolished: null,
        createdAt: now,
        updatedAt: now
      };
      state.messages.push(assistantMessage);
      syncSessionFromTasks(state, targetSession);

      this.addAuditEvent(state, {
        hostId: principal.host.id,
        deviceId: principal.device.id,
        sessionId: targetSession.id,
        type: "message_posted",
        detail: `${input.inputMode ?? "text"}:${input.responseStyle ?? "natural"}:${interruptType}`
      });
      await promoteConversationMemoriesForSession(targetSession, state.messages.filter((item) => item.sessionId === targetSession.id));
      await this.writeState(state);
      this.emitMessage(principal.host.id, message);
      this.emitMessage(principal.host.id, assistantMessage);
      this.emitSession(targetSession);
      return message;
    }

    const readOnly = inferTaskReadOnly(message.content);
    const task: TaskRecord = {
      id: createId("task"),
      sessionId: session.id,
      userMessageId: message.id,
      assistantMessageId: null,
      title: truncatePreview(message.content),
      status: "queued",
      priority: deriveTaskPriority(interruptType),
      origin: interruptType ? "interrupt" : "user_message",
      parentTaskId: activeTasks[0]?.id ?? null,
      canRunInParallel: interruptType === "parallel_subtask" || interruptType === "quick_question" || interruptType === "clarification",
      interruptType,
      threadId: activeTasks[0]?.threadId ?? targetSession.threadId,
      turnId: null,
      resumeContext: activeTasks[0]?.title ?? null,
      toolState: null,
      resourceKey: targetSession.rootPath,
      readOnly,
      stopRequested: false,
      interruptClaimedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      claimedAt: null
    };

    if (interruptType === "replace_task") {
      requestStopForSessionTasks(state, session.id, "Replaced by a newer Freedom task.");
    }

    state.tasks.push(task);
    syncSessionFromTasks(state, targetSession);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: targetSession.id,
      type: "message_posted",
      detail: `${input.inputMode ?? "text"}:${input.responseStyle ?? "natural"}:${interruptType ?? "fresh_task"}`
    });
    await this.writeState(state);
    this.emitMessage(principal.host.id, message);
    this.emitSession(targetSession);
    return message;
  }

  async importOfflineSession(token: string, sessionId: string, input: OfflineImportRequest): Promise<OfflineImportResponse> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);
    const state = await this.readState();
    const targetSession = state.sessions.find((item) => item.id === session.id);
    if (!targetSession) {
      throw new Error("Session not found.");
    }

    const summaryRequestId = `${input.clientImportId.trim()}:summary`;
    const draftsRequestId = `${input.clientImportId.trim()}:drafts`;
    const existingMessages = state.messages.filter(
      (item) =>
        item.sessionId === session.id &&
        item.role === "system" &&
        (item.clientRequestId === summaryRequestId || item.clientRequestId === draftsRequestId)
    );
    if (existingMessages.length === 2) {
      return {
        session: toPublicSession(targetSession),
        messages: existingMessages.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
        imported: false
      };
    }

    const baseTime = Date.now();
    const summaryCreatedAt = new Date(baseTime).toISOString();
    const draftsCreatedAt = new Date(baseTime + 1).toISOString();
    const importedMessages: ChatMessage[] = [];
    const summaryMessage =
      existingMessages.find((item) => item.clientRequestId === summaryRequestId) ??
      ({
        id: createId("msg"),
        sessionId: session.id,
        role: "system",
        content: `[Mobile offline ideation summary]\n${input.summary.trim()}`,
        status: "completed",
        errorMessage: null,
        clientRequestId: summaryRequestId,
        inputMode: null,
        responseStyle: null,
        transcriptPolished: null,
        createdAt: summaryCreatedAt,
        updatedAt: summaryCreatedAt
      } satisfies ChatMessage);

    const draftTurnsMessage =
      existingMessages.find((item) => item.clientRequestId === draftsRequestId) ??
      ({
        id: createId("msg"),
        sessionId: session.id,
        role: "system",
        content: `[Mobile offline draft turns]\n${input.draftTurns.map((turn, index) => `${index + 1}. ${turn.trim()}`).join("\n")}`,
        status: "completed",
        errorMessage: null,
        clientRequestId: draftsRequestId,
        inputMode: null,
        responseStyle: null,
        transcriptPolished: null,
        createdAt: draftsCreatedAt,
        updatedAt: draftsCreatedAt
      } satisfies ChatMessage);

    for (const message of [summaryMessage, draftTurnsMessage]) {
      if (!state.messages.some((item) => item.id === message.id)) {
        state.messages.push(message);
      }
      importedMessages.push(message);
    }

    targetSession.lastError = null;
    targetSession.lastPreview = truncatePreview(input.summary.trim());
    targetSession.lastActivityAt = draftsCreatedAt;
    targetSession.updatedAt = draftsCreatedAt;

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: targetSession.id,
      type: "offline_imported",
      detail: `${input.source}:${input.draftTurns.length}`
    });
    await promoteConversationMemoriesForSession(targetSession, state.messages.filter((item) => item.sessionId === targetSession.id));
    await this.writeState(state);
    for (const message of importedMessages) {
      this.emitMessage(principal.host.id, message);
    }
    this.emitSession(targetSession);
    return {
      session: toPublicSession(targetSession),
      messages: importedMessages.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      imported: true
    };
  }

  async stopSession(token: string, sessionId: string): Promise<ChatSession> {
    const principal = await this.requireDevice(token);
    const session = await this.requireSessionForDevice(sessionId, principal.device.id);
    const state = await this.readState();
    const targetSession = state.sessions.find((item) => item.id === session.id);
    if (!targetSession) {
      throw new Error("Session not found.");
    }

    requestStopForSessionTasks(state, session.id, "Cancelled before Freedom started running.");
    syncSessionFromTasks(state, targetSession);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: principal.device.id,
      sessionId: targetSession.id,
      type: "stop_requested",
      detail: targetSession.title
    });
    await this.writeState(state);
    this.emitSession(targetSession);
    return toPublicSession(targetSession);
  }

  async getNextWork(
    token: string,
    options?: {
      waitMs?: number;
      acceptQueued?: boolean;
    },
  ): Promise<HostWorkItem | null> {
    const principal = await this.requireHost(token);
    const tryReadWork = async (): Promise<HostWorkItem | null> => {
      const state = await this.readState();
      const interruptTask = state.tasks.find((task) => {
        if (!task.turnId || !task.stopRequested || !isTaskRunning(task)) {
          return false;
        }
        const session = state.sessions.find((item) => item.id === task.sessionId);
        return Boolean(
          session &&
            session.hostId === principal.host.id &&
            (!task.interruptClaimedAt || isInterruptClaimStale(task.interruptClaimedAt))
        );
      });
      if (interruptTask) {
        interruptTask.interruptClaimedAt = nowIso();
        const interruptSession = this.requireSessionForHostState(state, interruptTask.sessionId, principal.host.id);
        syncSessionFromTasks(state, interruptSession);
        await this.writeState(state);
        return {
          type: "interrupt",
          session: toPublicSession(interruptSession),
          task: toPublicTask(interruptTask),
          turnId: interruptTask.turnId ?? ""
        };
      }

      if (options?.acceptQueued === false) {
        return null;
      }

      const runningTasks = state.tasks.filter((task) => {
        if (!isTaskRunning(task)) {
          return false;
        }
        const session = state.sessions.find((item) => item.id === task.sessionId);
        return Boolean(session && session.hostId === principal.host.id);
      });

      const queuedTask = state.tasks.find((task) => {
        if (task.status !== "queued" || task.claimedAt) {
          return false;
        }
        const session = state.sessions.find((item) => item.id === task.sessionId);
        if (!session || session.hostId !== principal.host.id) {
          return false;
        }
        const relatedRunningTasks = runningTasks.filter((item) => item.resourceKey === task.resourceKey);
        const sessionRunningTasks = runningTasks.filter((item) => item.sessionId === task.sessionId);
        return (
          sessionRunningTasks.length < MAX_PARALLEL_SESSION_TASKS &&
          canRunTaskInParallel(task, relatedRunningTasks)
        );
      });
      if (!queuedTask) {
        return null;
      }

      const message = state.messages.find((item) => item.id === queuedTask.userMessageId && item.sessionId === queuedTask.sessionId);
      const queuedSession = this.requireSessionForHostState(state, queuedTask.sessionId, principal.host.id);
      if (!message) {
        markQueuedTaskCancelled(state, queuedTask, "Dropped because the linked user message no longer exists.");
        syncSessionFromTasks(state, queuedSession);
        await this.writeState(state);
        this.emitSession(queuedSession);
        return null;
      }

      queuedTask.claimedAt = nowIso();
      queuedTask.updatedAt = queuedTask.claimedAt;
      syncSessionFromTasks(state, queuedSession);
      await this.writeState(state);
      return {
        type: "message",
        session: toPublicSession(queuedSession),
        message,
        task: toPublicTask(queuedTask)
      };
    };

    const immediate = await tryReadWork();
    if (immediate) {
      return immediate;
    }

    const waitMs = Math.max(0, Math.min(MAX_WORK_WAIT_MS, options?.waitMs ?? 0));
    if (!waitMs) {
      return null;
    }

    await this.waitForWork(principal.host.id, waitMs);
    return tryReadWork();
  }

  async startTurn(token: string, input: HostStartTurnRequest): Promise<ChatSession> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const session = this.requireSessionForHostState(state, input.sessionId, principal.host.id);
    const userMessage = this.requireMessage(state, input.userMessageId, input.sessionId);
    const task = input.taskId
      ? findTaskForHostState(state, input.taskId, principal.host.id)
      : state.tasks.find((item) => item.sessionId === input.sessionId && item.userMessageId === input.userMessageId && item.status === "queued");
    if (!task) {
      throw new Error("Task not found.");
    }

    userMessage.status = "completed";
    userMessage.updatedAt = nowIso();
    userMessage.errorMessage = null;

    const assistantMessage: ChatMessage = {
      id: input.assistantMessageId,
      sessionId: input.sessionId,
      role: "assistant",
      content: "",
      status: "streaming",
      errorMessage: null,
      inputMode: null,
      responseStyle: null,
      transcriptPolished: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    task.assistantMessageId = input.assistantMessageId;
    task.threadId = input.threadId;
    task.turnId = input.turnId;
    task.status = "running";
    task.claimedAt = null;
    task.stopRequested = false;
    task.interruptClaimedAt = null;
    task.lastError = null;
    task.updatedAt = nowIso();
    session.lastError = null;
    session.lastPreview = truncatePreview(userMessage.content);
    state.messages.push(assistantMessage);
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: session.deviceId,
      sessionId: session.id,
      type: "run_started",
      detail: input.turnId
    });
    await this.writeState(state);
    this.emitMessage(principal.host.id, userMessage);
    this.emitMessage(principal.host.id, assistantMessage);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async appendAssistantDelta(token: string, input: HostAssistantDeltaRequest): Promise<ChatMessage> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const session = this.requireSessionForHostState(state, input.sessionId, principal.host.id);
    const assistantMessage = this.requireMessage(state, input.assistantMessageId, session.id);
    const task =
      (input.taskId ? findTaskForHostState(state, input.taskId, principal.host.id) : null) ??
      state.tasks.find((item) => item.sessionId === session.id && item.assistantMessageId === input.assistantMessageId) ??
      null;

    assistantMessage.content += input.delta;
    assistantMessage.updatedAt = nowIso();
    session.lastPreview = truncatePreview(assistantMessage.content);
    session.lastActivityAt = assistantMessage.updatedAt;
    if (task) {
      task.updatedAt = assistantMessage.updatedAt;
    }

    await this.writeState(state, { defer: true });
    this.emitMessage(principal.host.id, assistantMessage);
    return assistantMessage;
  }

  async completeTurn(token: string, input: HostCompleteTurnRequest): Promise<ChatSession> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const session = this.requireSessionForHostState(state, input.sessionId, principal.host.id);
    const assistantMessage = this.requireMessage(state, input.assistantMessageId, session.id);
    const task =
      (input.taskId ? findTaskForHostState(state, input.taskId, principal.host.id) : null) ??
      state.tasks.find((item) => item.sessionId === session.id && item.assistantMessageId === input.assistantMessageId) ??
      null;
    if (!task) {
      throw new Error("Task not found.");
    }

    assistantMessage.status = "completed";
    assistantMessage.updatedAt = nowIso();
    assistantMessage.errorMessage = null;

    task.threadId = input.threadId;
    task.turnId = input.turnId;
    task.status = "completed";
    task.stopRequested = false;
    task.claimedAt = null;
    task.interruptClaimedAt = null;
    task.lastError = null;
    task.updatedAt = nowIso();
    session.lastPreview = truncatePreview(assistantMessage.content);
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: session.deviceId,
      sessionId: session.id,
      type: "run_completed",
      detail: input.turnId
    });
    await this.sendSessionNotification(state, principal.host.id, session.id, "run_complete", truncatePreview(assistantMessage.content));
    await promoteConversationMemoriesForSession(session, state.messages.filter((item) => item.sessionId === session.id));
    await this.writeState(state);
    this.emitMessage(principal.host.id, assistantMessage);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async failTurn(token: string, input: HostFailTurnRequest): Promise<ChatSession> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const session = this.requireSessionForHostState(state, input.sessionId, principal.host.id);
    const userMessage = this.requireMessage(state, input.userMessageId, session.id);
    const task =
      (input.taskId ? findTaskForHostState(state, input.taskId, principal.host.id) : null) ??
      state.tasks.find((item) => item.sessionId === session.id && item.userMessageId === input.userMessageId) ??
      null;
    let assistantMessage: ChatMessage | null = null;

    if (userMessage.status === "pending") {
      userMessage.status = "failed";
      userMessage.updatedAt = nowIso();
      userMessage.errorMessage = input.errorMessage;
    }

    if (input.assistantMessageId) {
      assistantMessage = this.requireMessage(state, input.assistantMessageId, session.id);
      assistantMessage.status = "failed";
      assistantMessage.updatedAt = nowIso();
      assistantMessage.errorMessage = input.errorMessage;
    } else {
      assistantMessage = {
        id: createId("msg"),
        sessionId: session.id,
        role: "assistant",
        content: "",
        status: "failed",
        errorMessage: input.errorMessage,
        inputMode: null,
        responseStyle: null,
        transcriptPolished: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.messages.push(assistantMessage);
    }

    if (task) {
      task.threadId = input.threadId ?? task.threadId;
      task.turnId = input.turnId ?? task.turnId;
      task.assistantMessageId = assistantMessage.id;
      task.status = "failed";
      task.stopRequested = false;
      task.claimedAt = null;
      task.interruptClaimedAt = null;
      task.lastError = input.errorMessage;
      task.updatedAt = nowIso();
    }
    session.threadId = input.threadId ?? session.threadId;
    session.lastPreview = truncatePreview(input.errorMessage);
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: session.deviceId,
      sessionId: session.id,
      type: "run_failed",
      detail: input.errorMessage
    });
    await this.sendSessionNotification(state, principal.host.id, session.id, "run_failed", input.errorMessage);
    await this.writeState(state);
    this.emitMessage(principal.host.id, userMessage);
    this.emitMessage(principal.host.id, assistantMessage);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async interruptTurn(token: string, input: HostInterruptTurnRequest): Promise<ChatSession> {
    const principal = await this.requireHost(token);
    const state = await this.readState();
    const session = this.requireSessionForHostState(state, input.sessionId, principal.host.id);
    const task =
      (input.taskId ? findTaskForHostState(state, input.taskId, principal.host.id) : null) ??
      findTaskByTurn(state, session.id, input.turnId);
    if (!task) {
      throw new Error("Task not found.");
    }

    const assistantMessageId =
      input.assistantMessageId ??
      [...state.messages]
        .reverse()
        .find((message) => message.sessionId === session.id && message.role === "assistant" && message.status === "streaming")?.id;

    if (assistantMessageId) {
      const assistantMessage = this.requireMessage(state, assistantMessageId, session.id);
      assistantMessage.status = "interrupted";
      assistantMessage.updatedAt = nowIso();
      assistantMessage.errorMessage = "Run stopped from Freedom.";
      if (!assistantMessage.content.trim()) {
        session.threadId = null;
      }
      this.emitMessage(principal.host.id, assistantMessage);
    }

    task.assistantMessageId = assistantMessageId ?? task.assistantMessageId;
    task.status = "cancelled";
    task.stopRequested = false;
    task.claimedAt = null;
    task.interruptClaimedAt = null;
    task.lastError = "Run stopped from Freedom.";
    task.updatedAt = nowIso();
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: principal.host.id,
      deviceId: session.deviceId,
      sessionId: session.id,
      type: "run_interrupted",
      detail: input.turnId
    });
    await this.writeState(state);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async getOverview(): Promise<GatewayOverview> {
    const state = await this.readState();
    const host = getLatestHostRecord(state);
    if (!host) {
      return {
        hostStatus: null,
        lastSeenDevice: null,
        recentDevices: [],
        recentSessions: [],
        recentSessionActivity: [],
        auditEvents: []
      };
    }

    const recentDevices = [...state.devices]
      .filter((item) => item.hostId === host.id && !item.revokedAt)
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
      .slice(0, 8);

    const recentSessionRecords = [...state.sessions]
      .filter((item) => item.hostId === host.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 6);

    const recentSessionActivity = recentSessionRecords.map((session): RecentSessionActivity => {
      const sessionMessages = state.messages
        .filter((item) => item.sessionId === session.id)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return {
        session: toPublicSession(session),
        latestUserMessage: sessionMessages.find((item) => item.role === "user") ?? null,
        latestAssistantMessage: sessionMessages.find((item) => item.role === "assistant") ?? null,
        lastMessageAt: sessionMessages[0]?.updatedAt ?? null
      };
    });

    const recentSessions = recentSessionActivity.map((item) => item.session);

    return {
      hostStatus: await this.buildHostStatus(host.id),
      lastSeenDevice: recentDevices[0] ? toPublicDevice(recentDevices[0]) : null,
      recentDevices: recentDevices.map(toPublicDevice),
      recentSessions,
      recentSessionActivity,
      auditEvents: state.auditEvents
        .filter((item) => item.hostId === host.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 12)
    };
  }

  async getDesktopShellState(): Promise<DesktopShellState> {
    const overview = await this.getOverview();
    const hostId = overview.hostStatus?.host.id;
    if (!hostId) {
      return {
        overview,
        desktopSession: null,
        desktopMessages: []
      };
    }

    const state = await this.readState();
    const session =
      [...state.sessions]
        .filter(
          (item) => item.hostId === hostId && item.kind === "operator" && item.identity.originSurface === "desktop_shell" && !item.archived
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;

    return {
      overview,
      desktopSession: session ? toPublicSession(session) : null,
      desktopMessages: session
        ? state.messages
            .filter((item) => item.sessionId === session.id)
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        : []
    };
  }

  async ensureDesktopShellSession(rootPath?: string): Promise<ChatSession> {
    const state = await this.readState();
    const host = getLatestHostRecord(state);
    if (!host) {
      throw new Error("Register the desktop host before opening the partner desk.");
    }

    const existing =
      [...state.sessions]
        .filter(
          (item) => item.hostId === host.id && item.kind === "operator" && item.identity.originSurface === "desktop_shell" && !item.archived
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
    if (existing) {
      return toPublicSession(existing);
    }

    const resolvedRoot = rootPath ?? host.approvedRoots[0];
    if (!host.approvedRoots.includes(resolvedRoot)) {
      throw new Error("Requested root is not approved for this host.");
    }

    const now = nowIso();
    const sessionId = createId("session");
    const session: SessionRecord = {
      id: sessionId,
      hostId: host.id,
      deviceId: buildDesktopShellDeviceId(host.id),
      title: FREEDOM_PRIMARY_SESSION_TITLE,
      kind: "operator",
      pinned: true,
      archived: false,
      rootPath: resolvedRoot,
      threadId: null,
      status: "idle",
      identity: buildSessionIdentity({
        sessionId,
        originSurface: "desktop_shell",
        workspaceContext: resolvedRoot
      }),
      activeTurnId: null,
      stopRequested: false,
      lastError: null,
      lastPreview: null,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
      claimedMessageId: null,
      stopClaimedAt: null
    };

    state.sessions.push(session);
    this.addAuditEvent(state, {
      hostId: host.id,
      deviceId: null,
      sessionId: session.id,
      type: "desktop_session_opened",
      originSurface: session.identity.originSurface,
      auditCorrelationId: session.identity.auditCorrelationId,
      detail: session.title
    });
    await this.writeState(state);
    this.emitSession(session);
    return toPublicSession(session);
  }

  async postDesktopShellMessage(sessionId: string, input: PostMessageRequest): Promise<ChatMessage> {
    const state = await this.readState();
    const host = getLatestHostRecord(state);
    if (!host) {
      throw new Error("Register the desktop host before posting a partner message.");
    }

    const session = this.requireSessionForHostState(state, sessionId, host.id);
    if (session.identity.originSurface !== "desktop_shell") {
      throw new Error("Desktop shell can only post into local desktop partner sessions.");
    }

    const now = nowIso();
    const recentDuplicateVoiceMessage = findRecentDuplicateVoiceMessage(state, session.id, input);
    if (recentDuplicateVoiceMessage) {
      return recentDuplicateVoiceMessage;
    }
    const message: ChatMessage = {
      id: createId("msg"),
      sessionId: session.id,
      role: "user",
      content: input.text.trim(),
      status: "pending",
      errorMessage: null,
      inputMode: input.inputMode ?? "text",
      responseStyle: input.responseStyle ?? "executive",
      transcriptPolished: input.transcriptPolished ?? false,
      createdAt: now,
      updatedAt: now
    };

    state.messages.push(message);
    session.lastError = null;
    session.lastPreview = truncatePreview(input.text.trim());
    session.lastActivityAt = now;

    const activeTasks = listSessionTasks(state, session.id).filter(isTaskRunning);
    const interruptType = classifyInterruptType(message.content, activeTasks);

    if (interruptType === "stop_task") {
      message.status = "completed";
      message.updatedAt = now;
      requestStopForSessionTasks(state, session.id, "Stopped by a newer Freedom command.");

      const assistantMessage: ChatMessage = {
        id: createId("msg"),
        sessionId: session.id,
        role: "assistant",
        content: "Stopping the current task now.",
        status: "completed",
        errorMessage: null,
        inputMode: null,
        responseStyle: null,
        transcriptPolished: null,
        createdAt: now,
        updatedAt: now
      };
      state.messages.push(assistantMessage);
      syncSessionFromTasks(state, session);

      this.addAuditEvent(state, {
        hostId: host.id,
        deviceId: null,
        sessionId: session.id,
        type: "message_posted",
        originSurface: session.identity.originSurface,
        auditCorrelationId: session.identity.auditCorrelationId,
        detail: `desktop_shell:${input.inputMode ?? "text"}:${input.responseStyle ?? "executive"}:${interruptType}`
      });
      await this.writeState(state);
      this.emitMessage(host.id, message);
      this.emitMessage(host.id, assistantMessage);
      this.emitSession(session);
      return message;
    }

    const task: TaskRecord = {
      id: createId("task"),
      sessionId: session.id,
      userMessageId: message.id,
      assistantMessageId: null,
      title: truncatePreview(message.content),
      status: "queued",
      priority: deriveTaskPriority(interruptType),
      origin: interruptType ? "interrupt" : "user_message",
      parentTaskId: activeTasks[0]?.id ?? null,
      canRunInParallel: interruptType === "parallel_subtask" || interruptType === "quick_question" || interruptType === "clarification",
      interruptType,
      threadId: activeTasks[0]?.threadId ?? session.threadId,
      turnId: null,
      resumeContext: activeTasks[0]?.title ?? null,
      toolState: null,
      resourceKey: session.rootPath,
      readOnly: inferTaskReadOnly(message.content),
      stopRequested: false,
      interruptClaimedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      claimedAt: null
    };

    if (interruptType === "replace_task") {
      requestStopForSessionTasks(state, session.id, "Replaced by a newer Freedom task.");
    }

    state.tasks.push(task);
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: host.id,
      deviceId: null,
      sessionId: session.id,
      type: "message_posted",
      originSurface: session.identity.originSurface,
      auditCorrelationId: session.identity.auditCorrelationId,
      detail: `desktop_shell:${input.inputMode ?? "text"}:${input.responseStyle ?? "executive"}`
    });
    await this.writeState(state);
    this.emitMessage(host.id, message);
    this.emitSession(session);
    return message;
  }

  async stopDesktopShellSession(sessionId: string): Promise<ChatSession> {
    const state = await this.readState();
    const host = getLatestHostRecord(state);
    if (!host) {
      throw new Error("Register the desktop host before stopping a partner session.");
    }

    const session = this.requireSessionForHostState(state, sessionId, host.id);
    if (session.identity.originSurface !== "desktop_shell") {
      throw new Error("Desktop shell can only stop local desktop partner sessions.");
    }

    requestStopForSessionTasks(state, session.id, "Cancelled before Freedom started running.");
    syncSessionFromTasks(state, session);

    this.addAuditEvent(state, {
      hostId: host.id,
      deviceId: null,
      sessionId: session.id,
      type: "stop_requested",
      originSurface: session.identity.originSurface,
      auditCorrelationId: session.identity.auditCorrelationId,
      detail: session.title
    });
    await this.writeState(state);
    this.emitSession(session);
    return toPublicSession(session);
  }

  private async requirePrincipal(token: string): Promise<Principal> {
    const state = await this.readState();
    const host = state.hosts.find((item) => item.hostToken === token);
    if (host) {
      return { kind: "host", host };
    }

    const device = state.devices.find((item) => item.deviceToken === token);
    if (!device) {
      throw new Error("Invalid session token.");
    }
    if (device.revokedAt) {
      throw new Error("Invalid session token.");
    }
    const pairedHost = state.hosts.find((item) => item.id === device.hostId);
    if (!pairedHost) {
      throw new Error("Paired host not found.");
    }
    return { kind: "device", host: pairedHost, device };
  }

  private async requireHost(token: string): Promise<{ kind: "host"; host: HostRecord }> {
    const principal = await this.requirePrincipal(token);
    if (principal.kind !== "host") {
      throw new Error("Host token required.");
    }
    return principal;
  }

  private async requireDevice(token: string): Promise<{ kind: "device"; host: HostRecord; device: DeviceRecord }> {
    const principal = await this.requirePrincipal(token);
    if (principal.kind !== "device") {
      throw new Error("Paired device token required.");
    }
    return principal;
  }

  private async requireSessionForDevice(sessionId: string, deviceId: string): Promise<SessionRecord> {
    const state = await this.readState();
    const session = state.sessions.find((item) => item.id === sessionId && item.deviceId === deviceId);
    if (!session) {
      throw new Error("Session not found.");
    }
    return session;
  }

  private requireSessionForHostState(state: GatewayState, sessionId: string, hostId: string): SessionRecord {
    const session = state.sessions.find((item) => item.id === sessionId && item.hostId === hostId);
    if (!session) {
      throw new Error("Session not found.");
    }
    return session;
  }

  private requireMessage(state: GatewayState, messageId: string, sessionId: string): ChatMessage {
    const message = state.messages.find((item) => item.id === messageId && item.sessionId === sessionId);
    if (!message) {
      throw new Error("Message not found.");
    }
    return message;
  }

  private async buildHostStatus(hostId: string): Promise<HostStatus> {
    const state = await this.readState();
    const host = state.hosts.find((item) => item.id === hostId);
    if (!host) {
      throw new Error("Host not found.");
    }

    const online = isRecent(host.lastSeenAt, HOST_ONLINE_WINDOW_MS);
    host.isOnline = online;
    const recipientCount = state.outboundRecipients.filter((item) => item.hostId === hostId).length;
    const connectionState = deriveConnectionState(host);
    const voiceState = deriveVoiceState(host, connectionState);
    const deferredExecutionState = deriveDeferredExecutionState(host, connectionState);

    return {
      host: toPublicHost(host),
      auth: host.auth,
      tailscale: host.tailscale,
      wakeControl: buildWakeControl(process.env, host),
      voiceProfile: resolveHostVoiceProfile(host),
      outboundEmail: resolveOutboundEmailStatus(process.env, recipientCount),
      connectionState,
      connectionDetail: describeConnectionState(host, connectionState),
      voiceState,
      voiceDetail: describeVoiceState(host, connectionState, voiceState),
      deferredExecutionState,
      deferredExecutionDetail: describeDeferredExecutionState(deferredExecutionState),
      availability: deriveHostAvailability(host),
      repairState: deriveRepairState(host),
      runState: deriveRunState(state.sessions, hostId),
      activeSessionCount: state.sessions.filter((item) => item.hostId === hostId && item.activeTurnId).length,
      pairedDeviceCount: state.devices.filter((item) => item.hostId === hostId && !item.revokedAt).length
    };
  }

  private emitHostStatus(host: HostRecord): void {
    void this.buildHostStatus(host.id).then((hostStatus) => {
      this.notifyWorkAvailable(host.id);
      this.events.emit("broadcast", {
        hostId: host.id,
        event: {
          type: "host_status",
          hostStatus
        }
      } satisfies BroadcastEnvelope);
    });
  }

  private emitSession(session: SessionRecord): void {
    this.notifyWorkAvailable(session.hostId);
    this.events.emit("broadcast", {
      hostId: session.hostId,
      event: {
        type: "session_upsert",
        session: toPublicSession(session)
      }
    } satisfies BroadcastEnvelope);
  }

  private emitMessage(hostId: string, message: ChatMessage): void {
    this.notifyWorkAvailable(hostId);
    this.events.emit("broadcast", {
      hostId,
      event: {
        type: "message_upsert",
        sessionId: message.sessionId,
        message
      }
    } satisfies BroadcastEnvelope);
  }

  private async touchDevice(device: DeviceRecord): Promise<void> {
    device.lastSeenAt = nowIso();
    await this.writeState(await this.readState());
  }

  private addAuditEvent(
    state: GatewayState,
    input: {
      hostId: string;
      deviceId: string | null;
      sessionId: string | null;
      type: string;
      originSurface?: "desktop_shell" | "mobile_companion" | null;
      auditCorrelationId?: string | null;
      detail: string | null;
    }
  ): void {
    state.auditEvents.unshift({
      id: createId("audit"),
      hostId: input.hostId,
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      type: input.type,
      originSurface: input.originSurface ?? null,
      auditCorrelationId: input.auditCorrelationId ?? null,
      detail: input.detail,
      createdAt: nowIso()
    });
    state.auditEvents = state.auditEvents.slice(0, 250);
  }

  private async sendSessionNotification(
    state: GatewayState,
    hostId: string,
    sessionId: string,
    event: NotificationEvent,
    detail: string
  ): Promise<void> {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }
    const device = state.devices.find((item) => item.id === session.deviceId && !item.revokedAt);
    if (!device) {
      return;
    }
    await this.sendNotification(state, hostId, device, event, detail, sessionId);
  }

  private async sendNotification(
    state: GatewayState,
    hostId: string,
    device: DeviceRecord,
    event: NotificationEvent,
    detail: string,
    sessionId: string | null = null
  ): Promise<void> {
    if (!device.pushToken || !device.notificationPrefs[event]) {
      return;
    }
    const serverKey = process.env.FCM_SERVER_KEY?.trim();
    if (!serverKey) {
      this.addAuditEvent(state, {
        hostId,
        deviceId: device.id,
        sessionId,
        type: "notification_skipped",
        detail: `${event}:missing_fcm_server_key`
      });
      return;
    }

    const payload = {
      to: device.pushToken,
      priority: "high",
      notification: {
        title: notificationTitleForEvent(event),
        body: detail
      },
      data: {
        event,
        hostId,
        sessionId: sessionId ?? "",
        detail
      }
    };

    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          authorization: `key=${serverKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`FCM responded with ${response.status}`);
      }
      device.lastNotificationAt = nowIso();
      this.addAuditEvent(state, {
        hostId,
        deviceId: device.id,
        sessionId,
        type: "notification_sent",
        detail: event
      });
    } catch (error) {
      this.addAuditEvent(state, {
        hostId,
        deviceId: device.id,
        sessionId,
        type: "notification_failed",
        detail: error instanceof Error ? `${event}:${error.message}` : `${event}:unknown_error`
      });
    }
  }

  private async readState(): Promise<GatewayState> {
    if (this.state) {
      recoverStaleSessionStops(this.state);
      return this.state;
    }

    await mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await readFile(this.dataFile, "utf8");
      this.state = migrateState(JSON.parse(raw) as Partial<GatewayState>);
      recoverStaleSessionStops(this.state);
    } catch {
      this.state = await this.readExampleState();
      await this.writeState(this.state);
    }
    return this.state;
  }

  private async readExampleState(): Promise<GatewayState> {
    try {
      const raw = await readFile(this.exampleDataFile, "utf8");
      return migrateState(JSON.parse(raw) as Partial<GatewayState>);
    } catch {
      return defaultState();
    }
  }

  private async writeState(state: GatewayState, options?: { defer?: boolean }): Promise<void> {
    this.state = state;
    if (options?.defer) {
      this.scheduleDeferredWrite();
      return;
    }
    await this.flushPendingWrite();
  }

  private scheduleDeferredWrite(): void {
    if (this.pendingWriteTimer) {
      clearTimeout(this.pendingWriteTimer);
    }
    this.pendingWriteTimer = setTimeout(() => {
      this.pendingWriteTimer = null;
      void this.flushPendingWrite();
    }, DEFERRED_WRITE_MS);
  }

  private async flushPendingWrite(): Promise<void> {
    if (this.pendingWriteTimer) {
      clearTimeout(this.pendingWriteTimer);
      this.pendingWriteTimer = null;
    }

    const state = this.state;
    if (!state) {
      return;
    }

    if (this.flushInFlight) {
      await this.flushInFlight;
      if (this.state !== state) {
        await this.flushPendingWrite();
      }
      return;
    }

    this.flushInFlight = (async () => {
      await mkdir(this.dataDir, { recursive: true });
      await writeFile(this.dataFile, JSON.stringify(state, null, 2), "utf8");
    })();

    try {
      await this.flushInFlight;
    } finally {
      this.flushInFlight = null;
    }

    if (this.state !== state) {
      await this.flushPendingWrite();
    }
  }

  private waitForWork(hostId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const waiters = this.workWaiters.get(hostId) ?? new Set<() => void>();
      let timer: NodeJS.Timeout | null = null;
      const finish = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        waiters.delete(finish);
        if (!waiters.size) {
          this.workWaiters.delete(hostId);
        }
        resolve();
      };

      waiters.add(finish);
      this.workWaiters.set(hostId, waiters);
      timer = setTimeout(finish, timeoutMs);
    });
  }

  private notifyWorkAvailable(hostId: string): void {
    const waiters = this.workWaiters.get(hostId);
    if (!waiters?.size) {
      return;
    }
    this.workWaiters.delete(hostId);
    for (const waiter of waiters) {
      waiter();
    }
  }

  private recoverSiblingSessions(state: GatewayState, host: HostRecord, device: DeviceRecord): void {
    const siblingHosts = state.hosts.filter(
      (item) =>
        item.id !== host.id &&
        !item.isOnline &&
        hostsLookEquivalent(item, host)
    );

    if (!siblingHosts.length) {
      return;
    }

    const siblingHostIds = new Set(siblingHosts.map((item) => item.id));
    const siblingDevices = state.devices.filter(
      (item) => siblingHostIds.has(item.hostId) && item.deviceName === device.deviceName
    );

    if (!siblingDevices.length) {
      return;
    }

    const siblingDeviceIds = new Set(siblingDevices.map((item) => item.id));
    const recoveredAt = nowIso();

    for (const session of state.sessions) {
      if (!siblingDeviceIds.has(session.deviceId)) {
        continue;
      }
      session.hostId = host.id;
      session.deviceId = device.id;
      session.updatedAt = recoveredAt;
    }
  }
}

function recoverStaleSessionStops(state: GatewayState): void {
  const recoveredAt = nowIso();
  let changed = false;

  for (const task of state.tasks) {
    if (task.status === "queued" && task.claimedAt) {
      const claimedAtMs = Date.parse(task.claimedAt);
      if (!Number.isFinite(claimedAtMs) || Date.now() - claimedAtMs >= STALE_QUEUE_CLAIM_MS) {
        task.claimedAt = null;
        task.updatedAt = recoveredAt;
        changed = true;
      }
    }

    if (!task.stopRequested || !task.interruptClaimedAt || !isTaskRunning(task)) {
      continue;
    }

    const claimedAtMs = Date.parse(task.interruptClaimedAt);
    if (!Number.isFinite(claimedAtMs) || Date.now() - claimedAtMs < STALE_STOP_RECOVERY_MS) {
      continue;
    }

    task.status = "cancelled";
    task.stopRequested = false;
    task.claimedAt = null;
    task.interruptClaimedAt = null;
    task.lastError = "Recovered from a stale stop request.";
    task.updatedAt = recoveredAt;
    changed = true;

    const assistantMessage = task.assistantMessageId
      ? state.messages.find((message) => message.id === task.assistantMessageId && message.sessionId === task.sessionId)
      : [...state.messages]
          .reverse()
          .find((message) => message.sessionId === task.sessionId && message.role === "assistant" && message.status === "streaming");

    if (assistantMessage) {
      assistantMessage.status = "interrupted";
      assistantMessage.errorMessage = "Recovered from a stale stop request.";
      assistantMessage.updatedAt = recoveredAt;
    }
  }

  for (const session of state.sessions) {
    syncSessionFromTasks(state, session);
  }

  if (changed) {
    state.auditEvents.unshift({
      id: createId("audit"),
      hostId: state.sessions.find((session) => session.hostId)?.hostId ?? "",
      deviceId: null,
      sessionId: null,
      type: "repair_needed",
      originSurface: null,
      auditCorrelationId: null,
      detail: "Recovered stale stopping session state.",
      createdAt: recoveredAt
    });
    state.auditEvents = state.auditEvents.slice(0, 200);
  }
}

function toPublicHost(host: HostRecord): RegisteredHost {
  return {
    id: host.id,
    hostName: host.hostName,
    approvedRoots: host.approvedRoots,
    pairingCode: host.pairingCode,
    pairingCodeIssuedAt: host.pairingCodeIssuedAt,
    createdAt: host.createdAt,
    lastSeenAt: host.lastSeenAt,
    isOnline: isRecent(host.lastSeenAt, 15_000)
  };
}

function toPublicDevice(device: DeviceRecord): PairedDevice {
  return {
    id: device.id,
    hostId: device.hostId,
    deviceName: device.deviceName,
    pushToken: device.pushToken,
    notificationPrefs: device.notificationPrefs,
    revokedAt: device.revokedAt,
    lastNotificationAt: device.lastNotificationAt,
    repairCount: device.repairCount,
    repairedAt: device.repairedAt,
    createdAt: device.createdAt,
    lastSeenAt: device.lastSeenAt
  };
}

function toPublicSession(session: SessionRecord): ChatSession {
  return {
    id: session.id,
    hostId: session.hostId,
    deviceId: session.deviceId,
    title: session.title,
    kind: session.kind,
    pinned: session.pinned,
    archived: session.archived,
    rootPath: session.rootPath,
    threadId: session.threadId,
    status: session.status,
    identity: session.identity,
    activeTurnId: session.activeTurnId,
    stopRequested: session.stopRequested,
    lastError: session.lastError,
    lastPreview: session.lastPreview,
    lastActivityAt: session.lastActivityAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function buildDefaultHostVoiceProfile(host: HostRecord): AssistantVoiceProfile {
  const entry = getAssistantVoiceCatalogEntry(process.env.NEXT_PUBLIC_VOICE_ID);
  return {
    targetVoice: entry.id,
    displayName: entry.label,
    gender: entry.gender,
    accent: null,
    tone: entry.summary,
    warmth: entry.warmth,
    pace: entry.pace,
    notes: null,
    source: "default",
    updatedAt: host.createdAt
  };
}

function normalizeStoredVoiceProfile(profile: Partial<AssistantVoiceProfile> | null): AssistantVoiceProfile | null {
  if (!profile) {
    return null;
  }

  const entry = getAssistantVoiceCatalogEntry(profile.targetVoice);
  return {
    targetVoice: entry.id,
    displayName: profile.displayName?.trim() || entry.label,
    gender: profile.gender ?? entry.gender,
    accent: normalizeOptionalPreference(profile.accent, null),
    tone: normalizeOptionalPreference(profile.tone, entry.summary),
    warmth: profile.warmth ?? entry.warmth,
    pace: profile.pace ?? entry.pace,
    notes: normalizeOptionalPreference(profile.notes, null),
    source: profile.source === "conversation" || profile.source === "manual" ? profile.source : "default",
    updatedAt: profile.updatedAt ?? nowIso()
  };
}

function resolveHostVoiceProfile(host: HostRecord): AssistantVoiceProfile {
  return normalizeStoredVoiceProfile(host.voiceProfile) ?? buildDefaultHostVoiceProfile(host);
}

function normalizeOptionalPreference(value: string | null | undefined, fallback: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function summarizeHostVoiceProfile(profile: AssistantVoiceProfile): string {
  const details = [profile.displayName];
  if (profile.gender !== "unspecified") {
    details.push(profile.gender);
  }
  if (profile.accent) {
    details.push(profile.accent);
  }
  if (profile.tone) {
    details.push(profile.tone);
  }
  if (profile.warmth !== "medium") {
    details.push(profile.warmth);
  }
  if (profile.pace !== "steady") {
    details.push(profile.pace);
  }
  return details.join(" | ");
}

function getLatestHostRecord(state: GatewayState): HostRecord | null {
  return [...state.hosts].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))[0] ?? null;
}

function isRecent(iso: string, thresholdMs: number): boolean {
  return Date.now() - new Date(iso).getTime() < thresholdMs;
}

function hostsLookEquivalent(left: HostRecord, right: HostRecord): boolean {
  const sameDnsName =
    left.tailscale.dnsName &&
    right.tailscale.dnsName &&
    left.tailscale.dnsName === right.tailscale.dnsName;

  if (sameDnsName) {
    return true;
  }

  return sameRoots(left.approvedRoots, right.approvedRoots);
}

function sameRoots(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

async function loadConversationBuildLaneSummary(hostId: string): Promise<ConversationBuildLaneSummary> {
  const rows = await fetchProgrammingRequestRows(40);
  const items = rows
    .map((row) =>
      parseProgrammingRequestReason(row.reason, {
        id: row.id,
        title: row.capability,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }).buildLane
    )
    .filter((item): item is ConversationBuildLaneItem => Boolean(item))
    .filter((item) => !item.hostId || item.hostId === hostId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    configured: isProgrammingMemoryConfigured(),
    items,
    pendingCount: items.filter((item) => isBuildLaneApprovalPending(item.approvalState)).length,
    approvedCount: items.filter((item) => isBuildLaneApprovalApproved(item.approvalState)).length,
    blockedCount: items.filter((item) => item.approvalState === "blocked").length
  };
}

async function fetchProgrammingRequestRows(limit: number): Promise<ProgrammingRequestMemoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_programming_requests", supabaseUrl);
  url.searchParams.set("select", "id,capability,reason,status,created_at,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`
      }
    });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return Array.isArray(parsed) ? (parsed as ProgrammingRequestMemoryRow[]) : [];
  } catch {
    return [];
  }
}

async function fetchTaskMemoryRows(limit: number): Promise<TaskMemoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_voice_tasks", supabaseUrl);
  url.searchParams.set("select", "topic,summary,status,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`
      }
    });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return Array.isArray(parsed) ? (parsed as TaskMemoryRow[]) : [];
  } catch {
    return [];
  }
}

async function fetchLearningSignalRows(limit: number): Promise<LearningSignalMemoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_learning_signals", supabaseUrl);
  url.searchParams.set("select", "topic,summary,kind,status,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`
      }
    });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return Array.isArray(parsed) ? (parsed as LearningSignalMemoryRow[]) : [];
  } catch {
    return [];
  }
}

async function fetchConversationMemoryRows(limit: number): Promise<ConversationMemoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_conversation_memories", supabaseUrl);
  url.searchParams.set("select", "topic,summary,category,confidence,status,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`
      }
    });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return Array.isArray(parsed) ? (parsed as ConversationMemoryRow[]) : [];
  } catch {
    return [];
  }
}

async function upsertLearningSignals(signals: SyncMobileLearningSignalsRequest["signals"]): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey || !signals.length) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_learning_signals", supabaseUrl);
  url.searchParams.set("on_conflict", "id");

  const body = signals.map((signal) => ({
    id: signal.id,
    topic: signal.topic.trim(),
    summary: signal.summary.trim(),
    kind: signal.kind,
    status: signal.status,
    created_at: signal.createdAt,
    updated_at: signal.updatedAt
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(body)
    });
    return response.ok ? body.map((signal) => signal.id) : [];
  } catch {
    return [];
  }
}

async function upsertConversationMemories(
  memories: SyncMobileConversationMemoriesRequest["memories"]
): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey || !memories.length) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_conversation_memories", supabaseUrl);
  url.searchParams.set("on_conflict", "id");

  const body = memories.map((memory) => ({
    id: memory.id,
    topic: memory.topic.trim(),
    summary: memory.summary.trim(),
    category: memory.category,
    confidence: memory.confidence,
    status: memory.status,
    source_session_id: memory.sourceSessionId ?? null,
    created_at: memory.createdAt,
    updated_at: memory.updatedAt
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(body)
    });
    return response.ok ? body.map((memory) => memory.id) : [];
  } catch {
    return [];
  }
}

function dedupeLearningSignalsForSync(signals: SyncMobileLearningSignalsRequest["signals"]): SyncMobileLearningSignalsRequest["signals"] {
  const seen = new Set<string>();
  const deduped: SyncMobileLearningSignalsRequest["signals"] = [];

  for (const signal of signals) {
    const key = [
      signal.id.trim().toLowerCase(),
      signal.topic.trim().toLowerCase(),
      signal.kind,
      signal.summary.trim().toLowerCase()
    ].join("::");
    if (!signal.topic.trim() || !signal.summary.trim() || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(signal);
  }

  return deduped;
}

function dedupeConversationMemoriesForSync(
  memories: SyncMobileConversationMemoriesRequest["memories"]
): SyncMobileConversationMemoriesRequest["memories"] {
  const seen = new Set<string>();
  const deduped: SyncMobileConversationMemoriesRequest["memories"] = [];

  for (const memory of memories) {
    const key = [
      memory.id.trim().toLowerCase(),
      memory.topic.trim().toLowerCase(),
      memory.category,
      memory.summary.trim().toLowerCase()
    ].join("::");
    if (!memory.topic.trim() || !memory.summary.trim() || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(memory);
  }

  return deduped;
}

async function fetchPersonaOverlayRows(limit: number): Promise<PersonaOverlayMemoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const url = new URL("/rest/v1/freedom_persona_overlays", supabaseUrl);
  url.searchParams.set("select", "title,instruction,status,change_type,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`
      }
    });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return Array.isArray(parsed) ? (parsed as PersonaOverlayMemoryRow[]) : [];
  } catch {
    return [];
  }
}

function deriveConversationMemoriesFromMessages(
  sessionId: string,
  sessionTitle: string,
  messages: ChatMessage[]
): SyncMobileConversationMemoriesRequest["memories"] {
  const userMessages = messages
    .filter((message) => message.role === "user" && message.status === "completed" && message.content.trim())
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-8);
  const assistantMessages = messages
    .filter((message) => message.role === "assistant" && message.status === "completed" && message.content.trim())
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-4);
  const results: SyncMobileConversationMemoriesRequest["memories"] = [];

  for (const message of userMessages) {
    const normalized = normalizeMessageText(message.content);
    if (!normalized) {
      continue;
    }

    const pushMemory = (
      topic: string,
      category: SyncMobileConversationMemoriesRequest["memories"][number]["category"],
      confidence: number
    ) => {
      results.push({
        id: `conversation-${sessionId}-${message.id}-${category}`,
        topic,
        summary: normalized,
        category,
        confidence,
        status: "observed",
        sourceSessionId: sessionId,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        capturedAt: message.updatedAt
      });
    };

    if (/\bmy name is\b|\bi am\b|\bi'm\b/i.test(normalized)) {
      pushMemory("User identity", "identity", 0.88);
      continue;
    }
    if (/\b(i like|i love|i prefer|my favorite|i usually prefer)\b/i.test(normalized)) {
      pushMemory("User preference", "preference", 0.8);
      continue;
    }
    if (/\b(i am working on|i'm working on|we are building|we're building|my project|i need help with|i want to build)\b/i.test(normalized)) {
      pushMemory("Current project", "project", 0.78);
      continue;
    }
    if (/\bremember\b|this matters to me|keep in mind\b/i.test(normalized)) {
      pushMemory("Relationship context", "relationship", 0.72);
    }
  }

  if (!results.length) {
    const latestUser = userMessages.at(-1);
    const latestAssistant = assistantMessages.at(-1);
    const summary = [latestUser?.content?.trim(), latestAssistant?.content?.trim()].filter(Boolean).join(" ");
    if (summary) {
      results.push({
        id: `conversation-${sessionId}-context`,
        topic: sessionTitle.trim() || "Recent conversation",
        summary: truncatePreview(summary, 280),
        category: "context",
        confidence: 0.62,
        status: "observed",
        sourceSessionId: sessionId,
        createdAt: latestUser?.createdAt ?? latestAssistant?.createdAt ?? nowIso(),
        updatedAt: latestAssistant?.updatedAt ?? latestUser?.updatedAt ?? nowIso(),
        capturedAt: latestAssistant?.updatedAt ?? latestUser?.updatedAt ?? nowIso()
      });
    }
  }

  return dedupeConversationMemoriesForSync(results).slice(0, 3);
}

async function promoteConversationMemoriesForSession(session: ChatSession, messages: ChatMessage[]): Promise<void> {
  if (!isProgrammingMemoryConfigured()) {
    return;
  }

  const derived = deriveConversationMemoriesFromMessages(session.id, session.title, messages);
  if (!derived.length) {
    return;
  }

  await upsertConversationMemories(derived);
}

function buildStateConversationMemoryContext(state: GatewayState, hostId: string): string {
  const sessions = state.sessions
    .filter((session) => session.hostId === hostId)
    .sort((left, right) => (right.lastActivityAt ?? right.updatedAt).localeCompare(left.lastActivityAt ?? left.updatedAt))
    .slice(0, 4);
  const memories = sessions.flatMap((session) =>
    deriveConversationMemoriesFromMessages(
      session.id,
      session.title,
      state.messages.filter((message) => message.sessionId === session.id)
    )
  ).slice(0, 6);

  if (!memories.length) {
    return "";
  }

  return [
    "Conversation continuity:",
    ...memories.map((memory) => `- ${memory.topic}: ${memory.summary} (${memory.category}, ${memory.status})`)
  ].join("\n");
}

async function loadMemoryDigest(hostId: string): Promise<MemoryDigest> {
  const [tasks, learningSignals, conversationMemories, buildLane, personaOverlays] = await Promise.all([
    fetchTaskMemoryRows(6),
    fetchLearningSignalRows(6),
    fetchConversationMemoryRows(8),
    loadConversationBuildLaneSummary(hostId),
    fetchPersonaOverlayRows(6)
  ]);

  const sections = [
    tasks.length
      ? [
          "Open task memory:",
          ...tasks
            .filter((task) => ["active", "parked", "ready"].includes(task.status))
            .slice(0, 6)
            .map((task) => `- ${task.topic}: ${task.summary} (${task.status})`)
        ].join("\n")
      : "",
    learningSignals.length
      ? [
          "Recent durable memory:",
          ...learningSignals.map((signal) => `- ${signal.topic}: ${signal.summary} (${signal.kind}, ${signal.status})`)
        ].join("\n")
      : "",
    conversationMemories.length
      ? [
          "Relationship memory:",
          ...conversationMemories.map((memory) => `- ${memory.topic}: ${memory.summary} (${memory.category}, ${memory.status})`)
        ].join("\n")
      : "",
    buildLane.items.length
      ? [
          "Conversation build lane:",
          ...buildLane.items.slice(0, 6).map((item) => `- ${item.title} [${item.approvalState}]: ${item.summary}`)
        ].join("\n")
      : "",
    personaOverlays.length
      ? [
          "Approved persona overlays:",
          ...personaOverlays
            .filter((overlay) => overlay.status === "approved" && overlay.change_type !== "retirement")
            .slice(0, 6)
            .map((overlay) => `- ${overlay.title}: ${overlay.instruction}`)
        ].join("\n")
      : ""
  ].filter(Boolean);

  const updatedAt = [
    ...tasks.map((row) => row.updated_at),
    ...learningSignals.map((row) => row.updated_at),
    ...conversationMemories.map((row) => row.updated_at),
    ...buildLane.items.map((item) => item.updatedAt),
    ...personaOverlays.map((row) => row.updated_at)
  ]
    .filter(Boolean)
    .sort()
    .at(-1) ?? nowIso();

  return {
    configured: isProgrammingMemoryConfigured(),
    updatedAt,
    context: sections.join("\n\n").trim()
  };
}

function isProgrammingMemoryConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function truncatePreview(value: string, maxLength = 140): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeMessageText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function isVoiceInputMode(inputMode: PostMessageRequest["inputMode"] | ChatMessage["inputMode"]): boolean {
  return inputMode === "voice" || inputMode === "voice_polished";
}

function findRecentDuplicateVoiceMessage(
  state: GatewayState,
  sessionId: string,
  input: PostMessageRequest
): ChatMessage | null {
  if (!isVoiceInputMode(input.inputMode)) {
    return null;
  }

  const normalizedInput = normalizeMessageText(input.text);
  if (!normalizedInput) {
    return null;
  }

  const cutoff = Date.now() - DUPLICATE_VOICE_MESSAGE_WINDOW_MS;
  const recentUserMessages = [...state.messages]
    .reverse()
    .filter((message) => {
      if (message.sessionId !== sessionId || message.role !== "user" || !isVoiceInputMode(message.inputMode)) {
        return false;
      }

      const createdAtMs = Date.parse(message.createdAt);
      if (!Number.isFinite(createdAtMs) || createdAtMs < cutoff) {
        return false;
      }

      return normalizeMessageText(message.content) === normalizedInput;
    });

  return recentUserMessages[0] ?? null;
}

function recoverOrphanedHostTasks(state: GatewayState, hostId: string, recoveredAt: string): void {
  const hostSessionIds = new Set(state.sessions.filter((session) => session.hostId === hostId).map((session) => session.id));
  if (!hostSessionIds.size) {
    return;
  }

  let changed = false;
  for (const task of state.tasks) {
    if (!hostSessionIds.has(task.sessionId)) {
      continue;
    }

    if (task.status === "queued" && task.claimedAt) {
      task.claimedAt = null;
      task.updatedAt = recoveredAt;
      changed = true;
      continue;
    }

    if (!isTaskRunning(task)) {
      continue;
    }

    const assistantMessage = task.assistantMessageId
      ? state.messages.find((message) => message.id === task.assistantMessageId && message.sessionId === task.sessionId)
      : [...state.messages]
          .reverse()
          .find((message) => message.sessionId === task.sessionId && message.role === "assistant" && message.status === "streaming");

    if (task.stopRequested) {
      task.status = "cancelled";
      task.stopRequested = false;
      task.claimedAt = null;
      task.interruptClaimedAt = null;
      task.lastError = "Recovered after the desktop host restarted while stopping a run.";
      task.updatedAt = recoveredAt;
      if (assistantMessage && assistantMessage.status === "streaming") {
        assistantMessage.status = "interrupted";
        assistantMessage.errorMessage = "Recovered after the desktop host restarted while stopping a run.";
        assistantMessage.updatedAt = recoveredAt;
      }
      changed = true;
      continue;
    }

    task.status = "queued";
    task.claimedAt = null;
    task.stopRequested = false;
    task.interruptClaimedAt = null;
    task.lastError = null;
    task.updatedAt = recoveredAt;

    if (assistantMessage && assistantMessage.status === "streaming") {
      assistantMessage.status = "interrupted";
      assistantMessage.errorMessage = "Recovered after the desktop host restarted. Retrying this turn.";
      assistantMessage.updatedAt = recoveredAt;
    }

    changed = true;
  }

  if (!changed) {
    return;
  }

  for (const session of state.sessions) {
    if (hostSessionIds.has(session.id)) {
      syncSessionFromTasks(state, session);
    }
  }

  state.auditEvents.unshift({
    id: createId("audit"),
    hostId,
    deviceId: null,
    sessionId: null,
    type: "repair_needed",
    originSurface: null,
    auditCorrelationId: null,
    detail: "Recovered orphaned host tasks after desktop host registration.",
    createdAt: recoveredAt
  });
  state.auditEvents = state.auditEvents.slice(0, 200);
}

function notificationTitleForEvent(event: NotificationEvent): string {
  switch (event) {
    case "approval_needed":
      return "Freedom approval needed";
    case "repair_needed":
      return "Freedom Anywhere repair needed";
    case "run_failed":
      return "Freedom run failed";
    default:
      return "Freedom run complete";
  }
}

function hasPrimaryVoiceRuntimeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.LIVEKIT_URL?.trim() && env.LIVEKIT_API_KEY?.trim() && env.LIVEKIT_API_SECRET?.trim());
}

function deriveConnectionState(host: HostRecord): MobileConnectionState {
  if (isRecent(host.lastSeenAt, HOST_ONLINE_WINDOW_MS)) {
    return "desktop_linked";
  }

  if (isRecent(host.lastSeenAt, HOST_RECONNECTING_WINDOW_MS)) {
    return "reconnecting";
  }

  return "stand_alone";
}

function describeConnectionState(host: HostRecord, state: MobileConnectionState): string {
  switch (state) {
    case "desktop_linked":
      if (host.auth.status !== "logged_in") {
        return "Connected to desktop. Freedom can stay linked while the desktop finishes restoring the preferred Freedom login path.";
      }
      return "Connected to desktop and ready for live sync, governed execution, and premium voice.";
    case "reconnecting":
      return "The desktop heartbeat just went stale. Freedom Anywhere is actively trying to restore the live desktop link.";
    case "stand_alone":
      return "The desktop is currently unavailable. Freedom Anywhere should keep working on this phone and save everything for later sync.";
    default:
      return "Connected to desktop and ready for live sync, governed execution, and premium voice.";
  }
}

function deriveVoiceState(host: HostRecord, connectionState: MobileConnectionState): MobileVoiceState {
  const primaryConfigured = hasPrimaryVoiceRuntimeConfigured();

  if (connectionState === "desktop_linked") {
    return primaryConfigured ? "voice_primary_ready" : "voice_fallback_only";
  }
  if (connectionState === "reconnecting" && primaryConfigured) {
    return "voice_primary_recovering";
  }
  if (connectionState === "reconnecting") {
    return "voice_fallback_only";
  }
  if (connectionState === "stand_alone") {
    return "voice_fallback_only";
  }
  return primaryConfigured ? "voice_primary_recovering" : "voice_unavailable";
}

function describeVoiceState(
  host: HostRecord,
  connectionState: MobileConnectionState,
  voiceState: MobileVoiceState
): string {
  if (voiceState === "voice_primary_ready") {
    return "Premium realtime voice is configured on this desktop and should remain the default lane.";
  }
  if (voiceState === "voice_primary_recovering") {
    return "Premium realtime voice is configured, but the desktop link is still recovering.";
  }
  if (voiceState === "voice_unavailable") {
    return "No supported Freedom voice lane is ready right now.";
  }
  if (!hasPrimaryVoiceRuntimeConfigured()) {
    return "Premium realtime voice is not configured on this desktop yet, so the phone should fall back deliberately instead of pretending both lanes are equal.";
  }
  if (connectionState === "reconnecting") {
    return "Premium realtime voice is configured, but Freedom is still restoring the live desktop link.";
  }
  return "Premium realtime voice cannot reach the desktop right now. Freedom Anywhere should keep capturing work and save it for later.";
}

function deriveDeferredExecutionState(host: HostRecord, connectionState: MobileConnectionState): DeferredExecutionState {
  const routerConfig = getModelRouterConfig(process.env);

  if (connectionState === "stand_alone" || connectionState === "reconnecting") {
    return "awaiting_desktop";
  }

  if (host.auth.status !== "logged_in" && !hasRunnableLocalDayToDay(routerConfig)) {
    return "failed_needs_review";
  }

  if (!host.tailscale.connected || host.tailscale.transportSecurity === "insecure") {
    return "failed_needs_review";
  }

  return "ready_to_execute";
}

function describeDeferredExecutionState(state: DeferredExecutionState): string {
  switch (state) {
    case "ready_to_execute":
      return "The desktop path is live again, so the next governed action can run when requested.";
    case "awaiting_desktop":
      return "Preserve intent now and wait for the desktop to return before execution resumes.";
    default:
      return "Deferred work needs review before Freedom should continue.";
  }
}

function deriveHostAvailability(host: HostRecord): HostAvailability {
  const connectionState = deriveConnectionState(host);

  if (connectionState === "reconnecting") {
    return "reconnecting";
  }
  if (connectionState === "stand_alone") {
    return "offline";
  }
  if (host.auth.status !== "logged_in") {
    return "codex_unavailable";
  }
  if (!host.tailscale.connected) {
    return "tailscale_unavailable";
  }
  if (host.tailscale.transportSecurity === "insecure") {
    return "needs_attention";
  }
  if (connectionState === "desktop_linked") {
    return "ready";
  }
  return "needs_attention";
}

function deriveRepairState(host: HostRecord): RepairState {
  const connectionState = deriveConnectionState(host);
  if (connectionState === "desktop_linked") {
    return "healthy";
  }
  if (connectionState === "reconnecting") {
    return "reconnecting";
  }
  return "repair_required";
}

function buildWakeControl(env: NodeJS.ProcessEnv, host: HostRecord): WakeControl {
  const wakeControl = resolveWakeControl(env);
  if (!wakeControl.enabled) {
    return wakeControl;
  }

  return {
    ...wakeControl,
    targetLabel: wakeControl.targetLabel ?? host.hostName
  };
}

function deriveRunState(sessions: SessionRecord[], hostId: string): RunState {
  if (sessions.some((item) => item.hostId === hostId && item.status === "stopping")) {
    return "stopping";
  }
  if (sessions.some((item) => item.hostId === hostId && item.status === "running")) {
    return "running";
  }
  if (sessions.some((item) => item.hostId === hostId && item.status === "queued")) {
    return "sending";
  }
  if (sessions.some((item) => item.hostId === hostId && item.status === "error")) {
    return "failed";
  }
  return "ready";
}

function isInterruptClaimStale(value: string): boolean {
  return Date.now() - new Date(value).getTime() >= INTERRUPT_RECLAIM_MS;
}

function migrateState(input: Partial<GatewayState>): GatewayState {
  const now = nowIso();
  const state = {
    hosts: (input.hosts ?? []).map((host) => {
      const record = host as Partial<HostRecord>;
      return {
        ...record,
        auth: record.auth ?? defaultAuthState,
        voiceProfile: normalizeStoredVoiceProfile(record.voiceProfile ?? null),
        tailscale: {
          ...defaultTailscaleStatus,
          ...(record.tailscale ?? {})
        }
      } as HostRecord;
    }),
    devices: (input.devices ?? []).map((device) => {
      const record = device as Partial<DeviceRecord>;
      return {
        ...record,
        pushToken: record.pushToken ?? null,
        notificationPrefs: record.notificationPrefs ?? defaultNotificationPrefs,
        revokedAt: record.revokedAt ?? null,
        lastNotificationAt: record.lastNotificationAt ?? null,
        repairCount: record.repairCount ?? 0,
        repairedAt: record.repairedAt ?? null
      } as DeviceRecord;
    }),
    sessions: (input.sessions ?? []).map((session) => {
      const record = session as Partial<SessionRecord>;
      const isOperator = isPrimaryFreedomSessionTitle(record.title);
      const sessionId = record.id ?? createId("session");
      const workspaceContext = record.rootPath ?? null;
      return {
        ...record,
        id: sessionId,
        title: record.kind === "operator" && isOperator ? FREEDOM_PRIMARY_SESSION_TITLE : record.title,
        kind: record.kind ?? (isOperator ? "operator" : "project"),
        pinned: record.pinned ?? isOperator,
        archived: record.archived ?? false,
        identity:
          record.identity ??
          buildSessionIdentity({
            sessionId,
            originSurface: "mobile_companion",
            workspaceContext
          }),
        lastPreview: record.lastPreview ?? null,
        lastActivityAt: record.lastActivityAt ?? record.updatedAt ?? now,
        claimedMessageId: record.claimedMessageId ?? null,
        stopClaimedAt: record.stopClaimedAt ?? null
      } as SessionRecord;
    }),
    tasks: ((input as Partial<GatewayState>).tasks ?? []).map((task) => {
      const record = task as Partial<TaskRecord>;
      return {
        id: record.id ?? createId("task"),
        sessionId: record.sessionId ?? "",
        userMessageId: record.userMessageId ?? "",
        assistantMessageId: record.assistantMessageId ?? null,
        title: record.title ?? "Freedom task",
        status: record.status ?? "queued",
        priority: record.priority ?? "normal",
        origin: record.origin ?? "user_message",
        parentTaskId: record.parentTaskId ?? null,
        canRunInParallel: record.canRunInParallel ?? false,
        interruptType: record.interruptType ?? null,
        threadId: record.threadId ?? null,
        turnId: record.turnId ?? null,
        resumeContext: record.resumeContext ?? null,
        toolState: record.toolState ?? null,
        resourceKey: record.resourceKey ?? "",
        readOnly: record.readOnly ?? false,
        stopRequested: record.stopRequested ?? false,
        interruptClaimedAt: record.interruptClaimedAt ?? null,
        lastError: record.lastError ?? null,
        createdAt: record.createdAt ?? now,
        updatedAt: record.updatedAt ?? record.createdAt ?? now,
        claimedAt: record.claimedAt ?? null
      } as TaskRecord;
    }),
    messages: (input.messages ?? []).map((message) => {
      const record = message as Partial<ChatMessage>;
      return {
        ...record,
        inputMode: record.inputMode ?? null,
        responseStyle: record.responseStyle ?? null,
        transcriptPolished: record.transcriptPolished ?? null
      } as ChatMessage;
    }),
    voiceRuntimeSessions: ((input as Partial<GatewayState>).voiceRuntimeSessions ?? []).map((record) => ({
      roomName: record.roomName ?? "",
      hostId: record.hostId ?? "",
      deviceId: record.deviceId ?? "",
      chatSessionId: record.chatSessionId ?? "",
      voiceSessionId: record.voiceSessionId ?? "",
      participantIdentity: record.participantIdentity ?? "",
      createdAt: record.createdAt ?? now,
      expiresAt: record.expiresAt ?? now,
    })),
    outboundRecipients: (input.outboundRecipients ?? []).map((recipient) => {
      const record = recipient as Partial<OutboundRecipientRecord>;
      return {
        id: record.id ?? createId("recipient"),
        hostId: record.hostId ?? "",
        label: record.label ?? record.destination ?? "Recipient",
        channel: "email",
        destination: record.destination ?? "",
        createdAt: record.createdAt ?? now,
        updatedAt: record.updatedAt ?? record.createdAt ?? now
      } as OutboundRecipientRecord;
    }),
    auditEvents: (input.auditEvents ?? []).map((event) => {
      const record = event as Partial<AuditEvent>;
      return {
        ...record,
        id: record.id ?? createId("audit"),
        hostId: record.hostId ?? "",
        deviceId: record.deviceId ?? null,
        sessionId: record.sessionId ?? null,
        type: record.type ?? "unknown",
        originSurface: record.originSurface ?? null,
        auditCorrelationId: record.auditCorrelationId ?? null,
        detail: record.detail ?? null,
        createdAt: record.createdAt ?? now
      } as AuditEvent;
    })
  };
  backfillLegacyTasks(state);
  return state;
}

function buildSessionIdentity(input: {
  sessionId: string;
  originSurface: "desktop_shell" | "mobile_companion";
  workspaceContext: string | null;
}) {
  return {
    productName: FREEDOM_PRODUCT_NAME,
    assistantName: FREEDOM_PRODUCT_NAME,
    freedomSessionId: input.sessionId,
    originSurface: input.originSurface,
    workspaceContext: input.workspaceContext,
    auditCorrelationId: createId("auditcorr")
  } as const;
}

function buildDesktopShellDeviceId(hostId: string): string {
  return `desktop-shell:${hostId}`;
}

function toPublicTask(task: TaskRecord): TaskItem {
  const { claimedAt, ...publicTask } = task;
  void claimedAt;
  return publicTask;
}

function listSessionTasks(state: GatewayState, sessionId: string): TaskRecord[] {
  return state.tasks
    .filter((task) => task.sessionId === sessionId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function findTaskForHostState(state: GatewayState, taskId: string, hostId: string): TaskRecord {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }
  const session = state.sessions.find((item) => item.id === task.sessionId && item.hostId === hostId);
  if (!session) {
    throw new Error("Task not found.");
  }
  return task;
}

function findTaskByTurn(state: GatewayState, sessionId: string, turnId: string): TaskRecord | null {
  return state.tasks.find((task) => task.sessionId === sessionId && task.turnId === turnId) ?? null;
}

function isTaskRunning(task: TaskRecord): boolean {
  return task.status === "running" || task.status === "paused" || task.status === "waiting_input";
}

function inferTaskReadOnly(text: string): boolean {
  return !/\b(write|edit|change|update|create|delete|remove|fix|implement|refactor|rename|commit|push|deploy|send)\b/i.test(text);
}

function classifyInterruptType(text: string, activeTasks: TaskRecord[]): InterruptType | null {
  if (!activeTasks.length) {
    return null;
  }

  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return "clarification";
  }

  if (/\b(stop|cancel|never mind|forget it)\b/.test(normalized) && !/\b(switch|instead|also|while|but)\b/.test(normalized)) {
    return "stop_task";
  }

  if (/\b(stop that|cancel that|switch to|instead|replace|drop that|move to|focus on)\b/.test(normalized)) {
    return "replace_task";
  }

  if (/^(actually|clarify|to clarify|i mean|what i meant)/.test(normalized)) {
    return "clarification";
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (/\?$/.test(normalized) || /^(what|which|when|where|who|why|how|is|are|do|does|did|can|could|would)\b/.test(normalized) || wordCount <= 8) {
    return "quick_question";
  }

  return "parallel_subtask";
}

function deriveTaskPriority(interruptType: InterruptType | null): TaskRecord["priority"] {
  if (interruptType === "replace_task" || interruptType === "stop_task") {
    return "high";
  }
  if (interruptType === "quick_question" || interruptType === "clarification") {
    return "normal";
  }
  return "normal";
}

function canRunTaskInParallel(candidate: TaskRecord, runningTasks: TaskRecord[]): boolean {
  if (!runningTasks.length) {
    return true;
  }

  if (candidate.interruptType === "replace_task" || candidate.interruptType === "stop_task") {
    return false;
  }

  if (candidate.interruptType === "quick_question" || candidate.interruptType === "clarification") {
    return candidate.readOnly;
  }

  if (!candidate.canRunInParallel) {
    return false;
  }

  return runningTasks.every((task) => task.resourceKey !== candidate.resourceKey || (task.readOnly && candidate.readOnly));
}

function syncSessionFromTasks(state: GatewayState, session: SessionRecord): void {
  const sessionTasks = listSessionTasks(state, session.id);
  const runningTasks = sessionTasks.filter(isTaskRunning);
  const queuedTasks = sessionTasks.filter((task) => task.status === "queued");
  const failedTask = [...sessionTasks].reverse().find((task) => task.status === "failed") ?? null;
  const latestTaskWithThread = [...sessionTasks].reverse().find((task) => task.threadId) ?? null;
  const latestTask = [...sessionTasks].reverse()[0] ?? null;

  session.activeTurnId = runningTasks[0]?.turnId ?? null;
  session.threadId = latestTaskWithThread?.threadId ?? session.threadId;
  session.stopRequested = sessionTasks.some((task) => task.stopRequested);
  session.stopClaimedAt = runningTasks.find((task) => task.stopRequested)?.interruptClaimedAt ?? null;

  if (runningTasks.some((task) => task.stopRequested)) {
    session.status = "stopping";
  } else if (runningTasks.length) {
    session.status = "running";
  } else if (queuedTasks.length) {
    session.status = "queued";
  } else if (failedTask) {
    session.status = "error";
  } else {
    session.status = "idle";
  }

  session.lastError = failedTask?.lastError ?? null;
  session.lastActivityAt = latestTask?.updatedAt ?? session.lastActivityAt ?? session.updatedAt;
  session.updatedAt = latestTask?.updatedAt ?? session.updatedAt;
  session.claimedMessageId = queuedTasks.find((task) => task.claimedAt)?.userMessageId ?? null;
}

function markQueuedTaskCancelled(state: GatewayState, task: TaskRecord, reason: string): void {
  task.status = "cancelled";
  task.claimedAt = null;
  task.stopRequested = false;
  task.interruptClaimedAt = null;
  task.lastError = reason;
  task.updatedAt = nowIso();

  const userMessage = state.messages.find((message) => message.id === task.userMessageId && message.sessionId === task.sessionId);
  if (userMessage && userMessage.status === "pending") {
    userMessage.status = "interrupted";
    userMessage.errorMessage = reason;
    userMessage.updatedAt = task.updatedAt;
  }
}

function requestStopForSessionTasks(state: GatewayState, sessionId: string, reason: string): void {
  for (const task of listSessionTasks(state, sessionId)) {
    if (task.status === "queued") {
      markQueuedTaskCancelled(state, task, reason);
      continue;
    }
    if (isTaskRunning(task)) {
      task.stopRequested = true;
      task.interruptClaimedAt = null;
      task.updatedAt = nowIso();
    }
  }
}

function backfillLegacyTasks(state: GatewayState): void {
  const now = nowIso();

  for (const session of state.sessions) {
    if (state.tasks.some((task) => task.sessionId === session.id)) {
      continue;
    }

    const sessionMessages = state.messages
      .filter((message) => message.sessionId === session.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const latestUserMessage = [...sessionMessages].reverse().find((message) => message.role === "user") ?? null;
    const pendingUserMessage =
      [...sessionMessages].reverse().find((message) => message.role === "user" && message.status === "pending") ?? latestUserMessage;
    const streamingAssistantMessage =
      [...sessionMessages].reverse().find((message) => message.role === "assistant" && message.status === "streaming") ?? null;

    const needsLegacyTask =
      session.status === "queued" ||
      session.status === "running" ||
      session.status === "stopping" ||
      Boolean(session.activeTurnId) ||
      Boolean(session.claimedMessageId);

    if (!needsLegacyTask || !pendingUserMessage) {
      continue;
    }

    state.tasks.push({
      id: createId("task"),
      sessionId: session.id,
      userMessageId: pendingUserMessage.id,
      assistantMessageId: streamingAssistantMessage?.id ?? null,
      title: truncatePreview(session.lastPreview ?? pendingUserMessage.content),
      status:
        session.status === "queued"
          ? "queued"
          : session.status === "running" || session.status === "stopping" || session.activeTurnId
            ? "running"
            : "queued",
      priority: "normal",
      origin: "user_message",
      parentTaskId: null,
      canRunInParallel: false,
      interruptType: null,
      threadId: session.threadId,
      turnId: session.activeTurnId,
      resumeContext: null,
      toolState: null,
      resourceKey: session.rootPath,
      readOnly: inferTaskReadOnly(pendingUserMessage.content),
      stopRequested: session.stopRequested,
      interruptClaimedAt: session.stopClaimedAt,
      lastError: session.lastError,
      createdAt: pendingUserMessage.createdAt ?? now,
      updatedAt: session.updatedAt ?? pendingUserMessage.updatedAt ?? now,
      claimedAt: session.status === "queued" && session.claimedMessageId ? session.updatedAt : null
    });
  }

  for (const session of state.sessions) {
    syncSessionFromTasks(state, session);
  }
}
