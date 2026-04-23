import { z } from "zod";
import { FREEDOM_PRODUCT_NAME } from "../freedom.js";
import {
  deferredExecutionStates,
  mobileConnectionStates,
  mobileVoiceStates
} from "../mobileExperience.js";
import {
  buildLaneApprovalStates,
  buildLaneRequestedFromValues
} from "../conversationBuildLane.js";
import {
  assistantVoicePresetIds,
  voiceGenderPresentationIds,
  voicePaceIds,
  voiceWarmthIds
} from "../voiceProfile.js";

export const hostAuthStatusSchema = z.enum(["logged_in", "logged_out", "error"]);
export const chatSessionStatusSchema = z.enum(["idle", "queued", "running", "stopping", "error"]);
export const chatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export const chatMessageStatusSchema = z.enum(["pending", "streaming", "completed", "failed", "interrupted"]);
export const streamEventTypeSchema = z.enum(["host_status", "session_upsert", "message_upsert"]);
export const taskStatusSchema = z.enum(["queued", "running", "paused", "waiting_input", "completed", "failed", "cancelled"]);
export const taskPrioritySchema = z.enum(["low", "normal", "high"]);
export const taskOriginSchema = z.enum(["user_message", "interrupt", "system"]);
export const interruptTypeSchema = z.enum(["quick_question", "clarification", "parallel_subtask", "replace_task", "stop_task"]);
export const hostAvailabilitySchema = z.enum([
  "ready",
  "offline",
  "reconnecting",
  "repair_needed",
  "codex_unavailable",
  "tailscale_unavailable",
  "needs_attention"
]);
export const repairStateSchema = z.enum(["healthy", "reconnecting", "repair_required", "repaired"]);
export const mobileConnectionStateSchema = z.enum(mobileConnectionStates);
export const mobileVoiceStateSchema = z.enum(mobileVoiceStates);
export const deferredExecutionStateSchema = z.enum(deferredExecutionStates);
export const runStateSchema = z.enum(["ready", "listening", "review", "sending", "running", "stopping", "speaking", "completed", "failed"]);
export const sessionKindSchema = z.enum(["operator", "project", "admin", "build", "notes"]);
export const sessionOriginSurfaceSchema = z.enum(["desktop_shell", "mobile_companion"]);
export const responseStyleSchema = z.enum(["natural", "executive", "technical", "concise"]);
export const notificationEventSchema = z.enum(["run_complete", "run_failed", "repair_needed", "approval_needed"]);
export const inputModeSchema = z.enum(["text", "voice", "voice_polished"]);
export const transportSecuritySchema = z.enum(["secure", "insecure", "unknown"]);
export const outboundProviderSchema = z.enum(["none", "resend"]);
export const outboundChannelSchema = z.enum(["email"]);
export const wakeRequestStatusSchema = z.enum(["sent", "awake", "timeout", "error"]);
export const voiceRuntimeModeSchema = z.enum(["realtime_primary", "device_fallback", "on_device_offline"]);
export const voiceTransportSchema = z.enum(["livekit_webrtc", "device_local"]);
export const assistantVoicePresetSchema = z.enum(assistantVoicePresetIds);
export const voiceGenderPresentationSchema = z.enum(voiceGenderPresentationIds);
export const voiceWarmthSchema = z.enum(voiceWarmthIds);
export const voicePaceSchema = z.enum(voicePaceIds);
export const buildLaneApprovalStateSchema = z.enum(buildLaneApprovalStates);
export const buildLaneRequestedFromSchema = z.enum(buildLaneRequestedFromValues);

export const assistantVoiceProfileSchema = z.object({
  targetVoice: assistantVoicePresetSchema,
  displayName: z.string().min(1),
  gender: voiceGenderPresentationSchema,
  accent: z.string().min(1).max(80).nullable(),
  tone: z.string().min(1).max(160).nullable(),
  warmth: voiceWarmthSchema,
  pace: voicePaceSchema,
  notes: z.string().min(1).max(280).nullable(),
  source: z.enum(["default", "conversation", "manual"]),
  updatedAt: z.string().datetime()
});

