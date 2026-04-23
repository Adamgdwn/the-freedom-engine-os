import { Platform } from "react-native";
import { sanitizeTextForSpeech } from "../../utils/operatorConsole";
import { pickAutomaticVoice } from "./voiceOptionPersona";
import {
  FreedomSpeechService,
  type FreedomSpeechProvider
} from "./freedomSpeechService";

export interface TtsVoiceOption {
  id: string;
  label: string;
  language: string;
  qualityLabel: string | null;
  backend: "expo-speech" | "react-native-tts";
  nativeIdentifier?: string | null;
}

type SpeechBackend = "freedom-cloud" | "expo-speech" | "react-native-tts";

type ReactNativeTtsModule = {
  voices?(): Promise<
    Array<{
      id: string;
      name: string;
      language: string;
      quality: number;
      latency: number;
      networkConnectionRequired: boolean;
      notInstalled: boolean;
    }>
  >;
  engines?(): Promise<
    Array<{
      name: string;
      label: string;
      default: boolean;
      icon: number;
    }>
  >;
  getInitStatus?(): Promise<"success" | true>;
  requestInstallEngine?(): Promise<"success" | true>;
  setDefaultEngine?(engineName: string): Promise<boolean>;
  setDefaultVoice?(voiceId: string): Promise<"success" | boolean>;
  setDefaultLanguage?(language: string): Promise<"success" | boolean>;
  setDefaultRate?(rate: number, skipTransform?: boolean): Promise<"success">;
  setDucking?(enabled: boolean): Promise<"success" | boolean>;
  speak(
    text: string,
    options?: {
      androidParams?: {
        KEY_PARAM_STREAM?: "STREAM_MUSIC";
        KEY_PARAM_VOLUME?: number;
        KEY_PARAM_PAN?: number;
      };
    }
  ): string | number;
  stop(): Promise<boolean> | void;
  addEventListener?(
    type: "tts-start" | "tts-finish" | "tts-cancel" | "tts-error",
    handler: (event: { utteranceId?: string | number; code?: string; message?: string }) => void
  ): void;
  removeEventListener?(
    type: "tts-start" | "tts-finish" | "tts-cancel" | "tts-error",
    handler: (event: { utteranceId?: string | number; code?: string; message?: string }) => void
  ): void;
};

type ExpoSpeechModule = {
  speak(
    text: string,
    options?: {
      language?: string;
      voice?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      onStart?(): void;
      onDone?(): void;
      onStopped?(): void;
      onError?(error: { error?: string; message?: string }): void;
    }
  ): void;
  stop(): void;
  isSpeakingAsync?(): Promise<boolean>;
  getAvailableVoicesAsync?(): Promise<
    Array<{
      identifier?: string;
      name?: string;
      language?: string;
      quality?: string;
    }>
  >;
};

