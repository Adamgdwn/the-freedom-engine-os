import { AudioSession, AndroidAudioTypePresets } from "@livekit/react-native";
import { Room, RoomEvent, type AudioCaptureOptions } from "livekit-client";
import type { VoiceRuntimeState, VoiceSessionBinding } from "@freedom/shared";
import { PermissionsAndroid, Platform } from "react-native";

const MIC_CAPTURE_OPTIONS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1
};

type RealtimeVoiceSessionPayload = {
  token: string;
  wsUrl: string;
  roomName: string;
  participantIdentity: string;
  binding: VoiceSessionBinding;
  expiresAt: string;
};

type TranscriptSource = "assistant" | "user" | "unknown";

type RealtimeTranscriptEvent = {
  text: string;
  source: TranscriptSource;
  final: boolean;
};

type VoiceDataEnvelope =
  | {
      type: "state_update";
      state?: VoiceRuntimeState;
    }
  | {
      type: "transcript";
      text?: string;
      source?: TranscriptSource;
      final?: boolean;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

type RealtimeVoiceCallbacks = {
  onConnected(binding: VoiceSessionBinding): void;
  onDisconnected(expected: boolean): void;
  onReconnecting(): void;
  onReconnected(): void;
  onStateChange(state: VoiceRuntimeState): void;
  onTranscript(event: RealtimeTranscriptEvent): void;
  onError(message: string): void;
};

function isVoiceRuntimeState(value: unknown): value is VoiceRuntimeState {
  return value === "listening" || value === "processing" || value === "speaking";
}

async function ensureMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  const granted = await PermissionsAndroid.request(permission);
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Microphone permission is required for realtime voice.");
  }
}

function formatRealtimeVoiceError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Realtime voice could not connect.";
}

export class RealtimeVoiceService {
  private static readonly responderTimeoutMs = 12_000;
  private room: Room | null = null;
  private callbacks: RealtimeVoiceCallbacks | null = null;
  private disconnectExpected = false;
  private audioSessionStarted = false;
  private responderWatchdog: ReturnType<typeof setTimeout> | null = null;
  private receivedWorkerSignal = false;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async startSession(payload: RealtimeVoiceSessionPayload, callbacks: RealtimeVoiceCallbacks): Promise<void> {
    await this.stopSession();

    this.disconnectExpected = false;
    this.callbacks = callbacks;

    try {
      await ensureMicrophonePermission();
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ["bluetooth", "headset", "speaker", "earpiece"],
          audioTypeOptions: AndroidAudioTypePresets.communication
        },
        ios: {
          defaultOutput: "speaker"
        }
      });
      await AudioSession.startAudioSession();
      this.audioSessionStarted = true;

      const room = new Room();
      this.room = room;

      room.on(RoomEvent.Reconnecting, () => {
        if (this.room !== room) {
          return;
        }
        callbacks.onReconnecting();
      });

      room.on(RoomEvent.Reconnected, () => {
        if (this.room !== room) {
          return;
        }
        callbacks.onReconnected();
      });

      room.on(RoomEvent.Disconnected, () => {
        if (this.room !== room) {
          return;
        }
        this.clearResponderWatchdog();
        const expected = this.disconnectExpected;
        this.room = null;
        this.callbacks = null;
        callbacks.onDisconnected(expected);
      });

      room.on(RoomEvent.DataReceived, (payloadBuffer) => {
        if (this.room !== room) {
          return;
        }
        this.receivedWorkerSignal = true;
        this.clearResponderWatchdog();
        this.handleDataMessage(payloadBuffer);
      });

      await room.prepareConnection(payload.wsUrl, payload.token).catch(() => undefined);
      await room.connect(payload.wsUrl, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true, MIC_CAPTURE_OPTIONS);
      this.receivedWorkerSignal = false;
      this.startResponderWatchdog(room, callbacks);

      callbacks.onConnected(payload.binding);
      callbacks.onStateChange("listening");
    } catch (error) {
      await this.stopSession();
      callbacks.onError(formatRealtimeVoiceError(error));
      throw error;
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    if (!this.room) {
      return;
    }

    await this.room.localParticipant.setMicrophoneEnabled(!muted, MIC_CAPTURE_OPTIONS);
  }

  async interrupt(): Promise<void> {
    if (!this.room) {
      return;
    }

    await this.room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "interrupt" })),
      { reliable: true }
    );
  }

  async stopSession(): Promise<void> {
    this.disconnectExpected = true;

    const room = this.room;
    this.room = null;
    this.callbacks = null;
    this.clearResponderWatchdog();
    this.receivedWorkerSignal = false;
    if (room) {
      room.disconnect();
    }

    if (this.audioSessionStarted) {
      await AudioSession.stopAudioSession().catch(() => undefined);
      this.audioSessionStarted = false;
    }
    this.disconnectExpected = false;
  }

  private handleDataMessage(payloadBuffer: Uint8Array): void {
    let payload: VoiceDataEnvelope;
    try {
      payload = JSON.parse(new TextDecoder().decode(payloadBuffer)) as VoiceDataEnvelope;
    } catch {
      return;
    }

    if (payload.type === "state_update" && isVoiceRuntimeState(payload.state)) {
      this.callbacks?.onStateChange(payload.state);
      return;
    }

    if (payload.type === "transcript" && typeof payload.text === "string" && payload.text.trim()) {
      this.callbacks?.onTranscript({
        text: payload.text.trim(),
        source: payload.source === "assistant" || payload.source === "user" ? payload.source : "unknown",
        final: payload.final !== false
      });
    }
  }

  private startResponderWatchdog(room: Room, callbacks: RealtimeVoiceCallbacks): void {
    this.clearResponderWatchdog();
    this.responderWatchdog = setTimeout(() => {
      if (this.room !== room || this.receivedWorkerSignal) {
        return;
      }
      callbacks.onError(
        "Freedom joined the voice room, but the desktop voice worker did not answer. Stop Talk and try again."
      );
      void this.stopSession();
    }, RealtimeVoiceService.responderTimeoutMs);
  }

  private clearResponderWatchdog(): void {
    if (!this.responderWatchdog) {
      return;
    }
    clearTimeout(this.responderWatchdog);
    this.responderWatchdog = null;
  }
}
