import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { sanitizeTextForSpeech } from "../../utils/operatorConsole";

type SpeechHandlers = {
  onStart?(): void;
  onFinish?(): void;
  onCancel?(): void;
  onError?(message: string): void;
};

export interface FreedomSpeechVoiceProfile {
  targetVoice: string;
  accent?: string | null;
  tone?: string | null;
  warmth?: string | null;
  pace?: string | null;
  notes?: string | null;
}

export interface FreedomSpeechProvider {
  endpointUrl: string;
  authorization?: string | null;
  voiceProfile: FreedomSpeechVoiceProfile;
  label: string;
}

export class FreedomSpeechService {
  private player: AudioPlayer | null = null;
  private listeners: Array<{ remove(): void }> = [];
  private handlers: SpeechHandlers = {};
  private prepared = false;
  private activeRequestId = 0;
  private currentRequestId: number | null = null;
  private startedRequestId: number | null = null;

  isAvailable(): boolean {
    return typeof createAudioPlayer === "function";
  }

  configureHandlers(handlers: SpeechHandlers): void {
    this.handlers = handlers;
  }

  async prepare(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    if (!this.prepared) {
      await setAudioModeAsync({
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false
      }).catch(() => undefined);
      this.prepared = true;
    }

    if (!this.player) {
      this.player = createAudioPlayer(null, {
        downloadFirst: true,
        keepAudioSessionActive: true,
        updateInterval: 120
      });
      this.bindPlayer(this.player);
    }

    return true;
  }

  speak(text: string, provider: FreedomSpeechProvider): string | null {
    const spokenText = sanitizeTextForSpeech(text);
    if (!spokenText) {
      return null;
    }

    const requestId = ++this.activeRequestId;
    this.prepare()
      .then((ready) => {
        if (!ready || !this.player) {
          this.handlers.onError?.("Freedom voice playback is unavailable in this build.");
          return;
        }

        this.currentRequestId = requestId;
        this.startedRequestId = null;
        this.player.replace({
          uri: `${provider.endpointUrl.replace(/\/$/, "")}/api/mobile-companion/speech?request=${requestId}`,
          headers: buildSpeechHeaders(spokenText, provider),
          name: `${provider.label} spoken reply`
        });
        this.player.play();
      })
      .catch((error) => {
        this.currentRequestId = null;
        this.startedRequestId = null;
        this.handlers.onError?.(error instanceof Error ? error.message : "Freedom voice playback failed.");
      });

    return spokenText;
  }

  stop(): void {
    this.currentRequestId = null;
    this.startedRequestId = null;
    if (!this.player) {
      return;
    }

    try {
      this.player.pause();
    } catch {
      // Ignore cleanup failures between turns.
    }

    void this.player.seekTo(0).catch(() => undefined);
  }

  private bindPlayer(player: AudioPlayer): void {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [
      player.addListener("playbackStatusUpdate", (status) => {
        this.handlePlaybackStatus(status);
      })
    ];
  }

  private handlePlaybackStatus(status: AudioStatus): void {
    if (this.currentRequestId === null) {
      return;
    }

    if (status.playing && this.startedRequestId !== this.currentRequestId) {
      this.startedRequestId = this.currentRequestId;
      this.handlers.onStart?.();
      return;
    }

    if (status.didJustFinish && this.startedRequestId === this.currentRequestId) {
      this.currentRequestId = null;
      this.startedRequestId = null;
      this.handlers.onFinish?.();
      return;
    }

    const playbackState = status.playbackState.trim().toLowerCase();
    const waitingReason = status.reasonForWaitingToPlay.trim().toLowerCase();
    if (playbackState.includes("error") || waitingReason.includes("error") || waitingReason.includes("fail")) {
      this.currentRequestId = null;
      this.startedRequestId = null;
      this.handlers.onError?.("Freedom voice playback could not start on this phone.");
    }
  }
}

function buildSpeechHeaders(text: string, provider: FreedomSpeechProvider): Record<string, string> {
  const headers: Record<string, string> = {
    "x-freedom-speech-input": encodeURIComponent(text),
    "x-freedom-speech-profile": encodeURIComponent(JSON.stringify(provider.voiceProfile))
  };

  const authorization = provider.authorization?.trim();
  if (authorization) {
    headers.authorization = authorization;
  }

  return headers;
}