export const conversationBuildLaneItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  objective: z.string(),
  businessCase: z.string(),
  operator: z.string().min(1),
  approvalState: buildLaneApprovalStateSchema,
  autonomyEnvelope: z.string(),
  executionSurface: z.string(),
  reportingPath: z.string(),
  nextCheckpoint: z.string(),
  requestedBy: z.string().min(1),
  requestedFrom: buildLaneRequestedFromSchema,
  pricingModel: z.string().min(1).nullable(),
  scalePotential: z.string().min(1).nullable(),
  hostId: z.string().min(1).nullable(),
  requestedAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const conversationBuildLaneSummarySchema = z.object({
  configured: z.boolean(),
  items: z.array(conversationBuildLaneItemSchema),
  pendingCount: z.number().int().nonnegative(),
  approvedCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative()
});

export const updateHostVoiceProfileRequestSchema = z
  .object({
    resetToDefault: z.boolean().optional(),
    targetVoice: assistantVoicePresetSchema.optional(),
    gender: voiceGenderPresentationSchema.optional(),
    accent: z.string().min(1).max(80).nullable().optional(),
    tone: z.string().min(1).max(160).nullable().optional(),
    warmth: voiceWarmthSchema.optional(),
    pace: voicePaceSchema.optional(),
    notes: z.string().min(1).max(280).nullable().optional()
  })
  .refine((input) => input.resetToDefault || Object.keys(input).some((key) => key !== "resetToDefault"), {
    message: "Voice profile update must set a preference or reset to default."
  });

export const hostAuthStateSchema = z.object({
  status: hostAuthStatusSchema,
  detail: z.string().nullable()
});

export const tailscaleStatusSchema = z.object({
  installed: z.boolean(),
  connected: z.boolean(),
  detail: z.string().nullable(),
  dnsName: z.string().nullable(),
  ipv4: z.string().nullable(),
  suggestedUrl: z.string().nullable(),
  transportSecurity: transportSecuritySchema,
  installUrl: z.string().url(),
  loginUrl: z.string().url()
});

export const notificationPrefsSchema = z.object({
  run_complete: z.boolean(),
  run_failed: z.boolean(),
  repair_needed: z.boolean(),
  approval_needed: z.boolean()
});

export const wakeControlSchema = z.object({
  enabled: z.boolean(),
  relayBaseUrl: z.string().url().nullable(),
  relayToken: z.string().nullable(),
  targetId: z.string().nullable(),
  targetLabel: z.string().nullable()
});

export const outboundEmailStatusSchema = z.object({
  enabled: z.boolean(),
  provider: outboundProviderSchema,
  fromAddress: z.string().email().nullable(),
  replyToAddress: z.string().email().nullable(),
  recipientCount: z.number().int().nonnegative()
});

export const registeredHostSchema = z.object({
  id: z.string().min(1),
  hostName: z.string().min(1),
  approvedRoots: z.array(z.string().min(1)).min(1),
  pairingCode: z.string().min(6).max(6),
  pairingCodeIssuedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  isOnline: z.boolean()
});

export const pairedDeviceSchema = z.object({
  id: z.string().min(1),
  hostId: z.string().min(1),
  deviceName: z.string().min(1),
  pushToken: z.string().nullable(),
  notificationPrefs: notificationPrefsSchema,
  revokedAt: z.string().datetime().nullable(),
  lastNotificationAt: z.string().datetime().nullable(),
  repairCount: z.number().int().nonnegative(),
  repairedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime()
});

export const freedomSessionIdentitySchema = z.object({
  productName: z.literal(FREEDOM_PRODUCT_NAME),
  assistantName: z.string().min(1),
  freedomSessionId: z.string().min(1),
  originSurface: sessionOriginSurfaceSchema,
  workspaceContext: z.string().nullable(),
  auditCorrelationId: z.string().min(1)
});

export const voiceSessionBindingSchema = z.object({
  voiceSessionId: z.string().min(1),
  chatSessionId: z.string().min(1),
  assistantName: z.string().min(1),
  model: z.string().min(1),
  runtimeMode: voiceRuntimeModeSchema,
  transport: voiceTransportSchema,
  roomName: z.string().min(1).nullable(),
  participantIdentity: z.string().min(1).nullable(),
  degraded: z.boolean()
});

