import type {
  ChatMessage,
  ChatSession,
  CreateOutboundRecipientRequest,
  CreateSessionRequest,
  CreateVoiceRuntimeSessionRequest,
  HostAssistantDeltaRequest,
  HostBuildLaneResponse,
  HostCompleteTurnRequest,
  HostFailTurnRequest,
  HostHeartbeatRequest,
  HostInterruptTurnRequest,
  HostVoiceProfileResponse,
  HostStartTurnRequest,
  HostStatus,
  HostWorkItem,
  OutboundRecipient,
  OfflineImportRequest,
  OfflineImportResponse,
  PairingCompleteResponse,
  PairedDevice,
  PostMessageRequest,
  RealtimeTicketResponse,
  RegisterPushTokenRequest,
  RegisterHostRequest,
  RegisterHostResponse,
  SendExternalMessageRequest,
  SendExternalMessageResponse,
  VoiceRuntimeSessionResponse
} from "../schemas/platform.js";
import type {
  NotificationEvent,
  RenameDeviceRequest,
  UpdateHostVoiceProfileRequest,
  UpdateNotificationPrefsRequest,
  UpdateSessionRequest
} from "../schemas/platform.js";

export interface HostWorkPollOptions {
  waitMs?: number;
  acceptQueued?: boolean;
}

export interface MobileApi {
  completePairing(baseUrl: string, pairingCode: string, deviceName: string): Promise<PairingCompleteResponse>;
  getHostStatus(token: string): Promise<HostStatus>;
  getBuildLaneSummary(token: string): Promise<HostBuildLaneResponse>;
  listSessions(token: string): Promise<ChatSession[]>;
  listDevices(token: string): Promise<PairedDevice[]>;
  createSession(token: string, input: CreateSessionRequest): Promise<ChatSession>;
  updateSession(token: string, sessionId: string, input: UpdateSessionRequest): Promise<ChatSession>;
  deleteSession(token: string, sessionId: string): Promise<{ ok: true; deletedSessionId: string }>;
  listMessages(token: string, sessionId: string): Promise<ChatMessage[]>;
  postMessage(token: string, sessionId: string, input: PostMessageRequest): Promise<ChatMessage>;
  importOfflineSession(token: string, sessionId: string, input: OfflineImportRequest): Promise<OfflineImportResponse>;
  stopSession(token: string, sessionId: string): Promise<ChatSession>;
  createRealtimeTicket(token: string): Promise<RealtimeTicketResponse>;
  createVoiceRuntimeSession(token: string, input: CreateVoiceRuntimeSessionRequest): Promise<VoiceRuntimeSessionResponse>;
  renameDevice(token: string, deviceId: string, input: RenameDeviceRequest): Promise<PairedDevice>;
  revokeDevice(token: string, deviceId: string): Promise<PairedDevice>;
  registerPushToken(token: string, deviceId: string, input: RegisterPushTokenRequest): Promise<PairedDevice>;
  updateNotificationPrefs(token: string, deviceId: string, input: UpdateNotificationPrefsRequest): Promise<PairedDevice>;
  sendTestNotification(token: string, deviceId: string, event: NotificationEvent): Promise<{ ok: true; deviceId: string }>;
  listOutboundRecipients(token: string): Promise<OutboundRecipient[]>;
  createOutboundRecipient(token: string, input: CreateOutboundRecipientRequest): Promise<OutboundRecipient>;
  deleteOutboundRecipient(token: string, recipientId: string): Promise<{ ok: true; deletedRecipientId: string }>;
  sendExternalMessage(token: string, input: SendExternalMessageRequest): Promise<SendExternalMessageResponse>;
}

export interface HostApi {
  registerHost(input: RegisterHostRequest): Promise<RegisterHostResponse>;
  heartbeat(token: string, input: HostHeartbeatRequest): Promise<HostStatus>;
  getNextWork(token: string, options?: HostWorkPollOptions): Promise<HostWorkItem | null>;
  startTurn(token: string, input: HostStartTurnRequest): Promise<ChatSession>;
  appendAssistantDelta(token: string, input: HostAssistantDeltaRequest): Promise<ChatMessage>;
  completeTurn(token: string, input: HostCompleteTurnRequest): Promise<ChatSession>;
  failTurn(token: string, input: HostFailTurnRequest): Promise<ChatSession>;
  interruptTurn(token: string, input: HostInterruptTurnRequest): Promise<ChatSession>;
  getHostStatus(token: string): Promise<HostStatus>;
  getVoiceProfile(token: string): Promise<HostVoiceProfileResponse>;
  getBuildLaneSummary(token: string): Promise<HostBuildLaneResponse>;
  updateVoiceProfile(token: string, input: UpdateHostVoiceProfileRequest): Promise<HostVoiceProfileResponse>;
}
