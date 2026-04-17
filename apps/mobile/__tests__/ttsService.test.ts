import { TtsService } from "../src/services/voice/ttsService";

const ReactNativeTts = require("react-native-tts").default;

describe("TtsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("lists installed voices in a stable, user-friendly order", async () => {
    const service = new TtsService();

    const voices = await service.listVoices();

    expect(voices.map((voice) => voice.id)).toEqual(["en-gb-enhanced", "en-us-standard"]);
    expect(voices[0]).toMatchObject({
      id: "en-gb-enhanced",
      label: "English UK Enhanced",
      language: "en-GB",
      qualityLabel: "Enhanced"
    });
  });

  test("applies the selected voice when the user chooses one", async () => {
    const service = new TtsService();

    await service.setPreferredVoice("en-gb-enhanced");

    expect(ReactNativeTts.setDefaultVoice).toHaveBeenCalledWith("en-gb-enhanced");
    expect(ReactNativeTts.setDefaultLanguage).toHaveBeenCalledWith("en-GB");
  });

  test("switches voices without cold-restarting the backend", async () => {
    const service = new TtsService();

    await service.setPreferredVoice("en-us-standard");
    jest.clearAllMocks();

    await service.setPreferredVoice("en-gb-enhanced");

    expect(ReactNativeTts.stop).not.toHaveBeenCalled();
    expect(ReactNativeTts.getInitStatus).not.toHaveBeenCalled();
    expect(ReactNativeTts.setDefaultVoice).toHaveBeenCalledWith("en-gb-enhanced");
  });

  test("applies a new preferred voice during prepare without resetting the engine", async () => {
    const service = new TtsService();

    await service.prepare("en-us-standard");
    jest.clearAllMocks();

    await service.prepare("en-gb-enhanced");

    expect(ReactNativeTts.stop).not.toHaveBeenCalled();
    expect(ReactNativeTts.getInitStatus).not.toHaveBeenCalled();
    expect(ReactNativeTts.setDefaultVoice).toHaveBeenCalledWith("en-gb-enhanced");
    expect(ReactNativeTts.setDefaultLanguage).toHaveBeenCalledWith("en-GB");
  });

  test("falls back to the automatic English voice when the selection is cleared", async () => {
    const service = new TtsService();

    await service.setPreferredVoice("en-gb-enhanced");
    jest.clearAllMocks();

    await service.setPreferredVoice(null);

    expect(ReactNativeTts.setDefaultVoice).toHaveBeenCalledWith("en-gb-enhanced");
    expect(ReactNativeTts.setDefaultLanguage).toHaveBeenCalledWith("en-GB");
  });

  test("switches back to the selected voice backend after a fallback", async () => {
    const service = new TtsService();
    const internals = service as unknown as {
      lastSuccessfulBackend: "expo-speech" | "react-native-tts" | null;
    };

    internals.lastSuccessfulBackend = "expo-speech";
    jest.clearAllMocks();

    await service.setPreferredVoice("en-gb-enhanced");

    expect(ReactNativeTts.setDefaultVoice).toHaveBeenCalledWith("en-gb-enhanced");
    expect(ReactNativeTts.setDefaultLanguage).toHaveBeenCalledWith("en-GB");
  });
});