export const chatSessionSchema = z.object({
  id: z.string().min(1),
  hostId: z.string().min(1),
  deviceId: z.string().min(1),
  title: z.string().min(1),
  kind: sessionKindSchema,
  pinned: z.boolean(),
  archived: z.boolean(),
  rootPath: z.string().min(1),
  threadId: z.string().nullable(),
  status: chatSessionStatusSchema,
  identity: freedomSessionIdentitySchema,
  activeTurnId: z.string().nullable(),
  stopRequested: z.boolean(),
  lastError: z.string().nullable(),
  lastPreview: z.string().nullable(),
  lastActivityAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  role: chatMessageRoleSchema,
  content: z.string(),
  status: chatMessageStatusSchema,
  errorMessage: z.string().nullable(),
  clientRequestId: z.string().min(1).max(160).nullable().optional(),
  inputMode: inputModeSchema.nullable().optional(),
  responseStyle: responseStyleSchema.nullable().optional(),
  transcriptPolished: z.boolean().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const taskItemSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  userMessageId: z.string().min(1),
  assistantMessageId: z.string().min(1).nullable(),
  title: z.string().min(1),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  origin: taskOriginSchema,
  parentTaskId: z.string().min(1).nullable(),
  canRunInParallel: z.boolean(),
  interruptType: interruptTypeSchema.nullable(),
  threadId: z.string().min(1).nullable(),
  turnId: z.string().min(1).nullable(),
  resumeContext: z.string().nullable(),
  toolState: z.record(z.string(), z.unknown()).nullable(),
  resourceKey: z.string().min(1),
  readOnly: z.boolean(),
  stopRequested: z.boolean(),
  interruptClaimedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const recentSessionActivitySchema = z.object({
  session: chatSessionSchema,
  latestUserMessage: chatMessageSchema.nullable(),
  latestAssistantMessage: chatMessageSchema.nullable(),
  lastMessageAt: z.string().datetime().nullable()
});

export const hostStatusSchema = z.object({
  host: registeredHostSchema,
  auth: hostAuthStateSchema,
  tailscale: tailscaleStatusSchema,
  wakeControl: wakeControlSchema,
  voiceProfile: assistantVoiceProfileSchema.optional(),
  outboundEmail: outboundEmailStatusSchema,
  connectionState: mobileConnectionStateSchema,
  connectionDetail: z.string().nullable(),
  voiceState: mobileVoiceStateSchema,
  voiceDetail: z.string().nullable(),
  deferredExecutionState: deferredExecutionStateSchema,
  deferredExecutionDetail: z.string().nullable(),
  availability: hostAvailabilitySchema,
  repairState: repairStateSchema,
  runState: runStateSchema,
  activeSessionCount: z.number().int().nonnegative(),
  pairedDeviceCount: z.number().int().nonnegative()
});

export const auditEventSchema = z.object({
  id: z.string().min(1),
  hostId: z.string().min(1),
  deviceId: z.string().nullable(),
  sessionId: z.string().nullable(),
  type: z.string().min(1),
  originSurface: sessionOriginSurfaceSchema.nullable().optional(),
  auditCorrelationId: z.string().min(1).nullable().optional(),
  detail: z.string().nullable(),
  createdAt: z.string().datetime()
});

export const gatewayOverviewSchema = z.object({
  hostStatus: hostStatusSchema.nullable(),
  lastSeenDevice: pairedDeviceSchema.nullable(),
  recentDevices: z.array(pairedDeviceSchema),
  recentSessions: z.array(chatSessionSchema),
  recentSessionActivity: z.array(recentSessionActivitySchema),
  auditEvents: z.array(auditEventSchema)
});

export const desktopOverviewResponseSchema = z.object({
  overview: gatewayOverviewSchema,
  publicBaseUrl: z.string().url(),
  dashboardUrl: z.string().url(),
  installUrl: z.string().url(),
  qrUrl: z.string().url(),
  apkDownloadUrl: z.string().url().nullable(),
  androidArtifact: z
    .object({
      fileName: z.string().min(1),
      sizeBytes: z.number().int().nonnegative()
    })
    .nullable()
});

export const registerHostRequestSchema = z.object({
  hostId: z.string().min(1).optional(),
  hostName: z.string().min(1),
  approvedRoots: z.array(z.string().min(1)).min(1)
});

export const registerHostResponseSchema = z.object({
  host: registeredHostSchema,
  hostToken: z.string().min(10),
  pairingCode: z.string().min(6).max(6)
});

export const pairingCompleteRequestSchema = z.object({
  pairingCode: z.string().min(6).max(6),
  deviceName: z.string().min(1)
});

export const pairingCompleteResponseSchema = z.object({
  deviceToken: z.string().min(10),
  device: pairedDeviceSchema,
  host: registeredHostSchema
});

export const createSessionRequestSchema = z.object({
  rootPath: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  kind: sessionKindSchema.optional(),
  originSurface: sessionOriginSurfaceSchema.optional(),
  starterPrompt: z.string().min(1).max(8000).optional()
});

export const updateSessionRequestSchema = z.object({
  title: z.string().min(1).max(120)
});

export const postMessageRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  inputMode: inputModeSchema.optional(),
  responseStyle: responseStyleSchema.optional(),
  transcriptPolished: z.boolean().optional()
});

