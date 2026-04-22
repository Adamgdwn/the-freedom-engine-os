import { TtsService } from "../src/services/voice/ttsService";

const ReactNativeTts = require("react-native-tts").default;

describe("TtsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not auto-select the legacy phone voice without an explicit backup choice", () => {
    const service = new TtsService();

    expect(service.isAvailable()).toBe(false);
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

  test("does not cold-restart the legacy backup engine while switching backup voices during prepare", async () => {
    const service = new TtsService();

    await service.prepare("en-us-standard");
    jest.clearAllMocks();

    await service.prepare("en-gb-enhanced");

    expect(ReactNativeTts.stop).not.toHaveBeenCalled();
    expect(ReactNativeTts.getInitStatus).not.toHaveBeenCalled();
  });

  test("disables the legacy backup again when the explicit selection is cleared", async () => {
    const service = new TtsService();

    await service.setPreferredVoice("en-gb-enhanced");
    jest.clearAllMocks();

    await service.setPreferredVoice(null);

    expect(service.isAvailable()).toBe(false);
    await expect(service.describeAvailability()).resolves.toContain("Legacy phone TTS is no longer selected automatically");
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

  test("prefers Freedom hosted speech over a previously selected legacy phone voice", async () => {
    const service = new TtsService();

    await service.setPreferredVoice("en-gb-enhanced");
    jest.clearAllMocks();

    service.setFreedomSpeechProviderResolver(() => ({
      endpointUrl: "https://freedom.example.com",
      voiceProfile: {
        targetVoice: "marin"
      },
      label: "the standalone companion"
    }));

    await service.prepare();
    const availability = await service.describeAvailability();

    expect(availability).toContain("Freedom hosted speech is ready");
    expect(ReactNativeTts.getInitStatus).not.toHaveBeenCalled();
    expect(ReactNativeTts.setDefaultVoice).not.toHaveBeenCalled();
  });
});
