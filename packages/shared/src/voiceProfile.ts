export const assistantVoicePresetIds = [
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "marin",
  "sage",
  "shimmer",
  "verse"
] as const;

export const voiceGenderPresentationIds = ["feminine", "masculine", "neutral", "androgynous", "unspecified"] as const;
export const voiceWarmthIds = ["low", "medium", "high"] as const;
export const voicePaceIds = ["slower", "steady", "brisk", "adaptive"] as const;

export type AssistantVoicePresetId = (typeof assistantVoicePresetIds)[number];
export type VoiceGenderPresentationId = (typeof voiceGenderPresentationIds)[number];
export type VoiceWarmthId = (typeof voiceWarmthIds)[number];
export type VoicePaceId = (typeof voicePaceIds)[number];

export interface AssistantVoicePresetCatalogEntry {
  id: AssistantVoicePresetId;
  label: string;
  summary: string;
  gender: VoiceGenderPresentationId;
  accentHints: string[];
  toneHints: string[];
  warmth: VoiceWarmthId;
  pace: VoicePaceId;
}

export const legacyAssistantVoiceAliases: Record<string, AssistantVoicePresetId> = {
  nova: "marin"
};

export const assistantVoiceCatalog: readonly AssistantVoicePresetCatalogEntry[] = [
  {
    id: "alloy",
    label: "Alloy",
    summary: "Balanced and neutral.",
    gender: "neutral",
    accentHints: ["international", "general"],
    toneHints: ["clear", "direct", "neutral"],
    warmth: "medium",
    pace: "steady"
  },
  {
    id: "ash",
    label: "Ash",
    summary: "Grounded and calm.",
    gender: "masculine",
    accentHints: ["general", "international"],
    toneHints: ["grounded", "calm", "measured"],
    warmth: "medium",
    pace: "steady"
  },
  {
    id: "ballad",
    label: "Ballad",
    summary: "Softer and more expressive.",
    gender: "masculine",
    accentHints: ["general", "international"],
    toneHints: ["warm", "storytelling", "expressive"],
    warmth: "high",
    pace: "slower"
  },
  {
    id: "cedar",
    label: "Cedar",
    summary: "Low-key, direct, and steady.",
    gender: "masculine",
    accentHints: ["general", "international"],
    toneHints: ["direct", "dry", "steady"],
    warmth: "low",
    pace: "steady"
  },
  {
    id: "coral",
    label: "Coral",
    summary: "Bright and warm.",
    gender: "feminine",
    accentHints: ["general", "international"],
    toneHints: ["warm", "upbeat", "friendly"],
    warmth: "high",
    pace: "adaptive"
  },
  {
    id: "echo",
    label: "Echo",
    summary: "Plainspoken and brisk.",
    gender: "masculine",
    accentHints: ["general", "international"],
    toneHints: ["plainspoken", "direct", "focused"],
    warmth: "low",
    pace: "brisk"
  },
  {
    id: "marin",
    label: "Marin",
    summary: "Smooth, capable, and warm.",
    gender: "feminine",
    accentHints: ["general", "international"],
    toneHints: ["warm", "capable", "assured"],
    warmth: "high",
    pace: "steady"
  },
  {
    id: "sage",
    label: "Sage",
    summary: "Measured and reflective.",
    gender: "androgynous",
    accentHints: ["general", "international"],
    toneHints: ["calm", "measured", "thoughtful"],
    warmth: "medium",
    pace: "slower"
  },
  {
    id: "shimmer",
    label: "Shimmer",
    summary: "Lighter and brighter.",
    gender: "feminine",
    accentHints: ["general", "international"],
    toneHints: ["bright", "energetic", "light"],
    warmth: "medium",
    pace: "brisk"
  },
  {
    id: "verse",
    label: "Verse",
    summary: "Dramatic and expressive.",
    gender: "androgynous",
    accentHints: ["general", "international"],
    toneHints: ["expressive", "dramatic", "textured"],
    warmth: "medium",
    pace: "adaptive"
  }
] as const;

export function normalizeAssistantVoicePresetId(value: string | null | undefined): AssistantVoicePresetId {
  const normalized = value?.trim().toLowerCase() ?? "";
  const aliased = legacyAssistantVoiceAliases[normalized] ?? normalized;
  return assistantVoicePresetIds.includes(aliased as AssistantVoicePresetId) ? (aliased as AssistantVoicePresetId) : "marin";
}

export function getAssistantVoiceCatalogEntry(voiceId: string | null | undefined): AssistantVoicePresetCatalogEntry {
  const normalized = normalizeAssistantVoicePresetId(voiceId);
  return assistantVoiceCatalog.find((voice) => voice.id === normalized) ?? assistantVoiceCatalog[0];
}

export function buildAssistantSpeechInstructions(profile: {
  targetVoice: string;
  accent?: string | null;
  tone?: string | null;
  warmth?: string | null;
  pace?: string | null;
  notes?: string | null;
}): string {
  const entry = getAssistantVoiceCatalogEntry(profile.targetVoice);
  const accentHint = profile.accent?.trim() || entry.accentHints[0] || "general";
  const toneHint = profile.tone?.trim() || entry.toneHints.join(", ");
  const warmth = profile.warmth ?? entry.warmth;
  const pace = profile.pace ?? entry.pace;
  const notes = profile.notes?.trim();

  const parts = [
    "Sound natural, warm, and human. Avoid robotic delivery.",
    accentHint === "international" ? "Keep the accent light and international." : `Accent hint: ${accentHint}.`,
    toneHint ? `Tone: ${toneHint}.` : null,
    warmth === "high" ? "Keep the delivery warm and textured." : warmth === "low" ? "Keep the delivery lean and dry." : "Keep the delivery balanced and calm.",
    pace === "slower"
      ? "Speak a little slower than average."
      : pace === "brisk"
        ? "Speak a little brisker than average."
        : pace === "adaptive"
          ? "Adapt the pace naturally to the sentence."
          : "Keep a steady speaking pace.",
    notes ? `Operator note: ${notes}.` : null
  ];

  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" ");
}

export function summarizeAssistantVoiceProfile(profile: {
  targetVoice: string;
  gender?: string | null;
  accent?: string | null;
  tone?: string | null;
  warmth?: string | null;
  pace?: string | null;
}): string {
  const entry = getAssistantVoiceCatalogEntry(profile.targetVoice);
  const parts = [entry.label];

  if (profile.gender && profile.gender !== "unspecified") {
    parts.push(humanizeVoiceGender(profile.gender));
  }
  if (profile.accent?.trim()) {
    parts.push(profile.accent.trim());
  }
  if (profile.tone?.trim()) {
    parts.push(profile.tone.trim());
  }
  if (profile.warmth && profile.warmth !== "medium") {
    parts.push(profile.warmth === "high" ? "warmer" : "leaner");
  }
  if (profile.pace && profile.pace !== "steady") {
    parts.push(humanizeVoicePace(profile.pace));
  }

  return parts.join(" • ");
}

export function humanizeVoiceGender(value: string): string {
  switch (value) {
    case "feminine":
      return "feminine";
    case "masculine":
      return "masculine";
    case "neutral":
      return "neutral";
    case "androgynous":
      return "androgynous";
    default:
      return "unspecified";
  }
}

export function humanizeVoicePace(value: string): string {
  switch (value) {
    case "slower":
      return "slower";
    case "brisk":
      return "brisk";
    case "adaptive":
      return "adaptive";
    default:
      return "steady";
  }
}