export const offlineImportRequestSchema = z.object({
  clientImportId: z.string().min(1).max(160),
  summary: z.string().min(1).max(16000),
  draftTurns: z.array(z.string().min(1).max(8000)).min(1).max(50),
  createdAt: z.string().datetime(),
  source: z.literal("mobile_offline")
});

export const offlineImportResponseSchema = z.object({
  session: chatSessionSchema,
  messages: z.array(chatMessageSchema),
  imported: z.boolean()
});

export const hostHeartbeatRequestSchema = z.object({
  auth: hostAuthStateSchema,
  tailscale: tailscaleStatusSchema
});

export const hostWorkMessageSchema = z.object({
  type: z.literal("message"),
  session: chatSessionSchema,
  message: chatMessageSchema,
  task: taskItemSchema
});

export const hostWorkInterruptSchema = z.object({
  type: z.literal("interrupt"),
  session: chatSessionSchema,
  task: taskItemSchema,
  turnId: z.string().min(1)
});

export const hostWorkItemSchema = z.union([hostWorkMessageSchema, hostWorkInterruptSchema]);

export const hostStartTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  userMessageId: z.string().min(1),
  threadId: z.string().min(1),
  turnId: z.string().min(1),
  assistantMessageId: z.string().min(1)
});

export const hostAssistantDeltaRequestSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  assistantMessageId: z.string().min(1),
  delta: z.string()
});

export const hostCompleteTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  userMessageId: z.string().min(1),
  assistantMessageId: z.string().min(1),
  threadId: z.string().min(1),
  turnId: z.string().min(1)
});

export const hostFailTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  userMessageId: z.string().min(1),
  assistantMessageId: z.string().min(1).nullable().optional(),
  threadId: z.string().min(1).nullable().optional(),
  turnId: z.string().min(1).nullable().optional(),
  errorMessage: z.string().min(1)
});

export const hostInterruptTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
  assistantMessageId: z.string().min(1).nullable().optional(),
  turnId: z.string().min(1)
});

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("host_status"),
    hostStatus: hostStatusSchema
  }),
  z.object({
    type: z.literal("session_upsert"),
    session: chatSessionSchema
  }),
  z.object({
    type: z.literal("message_upsert"),
    sessionId: z.string().min(1),
    message: chatMessageSchema
  })
]);

export const realtimeTicketResponseSchema = z.object({
  ticket: z.string().min(10),
  expiresAt: z.string().datetime()
});

export const createVoiceRuntimeSessionRequestSchema = z.object({
  voiceSessionId: z.string().min(8).max(120),
  chatSessionId: z.string().min(1),
  assistantName: z.string().min(1).max(120).optional()
});

export const voiceRuntimeSessionResponseSchema = z.object({
  token: z.string().min(1),
  wsUrl: z.string().min(1),
  roomName: z.string().min(1),
  participantIdentity: z.string().min(1),
  expiresAt: z.string().datetime(),
  binding: voiceSessionBindingSchema
});

