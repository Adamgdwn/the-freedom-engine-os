import { buildAssistantSpeechInstructions, normalizeAssistantVoicePresetId } from "@freedom/shared";

export interface MobileCompanionSpeechVoiceProfile {
  targetVoice?: string | null;
  accent?: string | null;
  tone?: string | null;
  warmth?: string | null;
  pace?: string | null;
  notes?: string | null;
}

type NormalizedMobileCompanionSpeechVoiceProfile = {
  targetVoice: string;
  accent: string | null;
  tone: string | null;
  warmth: string | null;
  pace: string | null;
  notes: string | null;
};

export async function requestMobileCompanionSpeech(input: {
  text: string;
  voiceProfile?: MobileCompanionSpeechVoiceProfile | null;
}): Promise<{ audio: ArrayBuffer; contentType: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for Freedom speech playback.");
  }

  const text = input.text.trim();
  if (!text) {
    throw new Error("Freedom speech input cannot be empty.");
  }

  const voiceProfile = normalizeVoiceProfile(input.voiceProfile);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.MOBILE_DISCONNECTED_ASSISTANT_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
      voice: voiceProfile.targetVoice,
      input: text,
      instructions: buildAssistantSpeechInstructions(voiceProfile),
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Freedom speech request failed (${response.status}).`);
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("content-type")?.trim() || "audio/mpeg"
  };
}

export function readSpeechTextHeader(headers: Headers): string {
  const encoded = headers.get("x-freedom-speech-input")?.trim() ?? "";
  if (!encoded) {
    throw new Error("Freedom speech input header is required.");
  }

  try {
    return decodeURIComponent(encoded).trim();
  } catch {
    throw new Error("Freedom speech input header is malformed.");
  }
}

export function readSpeechVoiceProfileHeader(headers: Headers): MobileCompanionSpeechVoiceProfile {
  const encoded = headers.get("x-freedom-speech-profile")?.trim();
  if (!encoded) {
    return { targetVoice: "marin" };
  }

  try {
    return normalizeVoiceProfile(JSON.parse(decodeURIComponent(encoded)) as MobileCompanionSpeechVoiceProfile);
  } catch {
    return { targetVoice: "marin" };
  }
}

function normalizeVoiceProfile(
  profile: MobileCompanionSpeechVoiceProfile | null | undefined
): NormalizedMobileCompanionSpeechVoiceProfile {
  return {
    targetVoice: normalizeAssistantVoicePresetId(profile?.targetVoice ?? "marin"),
    accent: profile?.accent?.trim() || null,
    tone: profile?.tone?.trim() || null,
    warmth: profile?.warmth?.trim() || null,
    pace: profile?.pace?.trim() || null,
    notes: profile?.notes?.trim() || null
  };
}
