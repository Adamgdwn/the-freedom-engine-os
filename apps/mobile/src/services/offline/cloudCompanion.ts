export type CloudCompanionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const WEB_COMPANION_TIMEOUT_MS = 20_000;

export class CloudCompanionService {
  async generateReply(baseUrl: string, messages: CloudCompanionMessage[]): Promise<string> {
    const payload = await this.request(baseUrl, {
      kind: "reply",
      messages
    });
    return payload.text;
  }

  async summarizeDraftTurns(baseUrl: string, draftTurns: string[]): Promise<string> {
    const payload = await this.request(baseUrl, {
      kind: "summary",
      draftTurns
    });
    return payload.text;
  }

  private async request(
    baseUrl: string,
    body: { kind: "reply"; messages: CloudCompanionMessage[] } | { kind: "summary"; draftTurns: string[] }
  ): Promise<{ text: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEB_COMPANION_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/mobile-companion`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const detail =
        error instanceof Error && error.name === "AbortError"
          ? `request timed out after ${Math.round(WEB_COMPANION_TIMEOUT_MS / 1000)} seconds`
          : error instanceof Error
            ? error.message
            : "network request failed";
      throw new Error(`Could not reach hosted support at ${baseUrl}. ${detail}`);
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    let payload: { error?: string; text?: string } = {};
    if (text) {
      try {
        payload = JSON.parse(text) as { error?: string; text?: string };
      } catch {
        throw new Error("Hosted support returned a malformed response.");
      }
    }
    if (!response.ok) {
      throw new Error(payload.error || `Hosted support error (${response.status})`);
    }
    if (!payload.text) {
      throw new Error("Hosted support returned an empty reply.");
    }
    return { text: payload.text };
  }
}
