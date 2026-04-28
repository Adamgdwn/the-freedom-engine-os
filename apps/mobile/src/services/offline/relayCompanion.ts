import { RELAY_BASE_URL, RELAY_SHARED_SECRET } from "../../generated/runtimeConfig";
import type { CreateVoiceRuntimeSessionRequest, VoiceRuntimeSessionResponse } from "@freedom/shared";

export type RelayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RelayChatPurpose = "standalone_chat" | "offline_summary" | "learning_extract";
const WEB_LOOKUP_PATTERNS = [
  /\bsearch\b/i,
  /\blook\s+up\b/i,
  /\blookup\b/i,
  /\bresearch\b/i,
  /\bon the web\b/i,
  /\bonline\b/i,
  /\bcurrent\b/i,
  /\blatest\b/i,
  /\btoday\b/i,
  /\bnews\b/i,
  /\bweather\b/i,
  /\bforecast\b/i,
  /\bprice\b/i,
  /\bstock\b/i
];

const RELAY_TIMEOUT_MS = 7_000;

function normalizeRelayMessageContent(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export class RelayCompanionService {
  async generateReply(messages: RelayMessage[], runtimeContext?: string): Promise<string> {
    const latestUserPrompt = normalizeRelayMessageContent(
      [...messages].reverse().find((message) => message.role === "user")?.content
    );
    const data = await this.post<{ reply: string }>("/chat", {
      messages,
      purpose: "standalone_chat" satisfies RelayChatPurpose,
      runtimeContext: runtimeContext?.trim() || undefined,
      enableWebLookup: Boolean(latestUserPrompt && WEB_LOOKUP_PATTERNS.some((pattern) => pattern.test(latestUserPrompt)))
    });
    return data.reply;
  }

  async summarizeDraftTurns(draftTurns: string[], runtimeContext?: string): Promise<string> {
    const messages: RelayMessage[] = [
      {
        role: "system",
        content:
          "Summarize these offline mobile ideation notes for later desktop review. Keep it factual, concise, and focused on next steps."
      },
      {
        role: "user",
        content: draftTurns.map((turn, i) => `${i + 1}. ${turn}`).join("\n")
      }
    ];
    const data = await this.post<{ reply: string }>("/chat", {
      messages,
      purpose: "offline_summary" satisfies RelayChatPurpose,
      runtimeContext: runtimeContext?.trim() || undefined
    });
    return data.reply;
  }

  async extractLearningSignals(prompt: string, runtimeContext?: string): Promise<string> {
    const messages: RelayMessage[] = [
      {
        role: "user",
        content: prompt
      }
    ];
    const data = await this.post<{ reply: string }>("/chat", {
      messages,
      purpose: "learning_extract",
      runtimeContext: runtimeContext?.trim() || undefined
    });
    return data.reply;
  }

  async createVoiceSession(input: CreateVoiceRuntimeSessionRequest): Promise<VoiceRuntimeSessionResponse> {
    return this.post<VoiceRuntimeSessionResponse>("/livekit-token", {
      voiceSessionId: input.voiceSessionId,
      chatSessionId: input.chatSessionId ?? null,
      assistantName: input.assistantName,
      runtimeContext: typeof input.runtimeContext === "string" ? input.runtimeContext.trim() || null : null,
      recentMessages: Array.isArray(input.recentMessages) ? input.recentMessages : undefined
    });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = RELAY_BASE_URL.replace(/\/$/, "");
    const secret = RELAY_SHARED_SECRET;
    if (!baseUrl || !secret) {
      throw new Error("Freedom relay is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-freedom-relay-secret": secret
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const detail =
        error instanceof Error && error.name === "AbortError"
          ? `timed out after ${Math.round(RELAY_TIMEOUT_MS / 1000)} seconds`
          : error instanceof Error
            ? error.message
            : "network error";
      throw new Error(`Freedom relay unreachable at ${baseUrl}. ${detail}`);
    } finally {
      clearTimeout(timeout);
    }
    const text = await response.text();
    let payload: Record<string, unknown> = {};
    if (text) {
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error("Relay returned a malformed response.");
      }
    }
    if (!response.ok) {
      throw new Error((payload.error as string | undefined) || `Relay error (${response.status})`);
    }
    return payload as T;
  }
}
