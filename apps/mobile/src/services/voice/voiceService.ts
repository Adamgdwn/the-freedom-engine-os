import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionResultEvent } from "expo-speech-recognition";
import { I18nManager, Platform } from "react-native";

const NO_SPEECH_MESSAGE = "No speech was captured. Try again and speak after tapping the mic.";
const RECOVERABLE_RESTART_DELAY_MS = 180;
const SESSION_END_RESTART_DELAY_MS = 120;
const ON_DEVICE_ANDROID_SERVICE_PACKAGE = "com.google.android.as";
const TTS_ANDROID_SERVICE_PACKAGE = "com.google.android.tts";
const PREFERRED_ANDROID_SERVICE_PACKAGES = [ON_DEVICE_ANDROID_SERVICE_PACKAGE, "com.google.android.googlequicksearchbox"];

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

type SpeechRecognitionModule = {
  addListener(
    eventName: "start" | "speechstart" | "speechend" | "volumechange" | "result" | "error" | "end",
    handler: (event?: unknown) => void
  ): { remove(): void };
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  isRecognitionAvailable(): boolean;
  getSpeechRecognitionServices(): string[];
  getDefaultRecognitionService(): { packageName?: string | null };
  getSupportedLocales(options: { androidRecognitionServicePackage?: string | null }): Promise<{
    locales?: string[];
    installedLocales?: string[];
  }>;
  androidTriggerOfflineModelDownload(options: { locale: string }): Promise<{
    status: "download_success" | "opened_dialog" | "download_canceled";
    message: string;
  }>;
  start(options: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
};

type AndroidRecognitionSelection = {
  packageName?: string;
  localeTag: string | null;
  needsOfflineModelDownload: boolean;
};

function getSpeechRecognitionModule(): SpeechRecognitionModule | null {
  try {
    const module = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModule;
    };
    return module.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

function isContinuousRecognitionSupported(): boolean {
  return Platform.OS !== "android";
}

function normalizeLocaleTag(locale: string | null | undefined): string | null {
  const value = locale?.trim();
  if (!value) {
    return null;
  }

  return value.replace(/_/g, "-");
}

function localeVariants(locale: string | null | undefined): string[] {
  const normalized = normalizeLocaleTag(locale);
  if (!normalized) {
    return [];
  }

  const lower = normalized.toLowerCase();
  const language = lower.split("-")[0] ?? lower;
  return Array.from(new Set([lower, language]));
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

function installedLocalesSupportTarget(installedLocales: string[] | undefined, targetLocale: string | null): boolean {
  if (!installedLocales?.length || !targetLocale) {
    return false;
  }

  const installed = installedLocales.map((locale) => normalizeLocaleTag(locale)?.toLowerCase()).filter(Boolean) as string[];
  const variants = localeVariants(targetLocale);
  return variants.some((variant) => installed.includes(variant));
}

function formatLocaleLabel(localeTag: string | null): string {
  return localeTag ?? "your phone's current language";
}

async function promptAndroidOfflineModelDownload(localeTag: string | null): Promise<string> {
  const speechRecognitionModule = getSpeechRecognitionModule();
  const locale = localeTag ?? "en-US";
  const localeLabel = formatLocaleLabel(localeTag);

  try {
    const result = await speechRecognitionModule?.androidTriggerOfflineModelDownload({ locale });
    switch (result?.status) {
      case "download_success":
        return `Android finished downloading the ${localeLabel} speech model. Try Talk again now.`;
      case "download_canceled":
        return `Android still needs the ${localeLabel} speech model. Start the download again and accept the prompt to enable voice input.`;
      case "opened_dialog":
      default:
        return `Android needs the ${localeLabel} speech model. Approve the download prompt, then try Talk again.`;
    }
  } catch {
    return `Android needs the ${localeLabel} speech model for voice input. Download it in the system speech settings, then try Talk again.`;
  }
}

async function chooseAndroidRecognitionService(): Promise<AndroidRecognitionSelection> {
  const speechRecognitionModule = getSpeechRecognitionModule();
  if (Platform.OS !== "android") {
    return {
      packageName: undefined,
      localeTag: null,
      needsOfflineModelDownload: false
    };
  }

  try {
    const availableServices = speechRecognitionModule?.getSpeechRecognitionServices() ?? [];
    const availableSet = new Set(availableServices);
    const defaultService = speechRecognitionModule?.getDefaultRecognitionService().packageName?.trim();
    const deviceLocale = getDeviceLocaleTag();

    if (availableSet.has(ON_DEVICE_ANDROID_SERVICE_PACKAGE)) {
      const localeSupport = await speechRecognitionModule?.getSupportedLocales({
        androidRecognitionServicePackage: ON_DEVICE_ANDROID_SERVICE_PACKAGE
      });

      if (installedLocalesSupportTarget(localeSupport?.installedLocales, deviceLocale)) {
        return {
          packageName: ON_DEVICE_ANDROID_SERVICE_PACKAGE,
          localeTag: deviceLocale,
          needsOfflineModelDownload: false
        };
      }

      const viableFallbackServices = availableServices.filter(
        (service) => service !== ON_DEVICE_ANDROID_SERVICE_PACKAGE && service !== TTS_ANDROID_SERVICE_PACKAGE
      );
      const defaultFallbackService =
        defaultService &&
        defaultService !== ON_DEVICE_ANDROID_SERVICE_PACKAGE &&
        defaultService !== TTS_ANDROID_SERVICE_PACKAGE &&
        availableSet.has(defaultService)
          ? defaultService
          : undefined;

      if (!defaultFallbackService && viableFallbackServices.length === 0) {
        return {
          packageName: undefined,
          localeTag: deviceLocale,
          needsOfflineModelDownload: true
        };
      }
    }

    if (defaultService && availableSet.has(defaultService) && defaultService !== ON_DEVICE_ANDROID_SERVICE_PACKAGE) {
      return {
        packageName: defaultService,
        localeTag: deviceLocale,
        needsOfflineModelDownload: false
      };
    }

    return {
      packageName:
        PREFERRED_ANDROID_SERVICE_PACKAGES.find(
        (service) => availableSet.has(service) && service !== ON_DEVICE_ANDROID_SERVICE_PACKAGE
        ) ??
        availableServices.find((service) => service !== ON_DEVICE_ANDROID_SERVICE_PACKAGE) ??
        defaultService ??
        undefined,
      localeTag: deviceLocale,
      needsOfflineModelDownload: false
    };
  } catch {
    return {
      packageName: undefined,
      localeTag: getDeviceLocaleTag(),
      needsOfflineModelDownload: false
    };
  }
}

function getPreferredRecognitionLanguage(): string | undefined {
  if (Platform.OS === "android") {
    // Let Android pick the device-default recognizer locale instead of forcing en-US.
    // This avoids on-device model download mismatches like en-US on an en-CA phone.
    return undefined;
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

function formatVoiceError(event: ExpoSpeechRecognitionErrorEvent): string {
  switch (event.error) {
    case "not-allowed":
      return "Microphone permission is required for voice input.";
    case "service-not-allowed":
      return "Voice recognition is unavailable right now. Check the phone's default speech service and try again.";
    case "language-not-supported":
      return "Voice recognition is not ready for the phone's current language pack yet.";
    case "no-speech":
    case "speech-timeout":
      return NO_SPEECH_MESSAGE;
    default:
      return event.message?.trim() || "Voice recognition failed.";
  }
}

function isRecoverableSessionError(event: ExpoSpeechRecognitionErrorEvent): boolean {
  return event.error === "aborted" || event.error === "busy" || event.error === "no-speech" || event.error === "speech-timeout";
}

export class VoiceService {
  private subscriptions: Array<{ remove(): void }> = [];
  private latestTranscript = "";
  private sessionActive = false;
  private manualStopRequested = false;
  private suppressUnexpectedEndReconnect = false;
  private callbacks: VoiceCallbacks | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private forceAbortTimer: ReturnType<typeof setTimeout> | null = null;

  async isAvailable(): Promise<boolean> {
    const speechRecognitionModule = getSpeechRecognitionModule();
    try {
      if (speechRecognitionModule?.isRecognitionAvailable()) {
        return true;
      }

      if (Platform.OS === "android") {
        return (speechRecognitionModule?.getSpeechRecognitionServices().length ?? 0) > 0;
      }

      return false;
    } catch {
      return false;
    }
  }

  async startStreamingSession(callbacks: VoiceCallbacks): Promise<void> {
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!(await this.isAvailable())) {
      throw new Error("Speech recognition is not available in this build.");
    }

    if (!speechRecognitionModule) {
      throw new Error("Speech recognition is not available in this build.");
    }

    const permissions = await speechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      throw new Error("Microphone permission is required for voice input.");
    }

    this.stopStreamingSession();
    this.clearForceAbortTimer();
    this.callbacks = callbacks;
    this.sessionActive = true;
    this.manualStopRequested = false;
    this.suppressUnexpectedEndReconnect = false;
    this.latestTranscript = "";
    this.attachListeners();
    void this.startRecognition();
  }

  stopStreamingSession(): void {
    const speechRecognitionModule = getSpeechRecognitionModule();
    this.manualStopRequested = true;
    this.sessionActive = false;
    this.suppressUnexpectedEndReconnect = true;
    this.clearReconnectTimer();
    this.clearForceAbortTimer();

    try {
      speechRecognitionModule?.stop();
    } catch {
      // Ignore cleanup failures between sessions.
    }

    this.forceAbortTimer = setTimeout(() => {
      this.forceAbortTimer = null;
      try {
        speechRecognitionModule?.abort();
      } catch {
        // Ignore forced cleanup failures between sessions.
      }
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
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!speechRecognitionModule) {
      this.callbacks?.onError("Speech recognition is not available in this build.");
      this.stopStreamingSession();
      return;
    }

    this.subscriptions = [
      speechRecognitionModule.addListener("start", () => {
        this.callbacks?.onListening?.();
      }),
      speechRecognitionModule.addListener("speechstart", () => {
        this.callbacks?.onSpeechStart?.();
      }),
      speechRecognitionModule.addListener("speechend", () => {
        this.callbacks?.onSpeechEnd?.();
      }),
      speechRecognitionModule.addListener("volumechange", (event?: unknown) => {
        const volumeEvent = event as { value: number };
        this.callbacks?.onVolume?.(volumeEvent.value);
      }),
      speechRecognitionModule.addListener("result", (event?: unknown) => {
        const resultEvent = event as ExpoSpeechRecognitionResultEvent;
        const transcript = resultEvent.results[0]?.transcript?.trim();
        if (!transcript) {
          return;
        }

        console.info(`[FreedomVoice] result final=${String(resultEvent.isFinal)} transcript=${transcript}`);
        this.latestTranscript = transcript;
        if (resultEvent.isFinal) {
          this.callbacks?.onFinalTranscript?.(transcript);
          this.latestTranscript = "";
          return;
        }

        this.callbacks?.onPartialTranscript?.(transcript);
      }),
      speechRecognitionModule.addListener("error", (event?: unknown) => {
        const errorEvent = event as ExpoSpeechRecognitionErrorEvent;
        if (this.latestTranscript && (errorEvent.error === "no-speech" || errorEvent.error === "speech-timeout")) {
          this.callbacks?.onFinalTranscript?.(this.latestTranscript);
          this.latestTranscript = "";
          return;
        }

        if (this.sessionActive && !this.manualStopRequested && isRecoverableSessionError(errorEvent)) {
          this.callbacks?.onReconnect?.();
          this.restartRecognition(RECOVERABLE_RESTART_DELAY_MS);
          return;
        }

        this.sessionActive = false;
        this.suppressUnexpectedEndReconnect = true;
        this.callbacks?.onError(formatVoiceError(errorEvent));
      }),
      speechRecognitionModule.addListener("end", () => {
        if (this.latestTranscript) {
          console.info(`[FreedomVoice] end promoted transcript=${this.latestTranscript}`);
          this.callbacks?.onFinalTranscript?.(this.latestTranscript);
          this.latestTranscript = "";
        }

        if (this.sessionActive && !this.manualStopRequested && !this.suppressUnexpectedEndReconnect) {
          this.callbacks?.onReconnect?.();
          this.restartRecognition(SESSION_END_RESTART_DELAY_MS);
        }
      })
    ];
  }

  private async startRecognition(): Promise<void> {
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!speechRecognitionModule) {
      this.callbacks?.onError("Speech recognition could not start because the native service is unavailable.");
      this.stopStreamingSession();
      return;
    }

    try {
      const androidRecognition = await chooseAndroidRecognitionService();
      if (androidRecognition.needsOfflineModelDownload) {
        this.sessionActive = false;
        this.suppressUnexpectedEndReconnect = true;
        const message = await promptAndroidOfflineModelDownload(androidRecognition.localeTag);
        this.callbacks?.onError(message);
        this.cleanup();
        return;
      }

      const startOptions: Record<string, unknown> = {
        interimResults: true,
        maxAlternatives: 1,
        continuous: isContinuousRecognitionSupported(),
        addsPunctuation: false,
        androidRecognitionServicePackage: androidRecognition.packageName,
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: "free_form",
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 8000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 450
        }
      };
      const preferredLanguage =
        Platform.OS === "android" &&
        androidRecognition.packageName === ON_DEVICE_ANDROID_SERVICE_PACKAGE &&
        androidRecognition.localeTag
          ? androidRecognition.localeTag
          : getPreferredRecognitionLanguage();
      if (preferredLanguage) {
        startOptions.lang = preferredLanguage;
      }
      if (Platform.OS === "android" && androidRecognition.packageName === ON_DEVICE_ANDROID_SERVICE_PACKAGE) {
        startOptions.requiresOnDeviceRecognition = true;
      }
      console.info(
        `[FreedomVoice] startRecognition service=${androidRecognition.packageName ?? "default"} locale=${preferredLanguage ?? "device-default"} continuous=${String(
          startOptions.continuous
        )}`
      );
      this.suppressUnexpectedEndReconnect = false;
      speechRecognitionModule.start(startOptions);
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

  private cleanup(): void {
    this.clearReconnectTimer();
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
    this.latestTranscript = "";
    this.callbacks = null;
  }
}