export const hostVoiceProfileResponseSchema = assistantVoiceProfileSchema;
export const hostBuildLaneResponseSchema = conversationBuildLaneSummarySchema;

export const renameDeviceRequestSchema = z.object({
  deviceName: z.string().min(1).max(120)
});

export const registerPushTokenRequestSchema = z.object({
  pushToken: z.string().min(1)
});

export const updateNotificationPrefsRequestSchema = notificationPrefsSchema;

export const sendTestNotificationRequestSchema = z.object({
  event: notificationEventSchema
});

export const outboundRecipientSchema = z.object({
  id: z.string().min(1),
  hostId: z.string().min(1),
  label: z.string().min(1),
  channel: outboundChannelSchema,
  destination: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createOutboundRecipientRequestSchema = z.object({
  label: z.string().min(1).max(120),
  destination: z.string().email()
});

export const sendExternalMessageRequestSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  recipientId: z.string().min(1).optional(),
  recipientDestination: z.string().email().optional(),
  recipientLabel: z.string().min(1).max(120).optional(),
  subject: z.string().min(1).max(160),
  intro: z.string().max(1200).optional()
}).refine((value) => Boolean(value.recipientId || value.recipientDestination), {
  message: "Choose a stored recipient or provide an email destination.",
  path: ["recipientId"]
});

export const sendExternalMessageResponseSchema = z.object({
  ok: z.literal(true),
  deliveryId: z.string().min(1),
  recipient: outboundRecipientSchema,
  channel: outboundChannelSchema,
  deliveredAt: z.string().datetime()
});

export const wakeRelayRequestSchema = z.object({
  targetId: z.string().min(1)
});

export const wakeRelayResponseSchema = z.object({
  targetId: z.string().min(1),
  targetLabel: z.string().min(1),
  status: wakeRequestStatusSchema,
  detail: z.string().nullable(),
  requestedAt: z.string().datetime(),
  completedAt: z.string().datetime()
});

export const wakeRelayTargetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1)
});

export const wakeRelayTargetsResponseSchema = z.object({
  targets: z.array(wakeRelayTargetSchema)
});

