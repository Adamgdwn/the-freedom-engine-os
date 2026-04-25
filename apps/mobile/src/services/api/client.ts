import type {
  AssistantVoiceProfile,
  AutonomousOperatorRun,
  ChatMessage,
  ChatSession,
  CreateOutboundRecipientRequest,
  CreateSessionRequest,
  CreateVoiceRuntimeSessionRequest,
  HostBuildLaneResponse,
  HostStatus,
  NotificationEvent,
  OfflineImportRequest,
  OfflineImportResponse,
  OutboundRecipient,
  OperatorRunPatch,
  PairingCompleteResponse,
  PairedDevice,
  PostMessageRequest,
  RegisterPushTokenRequest,
  RealtimeTicketResponse,
  RenameDeviceRequest,
  SendExternalMessageRequest,
  SendExternalMessageResponse,
  SyncMobileLearningSignalsRequest,
  SyncMobileLearningSignalsResponse,
  SyncMobileConversationMemoriesRequest,
  SyncMobileConversationMemoriesResponse,
  OperatorRunLedger,
  VoiceRuntimeSessionResponse,
  UpdateNotificationPrefsRequest,
  UpdateHostVoiceProfileRequest,
  UpdateSessionRequest
} from "@freedom/shared";

export class ApiClient {
  getMemoryDigest(
    token: string,
    baseUrl: string
  ): Promise<{ configured: boolean; updatedAt: string; context: string }> {
    return this.request("GET", `${baseUrl}/host/memory-digest`, token);
  }

  async completePairing(baseUrl: string, pairingCode: string, deviceName: string): Promise<PairingCompleteResponse> {
    return this.request("POST", `${baseUrl}/pairing/complete`, undefined, {
      pairingCode,
      deviceName
    });
  }

  getHostStatus(token: string, baseUrl: string): Promise<HostStatus> {
    return this.request("GET", `${baseUrl}/host/status`, token);
  }

  getBuildLaneSummary(token: string, baseUrl: string): Promise<HostBuildLaneResponse> {
    return this.request("GET", `${baseUrl}/host/build-lane`, token);
  }

  getOperatorRunLedger(token: string, baseUrl: string): Promise<OperatorRunLedger> {
    return this.request("GET", `${baseUrl}/host/operator-runs`, token);
  }

  createOperatorRun(
    token: string,
    baseUrl: string,
    input: AutonomousOperatorRun
  ): Promise<AutonomousOperatorRun> {
    return this.request("POST", `${baseUrl}/host/operator-runs`, token, input);
  }

  updateOperatorRun(
    token: string,
    baseUrl: string,
    runId: string,
    input: OperatorRunPatch
  ): Promise<AutonomousOperatorRun> {
    return this.request("POST", `${baseUrl}/host/operator-runs/${encodeURIComponent(runId)}/update`, token, input);
  }

  updateVoiceProfile(
    token: string,
    baseUrl: string,
    input: UpdateHostVoiceProfileRequest
  ): Promise<AssistantVoiceProfile> {
    return this.request("POST", `${baseUrl}/host/voice-profile`, token, input);
  }

  listSessions(token: string, baseUrl: string): Promise<ChatSession[]> {
    return this.request("GET", `${baseUrl}/sessions`, token);
  }

  listDevices(token: string, baseUrl: string): Promise<PairedDevice[]> {
    return this.request("GET", `${baseUrl}/devices`, token);
  }

  createSession(token: string, baseUrl: string, input: CreateSessionRequest): Promise<ChatSession> {
    return this.request("POST", `${baseUrl}/sessions`, token, input);
  }

