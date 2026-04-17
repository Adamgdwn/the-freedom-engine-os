import type { TtsVoiceOption } from "../src/services/voice/ttsService";
import {
  buildVoiceSelectionBadges,
  pickAutomaticVoice,
  shortlistVoiceOptions
} from "../src/services/voice/voiceOptionPersona";

const baseVoices: TtsVoiceOption[] = [
  {
    id: "en-us-standard",
    label: "English US Standard",
    language: "en-US",
    qualityLabel: "Standard",
    backend: "react-native-tts",
    nativeIdentifier: "en-us-standard"
  },
  {
    id: "en-gb-enhanced",
    label: "English UK Enhanced",
    language: "en-GB",
    qualityLabel: "Enhanced",
    backend: "react-native-tts",
    nativeIdentifier: "en-gb-enhanced"
  },
  {
    id: "en-us-compact",
    label: "English US Compact",
    language: "en-US",
    qualityLabel: "Standard",
    backend: "expo-speech",
    nativeIdentifier: "en-us-compact"
  },
  {
    id: "en-au-natural",
    label: "English AU Natural",
    language: "en-AU",
    qualityLabel: "Enhanced",
    backend: "react-native-tts",
    nativeIdentifier: "en-au-natural"
  },
  {
    id: "fr-standard",
    label: "French Standard",
    language: "fr-FR",
    qualityLabel: "Standard",
    backend: "react-native-tts",
    nativeIdentifier: "fr-standard"
  }
];

describe("voiceOptionPersona", () => {
  test("prefers richer English voices for automatic spoken replies", () => {
    expect(pickAutomaticVoice(baseVoices)?.id).toBe("en-gb-enhanced");
  });

  test("shortlists the best matches while keeping the selected voice visible", () => {
    const shortlist = shortlistVoiceOptions(baseVoices, "fr-standard", 3);

    expect(shortlist.map((voice) => voice.id)).toEqual(["en-gb-enhanced", "en-au-natural", "fr-standard"]);
  });

  test("surfaces plain-language badges instead of low-signal metadata", () => {
    expect(buildVoiceSelectionBadges(baseVoices[1])).toEqual(["English UK", "Less robotic", "Enhanced"]);
  });
});
