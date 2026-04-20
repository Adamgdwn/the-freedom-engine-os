import type { TtsVoiceOption } from "./ttsService";

const ENGLISH_LOCALE_SCORES: Record<string, number> = {
  "en-gb": 7,
  "en-au": 6,
  "en-ca": 6,
  "en-ie": 5,
  "en-nz": 5,
  "en-us": 4,
  "en-in": 3,
  "en-za": 3
};

export function pickAutomaticVoice(voices: TtsVoiceOption[]): TtsVoiceOption | null {
  return rankVoiceOptionsForCompanion(voices)[0] ?? voices[0] ?? null;
}

export function shortlistVoiceOptions(
  voices: TtsVoiceOption[],
  selectedVoiceId: string | null,
  limit = 4
): TtsVoiceOption[] {
  const ranked = rankVoiceOptionsForCompanion(voices);
  const shortlist = ranked.slice(0, limit);

  if (!selectedVoiceId || shortlist.some((voice) => voice.id === selectedVoiceId)) {
    return shortlist;
  }

  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId) ?? null;
  if (!selectedVoice) {
    return shortlist;
  }

  return [...shortlist.slice(0, Math.max(0, limit - 1)), selectedVoice];
}

export function rankVoiceOptionsForCompanion(voices: TtsVoiceOption[]): TtsVoiceOption[] {
  return [...voices].sort((left, right) => compareVoicePreference(right, left));
}

export function describeVoiceOption(voice: TtsVoiceOption): string {
  const badges = buildVoiceSelectionBadges(voice);
  const notes = [voice.label, ...badges, humanizeVoiceEngine(voice)];
  return notes.join(" • ");
}

export function summarizeVoiceOption(voice: TtsVoiceOption): string {
  return buildVoiceSelectionBadges(voice).join(" • ");
}

export function describeVoiceOptionRecommendation(voice: TtsVoiceOption): string {
  const traits = extractVoiceTraits(voice);
  if (traits.mechanicalRisk === "low") {
    return "Softer and less robotic for longer spoken replies.";
  }
  if (traits.clarity === "high") {
    return "Cleaner and clearer if you want a steadier delivery.";
  }
  if (traits.warmth === "high") {
    return "A warmer voice with more character than the default standard voice.";
  }
  return "A balanced fallback if you want a simpler, neutral spoken reply.";
}

export function buildVoiceSelectionBadges(voice: TtsVoiceOption): string[] {
  const traits = extractVoiceTraits(voice);
  const badges = [humanizeVoiceLocale(voice.language)];

  if (traits.mechanicalRisk === "low") {
    badges.push("Less robotic");
  } else if (traits.warmth === "high") {
    badges.push("Warmer");
  } else if (traits.clarity === "high") {
    badges.push("Clearer");
  }

  if (voice.qualityLabel === "Enhanced") {
    badges.push("Enhanced");
  } else if (voice.qualityLabel === "Network") {
    badges.push("Network");
  } else if (voice.qualityLabel === "Standard") {
    badges.push("Standard");
  }

  return badges.slice(0, 3);
}

export function humanizeVoiceLocale(language: string): string {
  const normalized = normalizeLanguage(language);
  switch (normalized) {
    case "en-us":
      return "English US";
    case "en-gb":
      return "English UK";
    case "en-au":
      return "English AU";
    case "en-ca":
      return "English CA";
    case "en-in":
      return "English IN";
    case "en-ie":
      return "English IE";
    case "en-nz":
      return "English NZ";
    case "en-za":
      return "English ZA";
    default:
      return language.toUpperCase();
  }
}

function compareVoicePreference(left: TtsVoiceOption, right: TtsVoiceOption): number {
  const scoreDelta = scoreVoiceForCompanion(left) - scoreVoiceForCompanion(right);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const englishDelta = Number(isEnglishVoice(left)) - Number(isEnglishVoice(right));
  if (englishDelta !== 0) {
    return englishDelta;
  }

  const languageDelta = humanizeVoiceLocale(right.language).localeCompare(humanizeVoiceLocale(left.language));
  if (languageDelta !== 0) {
    return languageDelta;
  }

  return right.label.localeCompare(left.label);
}

function scoreVoiceForCompanion(voice: TtsVoiceOption): number {
  const traits = extractVoiceTraits(voice);
  const normalizedLanguage = normalizeLanguage(voice.language);
  let score = isEnglishVoice(voice) ? 100 : 0;

  if (voice.backend === "react-native-tts") {
    score += 18;
  }

  if (voice.qualityLabel === "Enhanced") {
    score += 20;
  } else if (voice.qualityLabel === "Standard") {
    score += 6;
  } else if (voice.qualityLabel === "Network") {
    score -= 14;
  }

  score += ENGLISH_LOCALE_SCORES[normalizedLanguage] ?? 0;

  if (traits.warmth === "high") {
    score += 14;
  }
  if (traits.clarity === "high") {
    score += 10;
  }
  if (traits.mechanicalRisk === "low") {
    score += 18;
  }
  if (traits.mechanicalRisk === "high") {
    score -= 10;
  }

  return score;
}

function isEnglishVoice(voice: TtsVoiceOption): boolean {
  return /^en(?:[-_]|$)/i.test(voice.language);
}

function humanizeVoiceEngine(voice: TtsVoiceOption): string {
  return voice.backend === "react-native-tts" ? "Android voice engine" : "Expo speech engine";
}

function normalizeLanguage(language: string): string {
  return language.replace(/_/g, "-").toLowerCase();
}

function extractVoiceTraits(voice: TtsVoiceOption): {
  warmth: "high" | "medium" | "low";
  clarity: "high" | "medium" | "low";
  mechanicalRisk: "low" | "medium" | "high";
} {
  const haystack = `${voice.label} ${voice.nativeIdentifier ?? ""} ${voice.qualityLabel ?? ""}`.toLowerCase();

  const hasWarmCue = /\bnatural\b|\bstudio\b|\bpremium\b|\benhanced\b|\bwavenet\b/.test(haystack);
  const hasClearCue = /\bneural\b|\bclear\b|\bcrisp\b|\bstudio\b|\bpremium\b/.test(haystack);
  const hasMechanicalCue = /\bcompact\b|\bbasic\b|\bstandard\b/.test(haystack) && !/\benhanced\b/.test(haystack);

  return {
    warmth: hasWarmCue ? "high" : voice.qualityLabel === "Enhanced" ? "medium" : "low",
    clarity: hasClearCue ? "high" : voice.backend === "react-native-tts" ? "medium" : "low",
    mechanicalRisk: hasWarmCue || hasClearCue || voice.qualityLabel === "Enhanced" ? "low" : hasMechanicalCue ? "high" : "medium"
  };
}
