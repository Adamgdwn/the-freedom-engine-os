import { I18nManager, PermissionsAndroid, Platform } from "react-native";
import Voice, { type SpeechErrorEvent, type SpeechResultsEvent } from "./nativeVoice";

const NO_SPEECH_MESSAGE = "No speech was captured. Try again and speak after tapping the mic.";
const RECOVERABLE_RESTART_DELAY_MS = 180;
const SESSION_END_RESTART_DELAY_MS = 120;
const FINAL_TRANSCRIPT_DEDUPE_WINDOW_MS = 2500;
const PARTIAL_TRANSCRIPT_FINALIZE_DELAY_MS = 1400;

type VoiceCallbacks = {
  onListening?(): void;
  onSpeechStart?(): void;
  onSpeechEnd?(): void;
  onPartialTranscript?(text: string): void;
  onFinalTranscript?(text: string): void;
  onVolume?(value: number): void;
  onReconnect?(): void;
  onError(message: string): void;
};

function normalizeLocaleTag(locale: string | null | undefined): string | null {
  const value = locale?.trim();
  if (!value) {
    return null;
  }

  return value.replace(/_/g, "-");
}

function getDeviceLocaleTag(): string | null {
  const nativeLocale = normalizeLocaleTag(I18nManager.getConstants().localeIdentifier);
  if (nativeLocale) {
    return nativeLocale;
  }

  try {
    return normalizeLocaleTag(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

function formatLocaleLabel(localeTag: string | null): string {
  return localeTag ?? "your phone's current language";
}

async function ensureMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Microphone permission is required for voice input.");
  }
}

async function getAndroidRecognitionServices(): Promise<string[]> {
  if (Platform.OS !== "android") {
    return [];
  }

  try {
    const services = await Voice.getSpeechRecognitionServices();
    return Array.isArray(services) ? services.map((service) => service?.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function hasSupportedAndroidRecognitionService(): Promise<boolean> {
  const services = await getAndroidRecognitionServices();
  return services.length > 0;
}

async function ensureSupportedAndroidRecognitionService(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const services = await getAndroidRecognitionServices();
  if (services.length > 0) {
    return;
  }
}

function getPreferredRecognitionLanguage(): string {
  const nativeLocale = getDeviceLocaleTag();
  if (nativeLocale) {
    return nativeLocale;
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale?.trim();
    if (locale) {
      return locale.replace(/_/g, "-");
    }
  } catch {
    // Ignore locale resolution failures and fall back below.
  }

  return "en-US";
}

function getVoiceErrorCode(event: SpeechErrorEvent): string | null {
  const rawCode = event.error?.code?.trim();
  return rawCode ? rawCode : null;
}

function getVoiceErrorMessage(event: SpeechErrorEvent): string {
  return event.error?.message?.trim() ?? "Voice recognition failed.";
}

function formatVoiceError(event: SpeechErrorEvent): string {
  const code = getVoiceErrorCode(event);
  const message = getVoiceErrorMessage(event).toLowerCase();

  switch (code) {
    case "9":
      return "Microphone permission is required for voice input.";
    case "6":
    case "7":
    case "11":
      return NO_SPEECH_MESSAGE;
    case "8":
      return "Voice recognition is busy right now. Try again in a moment.";
    default:
      if (message.includes("permission")) {
        return "Microphone permission is required for voice input.";
      }
      if (message.includes("busy")) {
        return "Voice recognition is busy right now. Try again in a moment.";
      }
      if (message.includes("no match") || message.includes("no speech") || message.includes("didn't understand")) {
        return NO_SPEECH_MESSAGE;
      }
      return getVoiceErrorMessage(event);
  }
}

function isRecoverableSessionError(event: SpeechErrorEvent): boolean {
  const code = getVoiceErrorCode(event);
  return code === "6" || code === "7" || code === "8" || code === "11";
}

async function resetNativeRecognizer(): Promise<void> {
  try {
    Voice.removeAllListeners();
  } catch {
    // Ignore listener cleanup failures.
  }

  try {
    await Voice.destroy();
  } catch {
    // Ignore native teardown failures between sessions.
  }
}

function firstTranscript(event?: SpeechResultsEvent): string {
  return event?.value?.[0]?.trim() ?? "";
}

export class VoiceService {
  private latestTranscript = "";
  private lastCommittedTranscript = "";
  private lastCommittedAt = 0;
  private sessionActive = false;
  private manualStopRequested = false;
  private suppressUnexpectedEndReconnect = false;
  private callbacks: VoiceCallbacks | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private forceAbortTimer: ReturnType<typeof setTimeout> | null = null;
  private partialFinalizeTimer: ReturnType<typeof setTimeout> | null = null;

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === "android") {
      return true;
    }

    let voiceAvailable = false;
    try {
      voiceAvailable = Boolean(await Voice.isAvailable());
    } catch {
      voiceAvailable = false;
    }

    if (voiceAvailable) {
      return true;
    }

    return false;
  }

  async startStreamingSession(callbacks: VoiceCallbacks): Promise<void> {
    if (Platform.OS !== "android" && !(await this.isAvailable())) {
      throw new Error("Speech recognition is not available in this build.");
    }

    this.stopStreamingSession();
    await resetNativeRecognizer();
    await ensureMicrophonePermission();
    await ensureSupportedAndroidRecognitionService();
    this.clearForceAbortTimer();
    this.callbacks = callbacks;
    this.sessionActive = true;
    this.manualStopRequested = false;
    this.suppressUnexpectedEndReconnect = false;
    this.latestTranscript = "";
    this.lastCommittedTranscript = "";
    this.lastCommittedAt = 0;
    this.attachListeners();
    void this.startRecognition();
  }

  stopStreamingSession(): void {
    this.manualStopRequested = true;
    this.sessionActive = false;
    this.suppressUnexpectedEndReconnect = true;
    this.clearReconnectTimer();
    this.clearForceAbortTimer();
    this.clearPartialFinalizeTimer();

    try {
      void Voice.stop();
    } catch {
      // Ignore cleanup failures between sessions.
    }

    this.forceAbortTimer = setTimeout(() => {
      this.forceAbortTimer = null;
      try {
        void Voice.cancel();
      } catch {
        // Ignore forced cleanup failures between sessions.
      }
      void resetNativeRecognizer();
    }, 150);

    this.cleanup();
  }

  async startListening(onResult: (text: string) => void, onError: (message: string) => void): Promise<void> {
    await this.startStreamingSession({
      onFinalTranscript: (text) => {
        onResult(text);
        this.stopStreamingSession();
      },
      onError
    });
  }

  async stopListening(): Promise<void> {
    this.stopStreamingSession();
  }

  private attachListeners(): void {
    Voice.onSpeechStart = () => {
      this.callbacks?.onListening?.();
      this.callbacks?.onSpeechStart?.();
    };
    Voice.onSpeechEnd = () => {
      this.clearPartialFinalizeTimer();
      this.callbacks?.onSpeechEnd?.();

      if (this.latestTranscript) {
        console.info(`[FreedomVoice] end promoted transcript=${this.latestTranscript}`);
        this.emitFinalTranscript(this.latestTranscript);
        this.latestTranscript = "";
      }

      if (this.sessionActive && !this.manualStopRequested && !this.suppressUnexpectedEndReconnect) {
        this.callbacks?.onReconnect?.();
        this.restartRecognition(SESSION_END_RESTART_DELAY_MS);
      }
    };
    Voice.onSpeechVolumeChanged = (event) => {
      this.callbacks?.onVolume?.(event.value ?? 0);
    };
    Voice.onSpeechPartialResults = (event) => {
      const transcript = firstTranscript(event);
      if (!transcript) {
        return;
      }

      console.info(`[FreedomVoice] partial transcript=${transcript}`);
      this.latestTranscript = transcript;
      this.callbacks?.onPartialTranscript?.(transcript);
      this.schedulePartialTranscriptFinalize();
    };
    Voice.onSpeechResults = (event) => {
      this.clearPartialFinalizeTimer();
      const transcript = firstTranscript(event);
      if (!transcript) {
        return;
      }

      console.info(`[FreedomVoice] final transcript=${transcript}`);
      this.latestTranscript = transcript;
      this.emitFinalTranscript(transcript);
      this.latestTranscript = "";
    };
    Voice.onSpeechError = (event) => {
      this.clearPartialFinalizeTimer();
      if (this.latestTranscript && isRecoverableSessionError(event)) {
        this.emitFinalTranscript(this.latestTranscript);
        this.latestTranscript = "";
        return;
      }

      if (this.sessionActive && !this.manualStopRequested && isRecoverableSessionError(event)) {
        this.callbacks?.onReconnect?.();
        this.restartRecognition(RECOVERABLE_RESTART_DELAY_MS);
        return;
      }

      this.sessionActive = false;
      this.suppressUnexpectedEndReconnect = true;
      this.callbacks?.onError(formatVoiceError(event));
    };
  }

  private async startRecognition(): Promise<void> {
    try {
      const preferredLanguage = getPreferredRecognitionLanguage();
      const startOptions: Record<string, unknown> =
        Platform.OS === "android"
          ? {
              EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
              EXTRA_MAX_RESULTS: 1,
              EXTRA_PARTIAL_RESULTS: true,
              EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 8000,
              EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
              EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 450,
              REQUEST_PERMISSIONS_AUTO: false
            }
          : {};

      console.info(
        `[FreedomVoice] startRecognition locale=${preferredLanguage} androidServices=${Platform.OS === "android" ? "checked" : "n/a"}`
      );
      this.suppressUnexpectedEndReconnect = false;
      await Voice.start(preferredLanguage, startOptions);
    } catch (error) {
      this.callbacks?.onError(error instanceof Error ? error.message : "Voice recognition could not start.");
      this.stopStreamingSession();
    }
  }

  private restartRecognition(delayMs: number): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.sessionActive || this.manualStopRequested) {
        return;
      }

      void this.startRecognition();
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearForceAbortTimer(): void {
    if (!this.forceAbortTimer) {
      return;
    }

    clearTimeout(this.forceAbortTimer);
    this.forceAbortTimer = null;
  }

  private clearPartialFinalizeTimer(): void {
    if (!this.partialFinalizeTimer) {
      return;
    }

    clearTimeout(this.partialFinalizeTimer);
    this.partialFinalizeTimer = null;
  }

  private cleanup(): void {
    this.clearReconnectTimer();
    this.clearPartialFinalizeTimer();
    try {
      Voice.removeAllListeners();
    } catch {
      // Ignore listener cleanup failures.
    }
    this.latestTranscript = "";
    this.lastCommittedTranscript = "";
    this.lastCommittedAt = 0;
    this.callbacks = null;
  }

  private emitFinalTranscript(text: string): void {
    const normalized = firstTranscript({ value: [text] });
    if (!normalized) {
      return;
    }

    const now = Date.now();
    if (normalized === this.lastCommittedTranscript && now - this.lastCommittedAt < FINAL_TRANSCRIPT_DEDUPE_WINDOW_MS) {
      console.info(`[FreedomVoice] deduped transcript=${normalized}`);
      return;
    }

    this.lastCommittedTranscript = normalized;
    this.lastCommittedAt = now;
    this.callbacks?.onFinalTranscript?.(normalized);
  }

  private schedulePartialTranscriptFinalize(): void {
    this.clearPartialFinalizeTimer();
    this.partialFinalizeTimer = setTimeout(() => {
      this.partialFinalizeTimer = null;
      const transcript = firstTranscript({ value: [this.latestTranscript] });
      if (!transcript || !this.sessionActive || this.manualStopRequested) {
        return;
      }

      console.info(`[FreedomVoice] auto-finalized partial transcript=${transcript}`);
      this.emitFinalTranscript(transcript);
      this.latestTranscript = "";
    }, PARTIAL_TRANSCRIPT_FINALIZE_DELAY_MS);
  }
}
