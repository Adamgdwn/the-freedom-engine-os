import { loadFreedomRuntimeContext } from "@/lib/freedom-runtime-context";

export type MobileCompanionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type MobileCompanionReplyRequest = {
  kind: "reply";
  messages: MobileCompanionMessage[];
  enableWebLookup?: boolean;
};

export type MobileCompanionSummaryRequest = {
  kind: "summary";
  draftTurns: string[];
};

const MOBILE_COMPANION_REPLY_PROMPT =
  "You are Freedom supporting Freedom Anywhere while the desktop link is unavailable. " +
  "Help with voice follow-up, saved work, summaries, drafting, and practical answers. " +
  "In this lane, do not claim live desktop access, immediate tool execution, or canonical sync unless it was explicitly provided in the current context. " +
  "Freedom's full governed runtime can inspect approved code and repo control files when the desktop lane is active and permissions allow it, so describe that capability accurately without pretending it is live right now. " +
  "Keep replies concise and practical.";

const MOBILE_COMPANION_SUMMARY_PROMPT =
  "Summarize this Freedom Anywhere offline work for later desktop review. Keep the summary factual, concise, and focused on next steps.";

const MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS = 20_000;

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

export function isReplyRequest(body: unknown): body is MobileCompanionReplyRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { kind?: unknown }).kind === "reply" &&
    Array.isArray((body as { messages?: unknown }).messages)
  );
}

export function isSummaryRequest(body: unknown): body is MobileCompanionSummaryRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { kind?: unknown }).kind === "summary" &&
    Array.isArray((body as { draftTurns?: unknown }).draftTurns)
  );
}

export async function requestMobileCompanionReply(input: MobileCompanionReplyRequest): Promise<{ text: string; usedWebLookup: boolean }> {
  const messages = normalizeMessages(input.messages);
  if (!messages.length) {
    throw new Error("No offline support messages were provided.");
  }

  const latestUserPrompt = [...messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
  const shouldUseWebLookup = Boolean(input.enableWebLookup || (latestUserPrompt && WEB_LOOKUP_PATTERNS.some((pattern) => pattern.test(latestUserPrompt))));

  if (shouldUseWebLookup) {
    return {
      text: await requestPerplexityLookup(latestUserPrompt),
      usedWebLookup: true
    };
  }

  const runtimeContext = await loadFreedomRuntimeContext({ messages });
  const runtimeContextMessage = runtimeContext
    ? [{ role: "system" as const, content: `Runtime context:\n${runtimeContext}` }]
    : [];

  return {
    text: await requestOpenAIChat(
      [
        { role: "system", content: MOBILE_COMPANION_REPLY_PROMPT },
        ...runtimeContextMessage,
        ...messages
      ],
      0.55
    ),
    usedWebLookup: false
  };
}

export async function requestMobileCompanionSummary(input: MobileCompanionSummaryRequest): Promise<{ text: string }> {
  const draftTurns = input.draftTurns.map((turn) => turn.trim()).filter(Boolean);
  if (!draftTurns.length) {
    throw new Error("No draft turns were provided.");
  }

  const runtimeContext = await loadFreedomRuntimeContext({
    messages: draftTurns.map((turn) => ({ role: "user" as const, content: turn })),
    messageLimit: 4,
  });
  const runtimeContextMessage = runtimeContext
    ? [{ role: "system" as const, content: `Runtime context:\n${runtimeContext}` }]
    : [];

  return {
    text: await requestOpenAIChat(
      [
        { role: "system", content: MOBILE_COMPANION_SUMMARY_PROMPT },
        ...runtimeContextMessage,
        {
          role: "user",
          content: draftTurns.map((turn, index) => `${index + 1}. ${turn}`).join("\n")
        }
      ],
      0.35
    )
  };
}

function normalizeMessages(messages: MobileCompanionMessage[]): MobileCompanionMessage[] {
  return messages.flatMap((message) => {
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (!content) {
      return [];
    }
    if (message.role === "system" || message.role === "user" || message.role === "assistant") {
      return [{ role: message.role, content }];
    }
    return [];
  });
}

async function requestOpenAIChat(messages: MobileCompanionMessage[], temperature: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for the offline support path.");
  }

  const payload = await requestJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.MOBILE_DISCONNECTED_ASSISTANT_MODEL?.trim() || "gpt-4.1-mini",
      temperature,
      messages
    })
  });

  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("The offline support path returned an empty reply.");
  }
  return text;
}

async function requestPerplexityLookup(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured for independent mobile web lookup.");
  }

  const payload = await requestJson("https://api.perplexity.ai/v1/sonar", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.FREEDOM_WEB_SEARCH_MODEL?.trim() || "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are Freedom's mobile web lookup tool. Answer concisely, include dates when they matter, and ground the answer in current web results."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.2,
      web_search_options: {
        search_mode: "web",
        disable_search: false,
        return_related_questions: false
      }
    })
  });

  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("The mobile web lookup returned an empty reply.");
  }

  const citations = Array.isArray(payload?.citations)
    ? (payload.citations as unknown[]).filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const topCitations = citations.slice(0, 3).map((url) => `- ${url}`).join("\n");
  return topCitations ? `${text}\n\nSources:\n${topCitations}` : text;
}

async function requestJson(url: string, init: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message || payload?.error || `Request failed (${response.status}).`;
      throw new Error(String(detail));
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Mobile companion request timed out after ${Math.round(MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