type SpeechHandlers = {
  onStart?(): void;
  onFinish?(): void;
  onCancel?(): void;
  onError?(message: string): void;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
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

function getReactNativeTtsModule(): ReactNativeTtsModule | null {
  try {
    return require("react-native-tts").default as ReactNativeTtsModule;
  } catch {
    return null;
  }
}

function getExpoSpeechModule(): ExpoSpeechModule | null {
  try {
    return require("expo-speech") as ExpoSpeechModule;
  } catch {
    return null;
  }
}

export class TtsService {
  private readonly reactNativeTts = getReactNativeTtsModule();
  private readonly expoSpeech = getExpoSpeechModule();
  private readonly freedomSpeech = new FreedomSpeechService();
  private handlersConfigured = false;
  private initPromise: Promise<boolean> | null = null;
  private errorHandler: ((message: string) => void) | null = null;
  private handlers: SpeechHandlers = {};
  private expoVoice: { language: string; identifier?: string } | null = null;
  private preferredVoiceId: string | null = null;
  private selectedVoiceId: string | null = null;
  private selectedBackend: SpeechBackend | null = null;
  private lastSuccessfulBackend: SpeechBackend | null = null;
  private lastAttemptedBackend: SpeechBackend | null = null;
  private readonly knownVoiceBackendById = new Map<string, SpeechBackend>();
  private freedomSpeechProviderResolver: (() => FreedomSpeechProvider | null) | null = null;

  private hasWarmBackend(): boolean {
    return Boolean(this.initPromise || this.selectedVoiceId || this.lastSuccessfulBackend || this.lastAttemptedBackend);
  }

  private resetBackendState(): void {
    this.stop();
    this.initPromise = null;
    this.lastSuccessfulBackend = null;
    this.lastAttemptedBackend = null;
  }

  setFreedomSpeechProviderResolver(resolver: (() => FreedomSpeechProvider | null) | null): void {
    this.freedomSpeechProviderResolver = resolver;
  }

  isAvailable(): boolean {
    return this.resolvePreferredBackend() !== null;
  }

  async prepare(preferredVoiceId?: string | null): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    if (preferredVoiceId !== undefined) {
      const voiceChanged = this.preferredVoiceId !== preferredVoiceId;
      const backendChanged = await this.updatePreferredVoiceRouting(preferredVoiceId);
      this.preferredVoiceId = preferredVoiceId;
      if ((voiceChanged || backendChanged) && this.hasWarmBackend()) {
        try {
          if (backendChanged) {
            this.resetBackendState();
          } else {
            await this.applyPreferredVoice();
          }
        } catch {
          this.resetBackendState();
        }
      }
    }

    if (!this.initPromise) {
      this.initPromise = withTimeout(this.initialize(), 1800, false);
    }

    const ready = await this.initPromise;
    if (!ready) {
      this.initPromise = null;
    }

    return ready;
  }

  async listVoices(): Promise<TtsVoiceOption[]> {
    const backend = this.resolvePreferredBackend();
    if (!backend) {
      if (this.reactNativeTts) {
        await this.initializeReactNativeTts().catch(() => false);
        return this.getReactNativeVoiceOptions();
      }
      if (this.expoSpeech) {
        await this.initializeExpoSpeech().catch(() => false);
        return this.getExpoVoiceOptions();
      }
      return [];
    }

    const ready = await this.prepare();
    if (!ready) {
      return [];
    }

    if (backend === "expo-speech") {
      return this.getExpoVoiceOptions();
    }

    if (backend === "freedom-cloud") {
      return this.reactNativeTts ? this.getReactNativeVoiceOptions() : this.getExpoVoiceOptions();
    }

    return this.getReactNativeVoiceOptions();
  }

  async setPreferredVoice(voiceId: string | null): Promise<TtsVoiceOption | null> {
    const voiceChanged = this.preferredVoiceId !== voiceId;
    const backendChanged = await this.updatePreferredVoiceRouting(voiceId);
    this.preferredVoiceId = voiceId;
    if ((voiceChanged || backendChanged) && this.hasWarmBackend()) {
      try {
        if (!backendChanged) {
          return await this.applyPreferredVoice();
        }
        this.resetBackendState();
      } catch {
        this.resetBackendState();
      }
    }

    const ready = await this.prepare();
    if (!ready) {
      return null;
    }

    return this.applyPreferredVoice();
  }

  configureHandlers(handlers: {
    onStart?(): void;
    onFinish?(): void;
    onCancel?(): void;
    onError?(message: string): void;
  }): void {
    this.handlers = handlers;
    this.errorHandler = handlers.onError ?? null;
    this.freedomSpeech.configureHandlers({
      onStart: () => this.handleSpeechStart(),
      onFinish: () => this.handlers.onFinish?.(),
      onCancel: () => this.handlers.onCancel?.(),
      onError: (message) => this.handlers.onError?.(message)
    });

    if (this.handlersConfigured || !this.reactNativeTts?.addEventListener) {
      return;
    }

    this.reactNativeTts.addEventListener("tts-start", () => this.handleSpeechStart());
    this.reactNativeTts.addEventListener("tts-finish", () => this.handlers.onFinish?.());
    this.reactNativeTts.addEventListener("tts-cancel", () => this.handlers.onCancel?.());
    this.reactNativeTts.addEventListener("tts-error", (event) => this.handlers.onError?.(event.message?.trim() || "Text-to-speech failed."));
    this.handlersConfigured = true;
  }

  speak(text: string): string | number | null {
    const spokenText = sanitizeTextForSpeech(text);
    if (!spokenText) {
      return null;
    }

    this.prepare()
      .then((ready) => {
        if (!ready) {
          this.errorHandler?.("Freedom spoken replies are unavailable because no hosted Freedom speech path is ready on this device.");
          return;
        }

        this.speakWithFallback(spokenText);
      })
      .catch((error) => {
        this.errorHandler?.(error instanceof Error ? error.message : "Text-to-speech failed.");
      });
    return spokenText;
  }

  stop(): void {
    this.freedomSpeech.stop();
    this.reactNativeTts?.stop();
    this.expoSpeech?.stop();
  }

  retryWithAlternateBackend(text: string): boolean {
    const spokenText = sanitizeTextForSpeech(text);
    if (!spokenText) {
      return false;
    }

    if (this.lastAttemptedBackend === "freedom-cloud") {
      return false;
    }

    const alternateBackend = this.resolveAlternateBackend(this.lastAttemptedBackend);
    if (!alternateBackend) {
      return false;
    }

    try {
      this.speakWithBackend(alternateBackend, spokenText);
      return true;
    } catch {
      return false;
    }
  }

  async describeAvailability(): Promise<string> {
    const backend = this.resolvePreferredBackend();
    if (!backend) {
      return this.reactNativeTts || this.expoSpeech
        ? "Freedom hosted speech is not reachable right now. Legacy phone TTS is no longer selected automatically, so spoken replies will pause until a Freedom voice path is available."
        : "Spoken replies are unavailable because this build does not include a compatible Freedom speech output path.";
    }

    const ready = await this.prepare();
    if (backend === "freedom-cloud") {
      const provider = this.getFreedomSpeechProvider();
      return ready
        ? `Freedom hosted speech is ready using ${provider?.voiceProfile.targetVoice ?? "marin"} via ${provider?.label ?? "the configured hosted path"}.`
        : "Freedom hosted speech is not ready right now, so spoken replies may pause until the Freedom voice path is back.";
    }

    if (backend === "expo-speech") {
      const voices = await this.getExpoVoiceOptions();
      const englishVoices = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.language));
      const currentVoice = voices.find((voice) => voice.id === this.selectedVoiceId);
      return ready
        ? `Phone speech output is ready using Expo speech. Current voice: ${currentVoice?.label ?? "default English"}. English voices available: ${englishVoices.length}.`
        : `Phone speech output is not ready using Expo speech. Current voice: ${currentVoice?.label ?? "default English"}. English voices available: ${englishVoices.length}.`;
    }

    const engines = (await this.reactNativeTts?.engines?.().catch(() => [])) ?? [];
    const voices = await this.getReactNativeVoiceOptions();
    const installedEnglishVoices = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.language));
    const defaultEngine = engines.find((engine) => engine.default)?.label ?? engines[0]?.label ?? "none detected";
    const currentVoice = voices.find((voice) => voice.id === this.selectedVoiceId);

    return ready
      ? `Legacy phone TTS backup is ready using Android speech output. Default engine: ${defaultEngine}. Current voice: ${currentVoice?.label ?? "default English"}. English voices available: ${installedEnglishVoices.length}.`
      : `Legacy phone TTS backup is not ready yet. Default engine: ${defaultEngine}. Current voice: ${currentVoice?.label ?? "default English"}. English voices available: ${installedEnglishVoices.length}.`;
  }

  private async initialize(): Promise<boolean> {
    const backend = this.resolvePreferredBackend();
    if (!backend) {
      return false;
    }

    if (backend === "freedom-cloud") {
      return this.freedomSpeech.prepare();
    }

    if (backend === "expo-speech") {
      return this.initializeExpoSpeech();
    }

    return this.initializeReactNativeTts();
  }

  private resolvePreferredBackend(): SpeechBackend | null {
    if (this.canUseFreedomSpeechBackend()) {
      return "freedom-cloud";
    }

    if (this.selectedBackend === "expo-speech" || this.selectedBackend === "react-native-tts") {
      return this.selectedBackend;
    }

    return null;
  }

  private resolveAlternateBackend(currentBackend: SpeechBackend | null): SpeechBackend | null {
    const availableBackends = this.availableBackends();
    if (!availableBackends.length) {
      return null;
    }

    const alternateBackend = availableBackends.find((backend) => backend !== currentBackend);
    return alternateBackend ?? null;
  }

  private availableBackends(): SpeechBackend[] {
    const available: SpeechBackend[] = [];
    if (this.canUseFreedomSpeechBackend()) {
      available.push("freedom-cloud");
    }
    if (this.expoSpeech) {
      available.push("expo-speech");
    }
    if (this.reactNativeTts) {
      available.push("react-native-tts");
    }
    return available;
  }

  private defaultBackendOrder(): SpeechBackend[] {
    // Freedom-hosted speech keeps the modern preset voice consistent with the
    // realtime lane. Native phone TTS stays behind it as a last-resort backup.
    return Platform.OS === "android"
      ? ["freedom-cloud", "react-native-tts", "expo-speech"]
      : ["freedom-cloud", "react-native-tts", "expo-speech"];
  }

  private async initializeExpoSpeech(): Promise<boolean> {
    if (!this.expoSpeech) {
      return false;
    }

    try {
      await this.applyExpoVoicePreference();
      return true;
    } catch {
      this.expoVoice = {
        language: "en-US"
      };
      this.selectedVoiceId = null;
      return true;
    }
  }

  private async initializeReactNativeTts(): Promise<boolean> {
    if (!this.reactNativeTts) {
      return false;
    }

    try {
      const initReady = await withTimeout(
        Promise.resolve(this.reactNativeTts.getInitStatus?.().catch(() => false) ?? true).then((value) => value === true || value === "success"),
        1200,
        false
      );
      if (!initReady) {
        return false;
      }

      const engines = await withTimeout(Promise.resolve(this.reactNativeTts.engines?.().catch(() => []) ?? []), 1200, []);
      const defaultEngine = engines.find((engine) => engine.default) ?? engines[0];
      if (defaultEngine?.name) {
        await this.reactNativeTts.setDefaultEngine?.(defaultEngine.name).catch(() => true);
      }

      await this.reactNativeTts.setDefaultRate?.(0.62, true).catch(() => "success");
      await this.reactNativeTts.setDucking?.(true).catch(() => true);
      await this.applyReactNativeVoicePreference();
      return true;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
      if (code === "no_engine") {
        await this.reactNativeTts.requestInstallEngine?.().catch(() => true);
      }
      return false;
    }
  }

  private speakWithFallback(text: string): void {
    const primaryBackend = this.resolvePreferredBackend();
    if (!primaryBackend) {
      throw new Error("No speech backend is available on this phone.");
    }

    try {
      this.speakWithBackend(primaryBackend, text);
      return;
    } catch (error) {
      if (primaryBackend === "freedom-cloud") {
        throw error;
      }

      const alternateBackend = this.resolveAlternateBackend(primaryBackend);
      if (!alternateBackend) {
        throw error;
      }

      this.speakWithBackend(alternateBackend, text);
    }
  }

  private speakWithBackend(backend: SpeechBackend, text: string): void {
    this.lastAttemptedBackend = backend;
    if (backend === "freedom-cloud") {
      this.speakWithFreedomSpeech(text);
      return;
    }
    if (backend === "expo-speech") {
      this.speakWithExpoSpeech(text);
      return;
    }

    this.speakWithReactNativeTts(text);
  }

  private handleSpeechStart(): void {
    if (this.lastAttemptedBackend) {
      this.lastSuccessfulBackend = this.lastAttemptedBackend;
    }
    console.info(`[FreedomTTS] start backend=${this.lastAttemptedBackend ?? "unknown"}`);
    this.handlers.onStart?.();
  }

  private speakWithFreedomSpeech(text: string): void {
    const provider = this.getFreedomSpeechProvider();
    if (!provider) {
      throw new Error("Freedom hosted speech is not configured.");
    }

    console.info(`[FreedomTTS] speak backend=freedom-cloud voice=${provider.voiceProfile.targetVoice}`);
    const spokenText = this.freedomSpeech.speak(text, provider);
    if (!spokenText) {
      throw new Error("Freedom hosted speech rejected the request.");
    }
  }

  private speakWithExpoSpeech(text: string): void {
    if (!this.expoSpeech) {
      throw new Error("Expo speech is unavailable.");
    }

    console.info("[FreedomTTS] speak backend=expo-speech");
    this.expoSpeech.speak(text, {
      language: this.expoVoice?.language ?? "en-US",
      ...(this.expoVoice?.identifier ? { voice: this.expoVoice.identifier } : {}),
      rate: 0.92,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => this.handleSpeechStart(),
      onDone: () => this.handlers.onFinish?.(),
      onStopped: () => this.handlers.onCancel?.(),
      onError: (error) => this.handlers.onError?.(error.message?.trim() || error.error?.trim() || "Speech playback failed.")
    });
  }

  private speakWithReactNativeTts(text: string): void {
    if (!this.reactNativeTts) {
      throw new Error("Legacy Android speech output is unavailable.");
    }

    console.info("[FreedomTTS] speak backend=react-native-tts");
    this.reactNativeTts.speak(text, {
      androidParams: {
        KEY_PARAM_STREAM: "STREAM_MUSIC",
        KEY_PARAM_VOLUME: 1.0,
        KEY_PARAM_PAN: 0
      }
    });
  }

  private async applyPreferredVoice(): Promise<TtsVoiceOption | null> {
    const backend = this.resolvePreferredBackend();
    if (!backend) {
      this.selectedVoiceId = null;
      return null;
    }

    return backend === "expo-speech" ? this.applyExpoVoicePreference() : this.applyReactNativeVoicePreference();
  }

  private async applyExpoVoicePreference(): Promise<TtsVoiceOption | null> {
    const voices = await this.getExpoVoiceOptions();
    const preferredVoice =
      (this.preferredVoiceId ? voices.find((voice) => voice.id === this.preferredVoiceId) : null) ??
      pickAutomaticVoice(voices) ??
      voices[0] ??
      null;

    this.selectedVoiceId = preferredVoice?.id ?? null;
    this.expoVoice = {
      language: preferredVoice?.language ?? "en-US",
      ...(preferredVoice?.nativeIdentifier ? { identifier: preferredVoice.nativeIdentifier } : {})
    };

    return preferredVoice;
  }

  private async applyReactNativeVoicePreference(): Promise<TtsVoiceOption | null> {
    const voices = await this.getReactNativeVoiceOptions();
    const preferredVoice =
      (this.preferredVoiceId ? voices.find((voice) => voice.id === this.preferredVoiceId) : null) ??
      pickAutomaticVoice(voices) ??
      voices[0] ??
      null;

    this.selectedVoiceId = preferredVoice?.id ?? null;

    if (preferredVoice?.id) {
      await this.reactNativeTts?.setDefaultVoice?.(preferredVoice.id).catch(() => true);
      await this.reactNativeTts?.setDefaultLanguage?.(preferredVoice.language).catch(() => true);
    } else {
      await this.reactNativeTts?.setDefaultLanguage?.("en-US").catch(() => true);
    }

    return preferredVoice;
  }

  private async getExpoVoiceOptions(): Promise<TtsVoiceOption[]> {
    const voices =
      (await withTimeout(Promise.resolve(this.expoSpeech?.getAvailableVoicesAsync?.().catch(() => []) ?? []), 1200, [])) ?? [];
    const options = voices
      .map((voice, index) => ({
        id: voice.identifier ?? `${voice.language ?? "unknown"}:${voice.name ?? index}`,
        label: voice.name?.trim() || voice.identifier?.trim() || `Voice ${index + 1}`,
        language: voice.language ?? "unknown",
        qualityLabel: voice.quality?.trim() || null,
        backend: "expo-speech" as const,
        nativeIdentifier: voice.identifier ?? null
      }))
      .sort(compareVoiceOptions);
    options.forEach((voice) => this.knownVoiceBackendById.set(voice.id, "expo-speech"));
    return options;
  }

  private async getReactNativeVoiceOptions(): Promise<TtsVoiceOption[]> {
    const voices =
      (await withTimeout(Promise.resolve(this.reactNativeTts?.voices?.().catch(() => []) ?? []), 1200, [])) ?? [];
    const options = voices
      .filter((voice) => !voice.notInstalled)
      .map((voice) => ({
        id: voice.id,
        label: voice.name?.trim() || voice.id,
        language: voice.language,
        qualityLabel: voice.networkConnectionRequired ? "Network" : voice.quality >= 500 ? "Enhanced" : "Standard",
        backend: "react-native-tts" as const,
        nativeIdentifier: voice.id
      }))
      .sort(compareVoiceOptions);
    options.forEach((voice) => this.knownVoiceBackendById.set(voice.id, "react-native-tts"));
    return options;
  }

  private async updatePreferredVoiceRouting(voiceId: string | null): Promise<boolean> {
    const previousBackend = this.resolvePreferredBackend();
    this.selectedBackend = voiceId ? await this.resolveBackendForVoiceId(voiceId) : null;
    return Boolean(this.selectedBackend && this.selectedBackend !== previousBackend);
  }

  private getFreedomSpeechProvider(): FreedomSpeechProvider | null {
    try {
      return this.freedomSpeechProviderResolver?.() ?? null;
    } catch {
      return null;
    }
  }

  private canUseFreedomSpeechBackend(): boolean {
    return this.freedomSpeech.isAvailable() && Boolean(this.getFreedomSpeechProvider());
  }

  private async resolveBackendForVoiceId(voiceId: string): Promise<SpeechBackend | null> {
    const cachedBackend = this.knownVoiceBackendById.get(voiceId);
    if (cachedBackend) {
      return cachedBackend;
    }

    const [reactNativeVoices, expoVoices] = await Promise.all([
      this.reactNativeTts ? this.getReactNativeVoiceOptions() : Promise.resolve([]),
      this.expoSpeech ? this.getExpoVoiceOptions() : Promise.resolve([])
    ]);

    if (reactNativeVoices.some((voice) => voice.id === voiceId)) {
      return "react-native-tts";
    }

    if (expoVoices.some((voice) => voice.id === voiceId)) {
      return "expo-speech";
    }

    return null;
  }
}

function compareVoiceOptions(left: TtsVoiceOption, right: TtsVoiceOption): number {
  const leftEnglish = /^en(?:[-_]|$)/i.test(left.language);
  const rightEnglish = /^en(?:[-_]|$)/i.test(right.language);
  if (leftEnglish !== rightEnglish) {
    return leftEnglish ? -1 : 1;
  }

  if (left.language !== right.language) {
    return left.language.localeCompare(right.language);
  }

  return left.label.localeCompare(right.label);
}