export type HostAuthStatus = z.infer<typeof hostAuthStatusSchema>;
export type ChatSessionStatus = z.infer<typeof chatSessionStatusSchema>;
export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatMessageStatus = z.infer<typeof chatMessageStatusSchema>;
export type StreamEventType = z.infer<typeof streamEventTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskOrigin = z.infer<typeof taskOriginSchema>;
export type InterruptType = z.infer<typeof interruptTypeSchema>;
export type HostAvailability = z.infer<typeof hostAvailabilitySchema>;
export type RepairState = z.infer<typeof repairStateSchema>;
export type MobileConnectionState = z.infer<typeof mobileConnectionStateSchema>;
export type MobileVoiceState = z.infer<typeof mobileVoiceStateSchema>;
export type DeferredExecutionState = z.infer<typeof deferredExecutionStateSchema>;
export type RunState = z.infer<typeof runStateSchema>;
export type SessionKind = z.infer<typeof sessionKindSchema>;
export type ResponseStyle = z.infer<typeof responseStyleSchema>;
export type NotificationEvent = z.infer<typeof notificationEventSchema>;
export type InputMode = z.infer<typeof inputModeSchema>;
export type TransportSecurity = z.infer<typeof transportSecuritySchema>;
export type OutboundProvider = z.infer<typeof outboundProviderSchema>;
export type OutboundChannel = z.infer<typeof outboundChannelSchema>;
export type WakeRequestStatus = z.infer<typeof wakeRequestStatusSchema>;
export type AssistantVoicePreset = z.infer<typeof assistantVoicePresetSchema>;
export type VoiceGenderPresentation = z.infer<typeof voiceGenderPresentationSchema>;
export type VoiceWarmth = z.infer<typeof voiceWarmthSchema>;
export type VoicePace = z.infer<typeof voicePaceSchema>;
export type HostAuthState = z.infer<typeof hostAuthStateSchema>;
export type TailscaleStatus = z.infer<typeof tailscaleStatusSchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type WakeControl = z.infer<typeof wakeControlSchema>;
export type OutboundEmailStatus = z.infer<typeof outboundEmailStatusSchema>;
export type AssistantVoiceProfile = z.infer<typeof assistantVoiceProfileSchema>;
export type ConversationBuildLaneItem = z.infer<typeof conversationBuildLaneItemSchema>;
export type ConversationBuildLaneSummary = z.infer<typeof conversationBuildLaneSummarySchema>;
export type RegisteredHost = z.infer<typeof registeredHostSchema>;
export type PairedDevice = z.infer<typeof pairedDeviceSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type TaskItem = z.infer<typeof taskItemSchema>;
export type RecentSessionActivity = z.infer<typeof recentSessionActivitySchema>;
export type HostStatus = z.infer<typeof hostStatusSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type GatewayOverview = z.infer<typeof gatewayOverviewSchema>;
export type DesktopOverviewResponse = z.infer<typeof desktopOverviewResponseSchema>;
export type RegisterHostRequest = z.infer<typeof registerHostRequestSchema>;
export type RegisterHostResponse = z.infer<typeof registerHostResponseSchema>;
export type PairingCompleteRequest = z.infer<typeof pairingCompleteRequestSchema>;
export type PairingCompleteResponse = z.infer<typeof pairingCompleteResponseSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type UpdateSessionRequest = z.infer<typeof updateSessionRequestSchema>;
export type PostMessageRequest = z.infer<typeof postMessageRequestSchema>;
export type OfflineImportRequest = z.infer<typeof offlineImportRequestSchema>;
export type OfflineImportResponse = z.infer<typeof offlineImportResponseSchema>;
export type HostHeartbeatRequest = z.infer<typeof hostHeartbeatRequestSchema>;
export type HostWorkMessage = z.infer<typeof hostWorkMessageSchema>;
export type HostWorkInterrupt = z.infer<typeof hostWorkInterruptSchema>;
export type HostWorkItem = z.infer<typeof hostWorkItemSchema>;
export type HostStartTurnRequest = z.infer<typeof hostStartTurnRequestSchema>;
export type HostAssistantDeltaRequest = z.infer<typeof hostAssistantDeltaRequestSchema>;
export type HostCompleteTurnRequest = z.infer<typeof hostCompleteTurnRequestSchema>;
export type HostFailTurnRequest = z.infer<typeof hostFailTurnRequestSchema>;
export type HostInterruptTurnRequest = z.infer<typeof hostInterruptTurnRequestSchema>;
export type StreamEvent = z.infer<typeof streamEventSchema>;
export type RealtimeTicketResponse = z.infer<typeof realtimeTicketResponseSchema>;
export type CreateVoiceRuntimeSessionRequest = z.infer<typeof createVoiceRuntimeSessionRequestSchema>;
export type VoiceRuntimeSessionResponse = z.infer<typeof voiceRuntimeSessionResponseSchema>;
export type UpdateHostVoiceProfileRequest = z.infer<typeof updateHostVoiceProfileRequestSchema>;
export type HostVoiceProfileResponse = z.infer<typeof hostVoiceProfileResponseSchema>;
export type HostBuildLaneResponse = z.infer<typeof hostBuildLaneResponseSchema>;
export type RenameDeviceRequest = z.infer<typeof renameDeviceRequestSchema>;
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>;
export type UpdateNotificationPrefsRequest = z.infer<typeof updateNotificationPrefsRequestSchema>;
export type SendTestNotificationRequest = z.infer<typeof sendTestNotificationRequestSchema>;
export type OutboundRecipient = z.infer<typeof outboundRecipientSchema>;
export type CreateOutboundRecipientRequest = z.infer<typeof createOutboundRecipientRequestSchema>;
export type SendExternalMessageRequest = z.infer<typeof sendExternalMessageRequestSchema>;
export type SendExternalMessageResponse = z.infer<typeof sendExternalMessageResponseSchema>;
export type WakeRelayRequest = z.infer<typeof wakeRelayRequestSchema>;
export type WakeRelayResponse = z.infer<typeof wakeRelayResponseSchema>;
export type WakeRelayTarget = z.infer<typeof wakeRelayTargetSchema>;
export type WakeRelayTargetsResponse = z.infer<typeof wakeRelayTargetsResponseSchema>;
