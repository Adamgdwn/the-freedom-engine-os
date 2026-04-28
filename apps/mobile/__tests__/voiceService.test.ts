import { I18nManager, Platform, PermissionsAndroid } from "react-native";
import Voice from "../src/services/voice/nativeVoice";
import { VoiceService } from "../src/services/voice/voiceService";

jest.mock("../src/services/voice/nativeVoice", () => {
  const mockListeners = new Map();

  return {
    __esModule: true,
    default: {
      __listeners: mockListeners,
      removeAllListeners: jest.fn(() => mockListeners.clear()),
      destroy: jest.fn(async () => undefined),
      isAvailable: jest.fn(async () => 1),
      getSpeechRecognitionServices: jest.fn(async () => ["com.google.android.googlequicksearchbox"]),
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      cancel: jest.fn(async () => undefined),
      set onSpeechStart(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechStart", handler);
      },
      set onSpeechRecognized(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechRecognized", handler);
      },
      set onSpeechEnd(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechEnd", handler);
      },
      set onSpeechError(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechError", handler);
      },
      set onSpeechResults(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechResults", handler);
      },
      set onSpeechPartialResults(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechPartialResults", handler);
      },
      set onSpeechVolumeChanged(handler: (event?: unknown) => void) {
        mockListeners.set("onSpeechVolumeChanged", handler);
      }
    }
  };
});

describe("VoiceService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(I18nManager, "getConstants").mockReturnValue({
      isRTL: false,
      doLeftAndRightSwapInRTL: true,
      localeIdentifier: "en-CA"
    });
    jest.spyOn(PermissionsAndroid, "request").mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("stops recognition before forcing a cancel fallback", async () => {
    const service = new VoiceService();

    await service.startStreamingSession({
      onError: jest.fn()
    });
    jest.clearAllMocks();

    service.stopStreamingSession();

    expect(Voice.stop).toHaveBeenCalledTimes(1);
    expect(Voice.cancel).not.toHaveBeenCalled();

    jest.advanceTimersByTime(150);
    await flushAsyncWork();

    expect(Voice.cancel).toHaveBeenCalledTimes(1);
  });

  test("still forces a native recognizer stop even if JS state thinks the session is idle", async () => {
    const service = new VoiceService();

    service.stopStreamingSession();

    expect(Voice.stop).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(150);
    await flushAsyncWork();

    expect(Voice.cancel).toHaveBeenCalledTimes(1);
  });

  test("restarts recognition after an unexpected end and preserves the captured transcript", async () => {
    const service = new VoiceService();
    const onFinalTranscript = jest.fn();
    const onReconnect = jest.fn();

    await service.startStreamingSession({
      onFinalTranscript,
      onReconnect,
      onError: jest.fn()
    });
    (Voice.start as jest.Mock).mockClear();
    (Voice.stop as jest.Mock).mockClear();
    (Voice.cancel as jest.Mock).mockClear();

    const partialListener = getListener("onSpeechPartialResults");
    const endListener = getListener("onSpeechEnd");

    partialListener({
      value: ["resume after the pause"]
    });
    endListener();

    expect(onReconnect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(120);
    await Promise.resolve();

    expect(onFinalTranscript).toHaveBeenCalledWith("resume after the pause");
    expect(Voice.stop).not.toHaveBeenCalled();
    expect(Voice.cancel).not.toHaveBeenCalled();
    expect(Voice.start).toHaveBeenCalledTimes(1);
  });

  test("commits the latest transcript when Android ends the recognizer without a final result event", async () => {
    const service = new VoiceService();
    const onFinalTranscript = jest.fn();
    const onReconnect = jest.fn();

    await service.startStreamingSession({
      onFinalTranscript,
      onReconnect,
      onError: jest.fn()
    });
    (Voice.start as jest.Mock).mockClear();

    const partialListener = getListener("onSpeechPartialResults");
    const endListener = getListener("onSpeechEnd");

    partialListener({
      value: ["Hey freedom can you give me a quick voice check please"]
    });
    endListener();

    expect(onFinalTranscript).toHaveBeenCalledWith("Hey freedom can you give me a quick voice check please");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(120);
    await Promise.resolve();

    expect(Voice.start).toHaveBeenCalledTimes(1);
  });

  test("can restart the active recognizer when the session is still alive but Android has stopped listening", async () => {
    const service = new VoiceService();

    await service.startStreamingSession({
      onError: jest.fn()
    });
    (Voice.start as jest.Mock).mockClear();

    const endListener = getListener("onSpeechEnd");
    endListener();

    expect(service.isSessionActive()).toBe(true);
    expect(service.isRecognizerRunning()).toBe(false);

    await service.restartActiveRecognition();

    expect(Voice.start).toHaveBeenCalledTimes(1);
    expect(service.isRecognizerRunning()).toBe(true);
  });

  test("starts recognition with the device locale and manual permission handling on Android", async () => {
    const service = new VoiceService();
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android"
    });

    (Voice.getSpeechRecognitionServices as jest.Mock).mockResolvedValue([
      "com.google.android.as",
      "com.google.android.tts"
    ]);

    await service.startStreamingSession({
      onError: jest.fn()
    });
    await flushAsyncWork();

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    expect(Voice.start).toHaveBeenCalledWith(
      "en-CA",
      expect.objectContaining({
        REQUEST_PERMISSIONS_AUTO: false,
        EXTRA_PARTIAL_RESULTS: true
      })
    );

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  test("surfaces a clear error when Android only exposes the TTS package", async () => {
    const service = new VoiceService();
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android"
    });

    (Voice.isAvailable as jest.Mock).mockResolvedValue(0);
    (Voice.getSpeechRecognitionServices as jest.Mock).mockResolvedValue(["com.google.android.tts"]);

    await expect(
      service.startStreamingSession({
        onError: jest.fn()
      })
    ).rejects.toThrow("Speech recognition is not available in this build.");

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
    (Voice.isAvailable as jest.Mock).mockResolvedValue(1);
  });

  test("does not reconnect after a fatal recognition error ends the session", async () => {
    const service = new VoiceService();
    const onError = jest.fn();
    const onReconnect = jest.fn();

    await service.startStreamingSession({
      onError,
      onReconnect
    });
    (Voice.start as jest.Mock).mockClear();

    const errorListener = getListener("onSpeechError");
    const endListener = getListener("onSpeechEnd");

    errorListener({
      error: {
        code: "4",
        message: "4/error from server"
      }
    });
    endListener();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(Voice.start).not.toHaveBeenCalled();
  });
});

function getListener(eventName: string): (event?: unknown) => void {
  const listeners = (Voice as unknown as { __listeners: Map<string, (event?: unknown) => void> }).__listeners;
  const listener = listeners.get(eventName);
  if (!listener) {
    throw new Error(`Missing listener for ${eventName}`);
  }

  return listener;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