  updateSession(token: string, baseUrl: string, sessionId: string, input: UpdateSessionRequest): Promise<ChatSession> {
    return this.request("PATCH", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}`, token, input);
  }

  deleteSession(token: string, baseUrl: string, sessionId: string): Promise<{ ok: true; deletedSessionId: string }> {
    return this.request("DELETE", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}`, token);
  }

  listMessages(token: string, baseUrl: string, sessionId: string): Promise<ChatMessage[]> {
    return this.request("GET", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/messages`, token);
  }

  postMessage(token: string, baseUrl: string, sessionId: string, input: PostMessageRequest): Promise<ChatMessage> {
    return this.request("POST", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/messages`, token, input);
  }

  importOfflineSession(
    token: string,
    baseUrl: string,
    sessionId: string,
    input: OfflineImportRequest
  ): Promise<OfflineImportResponse> {
    return this.request("POST", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/offline-import`, token, input);
  }

  stopSession(token: string, baseUrl: string, sessionId: string): Promise<ChatSession> {
    return this.request("POST", `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/stop`, token);
  }

  createRealtimeTicket(token: string, baseUrl: string): Promise<RealtimeTicketResponse> {
    return this.request("POST", `${baseUrl}/realtime/ticket`, token);
  }

  createVoiceRuntimeSession(
    token: string,
    baseUrl: string,
    input: CreateVoiceRuntimeSessionRequest
  ): Promise<VoiceRuntimeSessionResponse> {
    return this.request("POST", `${baseUrl}/voice/runtime/session`, token, input);
  }

  syncMobileLearningSignals(
    token: string,
    baseUrl: string,
    input: SyncMobileLearningSignalsRequest
  ): Promise<SyncMobileLearningSignalsResponse> {
    return this.request("POST", `${baseUrl}/host/learning-signals/sync`, token, input);
  }

  syncMobileConversationMemories(
    token: string,
    baseUrl: string,
    input: SyncMobileConversationMemoriesRequest
  ): Promise<SyncMobileConversationMemoriesResponse> {
    return this.request("POST", `${baseUrl}/host/conversation-memories/sync`, token, input);
  }

  renameDevice(token: string, baseUrl: string, deviceId: string, input: RenameDeviceRequest): Promise<PairedDevice> {
    return this.request("PATCH", `${baseUrl}/devices/${encodeURIComponent(deviceId)}`, token, input);
  }

  revokeDevice(token: string, baseUrl: string, deviceId: string): Promise<PairedDevice> {
    return this.request("POST", `${baseUrl}/devices/${encodeURIComponent(deviceId)}/revoke`, token);
  }

  registerPushToken(
    token: string,
    baseUrl: string,
    deviceId: string,
    input: RegisterPushTokenRequest
  ): Promise<PairedDevice> {
    return this.request("POST", `${baseUrl}/devices/${encodeURIComponent(deviceId)}/push-token`, token, input);
  }

  updateNotificationPrefs(
    token: string,
    baseUrl: string,
    deviceId: string,
    input: UpdateNotificationPrefsRequest
  ): Promise<PairedDevice> {
    return this.request("POST", `${baseUrl}/devices/${encodeURIComponent(deviceId)}/notification-prefs`, token, input);
  }

  sendTestNotification(token: string, baseUrl: string, deviceId: string, event: NotificationEvent): Promise<{ ok: true; deviceId: string }> {
    return this.request("POST", `${baseUrl}/devices/${encodeURIComponent(deviceId)}/test-notification`, token, { event });
  }

  listOutboundRecipients(token: string, baseUrl: string): Promise<OutboundRecipient[]> {
    return this.request("GET", `${baseUrl}/outbound/recipients`, token);
  }

  createOutboundRecipient(
    token: string,
    baseUrl: string,
    input: CreateOutboundRecipientRequest
  ): Promise<OutboundRecipient> {
    return this.request("POST", `${baseUrl}/outbound/recipients`, token, input);
  }

  deleteOutboundRecipient(token: string, baseUrl: string, recipientId: string): Promise<{ ok: true; deletedRecipientId: string }> {
    return this.request("DELETE", `${baseUrl}/outbound/recipients/${encodeURIComponent(recipientId)}`, token);
  }

  sendExternalMessage(
    token: string,
    baseUrl: string,
    input: SendExternalMessageRequest
  ): Promise<SendExternalMessageResponse> {
    return this.request("POST", `${baseUrl}/outbound/send`, token, input);
  }

  private async request<T>(method: string, url: string, token?: string, body?: unknown): Promise<T> {
    const bypassCache = shouldBypassCache(method, url);
    const requestUrl = bypassCache ? appendFreshQuery(url) : url;
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method,
        headers: {
          ...(bypassCache ? { "cache-control": "no-cache, no-store", pragma: "no-cache" } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body ? { "content-type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (error) {
      const detail = error instanceof Error && error.message ? error.message : "network request failed";
      throw new Error(`Could not reach the desktop host at ${requestUrl}. ${detail}`);
    }

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `API error (${response.status})`;
      throw new Error(message);
    }

    return parsed as T;
  }
}

function shouldBypassCache(method: string, url: string): boolean {
  return method.toUpperCase() === "GET" && /\/host\/operator-runs(?:[/?]|$)/.test(url);
}

function appendFreshQuery(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}freedom_no_cache=${Date.now()}`;
}
