import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { I18nManager, Platform } from "react-native";
import { VoiceService } from "../src/services/voice/voiceService";

describe("VoiceService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(I18nManager, "getConstants").mockReturnValue({
      isRTL: false,
      doLeftAndRightSwapInRTL: true,
      localeIdentifier: "en-CA"
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("stops recognition before forcing an abort fallback", async () => {
    const service = new VoiceService();

    await service.startStreamingSession({
      onError: jest.fn()
    });
    jest.clearAllMocks();

    service.stopStreamingSession();

    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.abort).not.toHaveBeenCalled();

    jest.advanceTimersByTime(150);

    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalledTimes(1);
  });

  test("still forces a native recognizer stop even if JS state thinks the session is idle", () => {
    const service = new VoiceService();

    service.stopStreamingSession();

    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(150);

    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalledTimes(1);
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
    (ExpoSpeechRecognitionModule.start as jest.Mock).mockClear();
    (ExpoSpeechRecognitionModule.stop as jest.Mock).mockClear();
    (ExpoSpeechRecognitionModule.abort as jest.Mock).mockClear();

    const resultListener = getListener("result");
    const endListener = getListener("end");

    resultListener({
      results: [{ transcript: "resume after the pause" }],
      isFinal: false
    });
    endListener();

    expect(onReconnect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(120);
    await Promise.resolve();

    expect(onFinalTranscript).toHaveBeenCalledWith("resume after the pause");
    expect(ExpoSpeechRecognitionModule.stop).not.toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.abort).not.toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
  });

  test("commits the latest transcript when Android ends the recognizer without a final flag", async () => {
    const service = new VoiceService();
    const onFinalTranscript = jest.fn();
    const onReconnect = jest.fn();

    await service.startStreamingSession({
      onFinalTranscript,
      onReconnect,
      onError: jest.fn()
    });
    (ExpoSpeechRecognitionModule.start as jest.Mock).mockClear();

    const resultListener = getListener("result");
    const endListener = getListener("end");

    resultListener({
      results: [{ transcript: "Hey freedom can you give me a quick voice check please" }],
      isFinal: false
    });
    endListener();

    expect(onFinalTranscript).toHaveBeenCalledWith("Hey freedom can you give me a quick voice check please");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(120);
    await Promise.resolve();

    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
  });

  test("prefers a working Android recognizer when the device default is the TTS package", async () => {
    const service = new VoiceService();
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android"
    });

    (ExpoSpeechRecognitionModule.getSpeechRecognitionServices as jest.Mock).mockReturnValue([
      "com.google.android.as",
      "com.google.android.tts"
    ]);
    (ExpoSpeechRecognitionModule.getDefaultRecognitionService as jest.Mock).mockReturnValue({
      packageName: "com.google.android.tts"
    });
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockResolvedValue({
      installedLocales: ["en-CA", "en-US"]
    });

    await service.startStreamingSession({
      onError: jest.fn()
    });
    await flushAsyncWork();

    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
      expect.objectContaining({
        androidRecognitionServicePackage: "com.google.android.as",
        continuous: false,
        lang: "en-CA",
        requiresOnDeviceRecognition: true
      })
    );

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  test("falls back to another real recognizer when the on-device locale model is missing", async () => {
    const service = new VoiceService();
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android"
    });

    (ExpoSpeechRecognitionModule.getSpeechRecognitionServices as jest.Mock).mockReturnValue([
      "com.google.android.as",
      "com.google.android.googlequicksearchbox",
      "com.google.android.tts"
    ]);
    (ExpoSpeechRecognitionModule.getDefaultRecognitionService as jest.Mock).mockReturnValue({
      packageName: "com.google.android.googlequicksearchbox"
    });
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockResolvedValue({
      installedLocales: []
    });

    await service.startStreamingSession({
      onError: jest.fn()
    });
    await flushAsyncWork();

    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
      expect.objectContaining({
        androidRecognitionServicePackage: "com.google.android.googlequicksearchbox",
        continuous: false
      })
    );
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
      expect.not.objectContaining({
        requiresOnDeviceRecognition: true
      })
    );

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  test("opens the Android speech-model download flow when only the missing on-device locale is available", async () => {
    const service = new VoiceService();
    const onError = jest.fn();
    const originalPlatformOs = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android"
    });

    (ExpoSpeechRecognitionModule.getSpeechRecognitionServices as jest.Mock).mockReturnValue([
      "com.google.android.as",
      "com.google.android.tts"
    ]);
    (ExpoSpeechRecognitionModule.getDefaultRecognitionService as jest.Mock).mockReturnValue({
      packageName: "com.google.android.tts"
    });
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockResolvedValue({
      installedLocales: []
    });
    (ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload as jest.Mock).mockResolvedValue({
      status: "opened_dialog",
      message: "Opened the model download dialog."
    });

    await service.startStreamingSession({
      onError
    });
    await flushAsyncWork();

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: expect.any(String)
      })
    );
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("Approve the download prompt"));

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  test("does not reconnect after a fatal recognition error ends the session", async () => {
    const service = new VoiceService();
    const onError = jest.fn();
    const onReconnect = jest.fn();

    await service.startStreamingSession({
      onError,
      onReconnect
    });
    (ExpoSpeechRecognitionModule.start as jest.Mock).mockClear();

    const errorListener = getListener("error");
    const endListener = getListener("end");

    errorListener({
      error: "language-not-supported",
      message: "Requested language is supported, but not yet downloaded."
    });
    endListener();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReconnect).not.toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });
});

function getListener(eventName: string): (payload?: unknown) => void {
  const call = (ExpoSpeechRecognitionModule.addListener as jest.Mock).mock.calls.find(([name]) => name === eventName);
  if (!call) {
    throw new Error(`Expected a listener for ${eventName}`);
  }

  return call[1] as (payload?: unknown) => void;
}

async function flushAsyncWork(turns = 6): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}
