import { RELAY_BASE_URL, RELAY_SHARED_SECRET } from "../../generated/runtimeConfig";
import type { CreateVoiceRuntimeSessionRequest, VoiceRuntimeSessionResponse } from "@freedom/shared";

export type RelayMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const RELAY_TIMEOUT_MS = 20_000;

export class RelayCompanionService {
  async generateReply(messages: RelayMessage[]): Promise<string> {
    const data = await this.post<{ reply: string }>("/chat", { messages });
    return data.reply;
  }

  async summarizeDraftTurns(draftTurns: string[]): Promise<string> {
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
    const data = await this.post<{ reply: string }>("/chat", { messages });
    return data.reply;
  }

  async createVoiceSession(input: CreateVoiceRuntimeSessionRequest): Promise<VoiceRuntimeSessionResponse> {
    return this.post<VoiceRuntimeSessionResponse>("/livekit-token", {
      voiceSessionId: input.voiceSessionId,
      chatSessionId: input.chatSessionId ?? null,
      assistantName: input.assistantName
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
