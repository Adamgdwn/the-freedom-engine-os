import type {
  AutonomousOperatorRun,
  ChatMessage,
  ChatSession,
  HostApi,
  HostAssistantDeltaRequest,
  HostBuildLaneResponse,
  HostCompleteTurnRequest,
  HostFailTurnRequest,
  HostHeartbeatRequest,
  HostInterruptTurnRequest,
  HostMemoryDigestResponse,
  OperatorRunLedger,
  OperatorRunPatch,
  HostVoiceProfileResponse,
  HostStartTurnRequest,
  HostStatus,
  HostWorkItem,
  RegisterHostRequest,
  RegisterHostResponse,
  UpdateHostVoiceProfileRequest
} from "@freedom/shared";
import type { HostWorkPollOptions } from "@freedom/shared";

export class HttpGatewayClient implements HostApi {
  constructor(private readonly baseUrl: string) {}

  registerHost(input: RegisterHostRequest): Promise<RegisterHostResponse> {
    return this.request("POST", "/host/register", undefined, input);
  }

  heartbeat(token: string, input: HostHeartbeatRequest): Promise<HostStatus> {
    return this.request("POST", "/host/heartbeat", token, input);
  }

  getNextWork(token: string, options?: HostWorkPollOptions): Promise<HostWorkItem | null> {
    const url = new URL("/host/work", this.baseUrl);
    if (options?.waitMs !== undefined) {
      url.searchParams.set("waitMs", String(options.waitMs));
    }
    if (options?.acceptQueued !== undefined) {
      url.searchParams.set("acceptQueued", options.acceptQueued ? "1" : "0");
    }
    return this.request("GET", url, token);
  }

  startTurn(token: string, input: HostStartTurnRequest): Promise<ChatSession> {
    return this.request("POST", "/host/turn/start", token, input);
  }

  appendAssistantDelta(token: string, input: HostAssistantDeltaRequest): Promise<ChatMessage> {
    return this.request("POST", "/host/turn/delta", token, input);
  }

  completeTurn(token: string, input: HostCompleteTurnRequest): Promise<ChatSession> {
    return this.request("POST", "/host/turn/complete", token, input);
  }

  failTurn(token: string, input: HostFailTurnRequest): Promise<ChatSession> {
    return this.request("POST", "/host/turn/fail", token, input);
  }

  interruptTurn(token: string, input: HostInterruptTurnRequest): Promise<ChatSession> {
    return this.request("POST", "/host/turn/interrupt", token, input);
  }

  getHostStatus(token: string): Promise<HostStatus> {
    return this.request("GET", "/host/status", token);
  }

  getMemoryDigest(token: string): Promise<HostMemoryDigestResponse> {
    return this.request("GET", "/host/memory-digest", token);
  }

  getVoiceProfile(token: string): Promise<HostVoiceProfileResponse> {
    return this.request("GET", "/host/voice-profile", token);
  }

  getBuildLaneSummary(token: string): Promise<HostBuildLaneResponse> {
    return this.request("GET", "/host/build-lane", token);
  }

  getOperatorRunLedger(token: string): Promise<OperatorRunLedger> {
    return this.request("GET", "/host/operator-runs", token);
  }

  createOperatorRun(token: string, input: AutonomousOperatorRun): Promise<AutonomousOperatorRun> {
    return this.request("POST", "/host/operator-runs", token, input);
  }

  updateOperatorRun(token: string, runId: string, input: OperatorRunPatch): Promise<AutonomousOperatorRun> {
    return this.request("POST", `/host/operator-runs/${encodeURIComponent(runId)}/update`, token, input);
  }

  updateVoiceProfile(token: string, input: UpdateHostVoiceProfileRequest): Promise<HostVoiceProfileResponse> {
    return this.request("POST", "/host/voice-profile", token, input);
  }

  private async request<T>(method: string, pathname: string | URL, token?: string, body?: unknown): Promise<T> {
    const response = await fetch(typeof pathname === "string" ? new URL(pathname, this.baseUrl) : pathname, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `Gateway error (${response.status})`;
      throw new Error(message);
    }

    return parsed as T;
  }
}
