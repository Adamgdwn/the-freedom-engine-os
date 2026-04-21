import { NativeEventEmitter, NativeModules, Platform } from "react-native";

export type SpeechStartEvent = Record<string, never>;
export type SpeechEndEvent = Record<string, never>;
export type SpeechResultsEvent = { value?: string[] };
export type SpeechErrorEvent = { error?: { code?: string; message?: string } };
export type SpeechVolumeChangeEvent = { value?: number };

type VoiceEvents = {
  onSpeechStart: (event: SpeechStartEvent) => void;
  onSpeechEnd: (event: SpeechEndEvent) => void;
  onSpeechError: (event: SpeechErrorEvent) => void;
  onSpeechResults: (event: SpeechResultsEvent) => void;
  onSpeechPartialResults: (event: SpeechResultsEvent) => void;
  onSpeechVolumeChanged: (event: SpeechVolumeChangeEvent) => void;
};

type NativeVoiceModule = {
  startSpeech(locale: string, options: Record<string, unknown>, callback: (error?: string | false) => void): void;
  stopSpeech(callback: (error?: string | false) => void): void;
  cancelSpeech(callback: (error?: string | false) => void): void;
  destroySpeech(callback: (error?: string | false) => void): void;
  isSpeechAvailable(callback: (available: 0 | 1, error?: string) => void): void;
  getSpeechRecognitionServices?(): Promise<string[]> | string[];
};

const nativeVoiceModule = (NativeModules.Voice ?? NativeModules.RCTVoice ?? null) as NativeVoiceModule | null;
const hasNativeEmitterContract =
  typeof (nativeVoiceModule as { addListener?: unknown } | null)?.addListener === "function" &&
  typeof (nativeVoiceModule as { removeListeners?: unknown } | null)?.removeListeners === "function";
const voiceEmitter =
  Platform.OS === "web" || !nativeVoiceModule
    ? null
    : hasNativeEmitterContract
      ? new NativeEventEmitter(nativeVoiceModule as never)
      : new NativeEventEmitter();

function requireNativeVoiceModule(): NativeVoiceModule {
  if (!nativeVoiceModule) {
    throw new Error("Voice native module is unavailable on this build.");
  }
  return nativeVoiceModule;
}

class NativeVoice {
  private loaded = false;
  private listeners: Array<{ remove(): void }> | null = null;
  private events: VoiceEvents = {
    onSpeechStart: () => undefined,
    onSpeechEnd: () => undefined,
    onSpeechError: () => undefined,
    onSpeechResults: () => undefined,
    onSpeechPartialResults: () => undefined,
    onSpeechVolumeChanged: () => undefined
  };

  set onSpeechStart(fn: VoiceEvents["onSpeechStart"]) {
    this.events.onSpeechStart = fn;
  }

  set onSpeechEnd(fn: VoiceEvents["onSpeechEnd"]) {
    this.events.onSpeechEnd = fn;
  }

  set onSpeechError(fn: VoiceEvents["onSpeechError"]) {
    this.events.onSpeechError = fn;
  }

  set onSpeechResults(fn: VoiceEvents["onSpeechResults"]) {
    this.events.onSpeechResults = fn;
  }

  set onSpeechPartialResults(fn: VoiceEvents["onSpeechPartialResults"]) {
    this.events.onSpeechPartialResults = fn;
  }

  set onSpeechVolumeChanged(fn: VoiceEvents["onSpeechVolumeChanged"]) {
    this.events.onSpeechVolumeChanged = fn;
  }

  removeAllListeners(): void {
    this.events.onSpeechStart = () => undefined;
    this.events.onSpeechEnd = () => undefined;
    this.events.onSpeechError = () => undefined;
    this.events.onSpeechResults = () => undefined;
    this.events.onSpeechPartialResults = () => undefined;
    this.events.onSpeechVolumeChanged = () => undefined;

    if (this.listeners) {
      this.listeners.forEach((listener) => listener.remove());
      this.listeners = null;
    }
    this.loaded = false;
  }

  async destroy(): Promise<void> {
    if (!this.loaded && !this.listeners) {
      return;
    }

    const module = requireNativeVoiceModule();
    await new Promise<void>((resolve, reject) => {
      module.destroySpeech((error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        this.removeAllListeners();
        resolve();
      });
    });
  }

  async start(locale: string, options: Record<string, unknown> = {}): Promise<void> {
    if (!this.loaded && !this.listeners && voiceEmitter) {
      this.listeners = Object.keys(this.events).map((key) => voiceEmitter.addListener(key, this.events[key as keyof VoiceEvents]));
      this.loaded = true;
    }

    const module = requireNativeVoiceModule();
    await new Promise<void>((resolve, reject) => {
      module.startSpeech(
        locale,
        {
          EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
          EXTRA_MAX_RESULTS: 5,
          EXTRA_PARTIAL_RESULTS: true,
          REQUEST_PERMISSIONS_AUTO: true,
          ...options
        },
        (error) => {
          if (error) {
            reject(new Error(String(error)));
            return;
          }
          resolve();
        }
      );
    });
  }

  async stop(): Promise<void> {
    if (!this.loaded && !this.listeners) {
      return;
    }
    const module = requireNativeVoiceModule();
    await new Promise<void>((resolve, reject) => {
      module.stopSpeech((error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }

  async cancel(): Promise<void> {
    if (!this.loaded && !this.listeners) {
      return;
    }
    const module = requireNativeVoiceModule();
    await new Promise<void>((resolve, reject) => {
      module.cancelSpeech((error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }

  async isAvailable(): Promise<0 | 1> {
    const module = requireNativeVoiceModule();
    return new Promise((resolve, reject) => {
      module.isSpeechAvailable((available, error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve(available);
      });
    });
  }

  async getSpeechRecognitionServices(): Promise<string[]> {
    const module = requireNativeVoiceModule();
    if (!module.getSpeechRecognitionServices) {
      return [];
    }
    const result = await module.getSpeechRecognitionServices();
    return Array.isArray(result) ? result : [];
  }
}

export default new NativeVoice();
