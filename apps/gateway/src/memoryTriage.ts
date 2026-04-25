import type {
  ChatMessage,
  MobileConversationMemory,
  MobileLearningSignal,
} from "@freedom/shared";

const DEFAULT_MEMORY_TRIAGE_MODEL = (process.env.FREEDOM_MEMORY_TRIAGE_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() || "";

type MemoryTriageInput = {
  hostId: string;
  sessionId: string;
  sessionTitle: string;
  source: MemoryTriageSource;
  messages: ChatMessage[];
  existingContext?: string;
};

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "memory";
}

function buildSignalId(kind: MobileLearningSignal["kind"], topic: string): string {
  return `triage-learning-${kind}-${normalizeKey(topic).slice(0, 72)}`;
}

function buildMemoryId(category: MobileConversationMemory["category"], topic: string): string {
  return `triage-memory-${category}-${normalizeKey(topic).slice(0, 72)}`;
}

function buildFollowUpId(question: string): string {
  return `triage-followup-${normalizeKey(question).slice(0, 72)}`;
}

function buildConversationTranscript(messages: ChatMessage[]): string {
  return messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.status === "completed")
    .slice(-12)
    .map((message) => `${message.role === "user" ? "User" : "Freedom"}: ${truncateText(message.content, 500)}`)
    .join("\n");
}

function sanitizeLearningSignals(
  items: unknown,
  sessionId: string,
): MobileLearningSignal[] {
  const now = new Date().toISOString();
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const topic = truncateText(String((item as { topic?: unknown }).topic ?? ""), 200);
    const summary = truncateText(String((item as { summary?: unknown }).summary ?? ""), 1000);
    const kind = (item as { kind?: unknown }).kind;
    if (
      !topic ||
      !summary ||
      (kind !== "preference" && kind !== "focus" && kind !== "workflow" && kind !== "capability")
    ) {
      return [];
    }

    return [{
      id: buildSignalId(kind, topic),
      topic,
      summary,
      kind,
      status: "observed",
      createdAt: now,
      updatedAt: now,
      sourceSessionId: sessionId,
      capturedAt: now,
    } satisfies MobileLearningSignal];
  }).slice(0, 4);
}

function sanitizeConversationMemories(
  items: unknown,
  sessionId: string,
): MobileConversationMemory[] {
  const now = new Date().toISOString();
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const topic = truncateText(String((item as { topic?: unknown }).topic ?? ""), 200);
    const summary = truncateText(String((item as { summary?: unknown }).summary ?? ""), 1000);
    const category = (item as { category?: unknown }).category;
    const confidenceValue = Number((item as { confidence?: unknown }).confidence);
    const status = (item as { status?: unknown }).status;
    if (
      !topic ||
      !summary ||
      (category !== "identity" &&
        category !== "preference" &&
        category !== "project" &&
        category !== "relationship" &&
        category !== "context")
    ) {
      return [];
    }

    return [{
      id: buildMemoryId(category, topic),
      topic,
      summary,
      category,
      confidence: Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0.72,
      status: status === "confirmed" || status === "active" ? status : "observed",
      createdAt: now,
      updatedAt: now,
      sourceSessionId: sessionId,
      capturedAt: now,
    } satisfies MobileConversationMemory];
  }).slice(0, 4);
}

function sanitizeFollowUps(
  items: unknown,
  sessionId: string,
  source: MemoryTriageSource,
): MemoryFollowUpCandidate[] {
  const now = new Date().toISOString();
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const question = truncateText(String((item as { question?: unknown }).question ?? ""), 400);
    const rationale = truncateText(String((item as { rationale?: unknown }).rationale ?? ""), 600);
    if (!question || !rationale) {
      return [];
    }

    return [{
      id: buildFollowUpId(question),
      question,
      rationale,
      status: "pending",
      source,
      sourceSessionId: sessionId,
      createdAt: now,
      updatedAt: now,
    } satisfies MemoryFollowUpCandidate];
  }).slice(0, 2);
}

function buildFallbackResult(input: MemoryTriageInput): MemoryTriageResult {
  const transcript = buildConversationTranscript(input.messages);
  const lowerTranscript = transcript.toLowerCase();
  const now = new Date().toISOString();
  const learningSignals: MobileLearningSignal[] = [];
  const conversationMemories: MobileConversationMemory[] = [];

  if (/\b(i like|i love|i prefer|my favorite|i usually prefer)\b/i.test(transcript)) {
    learningSignals.push({
      id: buildSignalId("preference", "User preference"),
      topic: "User preference",
      summary: truncateText(transcript, 1000),
      kind: "preference",
      status: "observed",
      createdAt: now,
      updatedAt: now,
      sourceSessionId: input.sessionId,
      capturedAt: now,
    });
  }

  if (/\b(business partner|autonomous partner|co-founder|cofounder|long-term memory)\b/i.test(lowerTranscript)) {
    conversationMemories.push({
      id: buildMemoryId("relationship", "Partnership expectation"),
      topic: "Partnership expectation",
      summary: truncateText(transcript, 1000),
      category: "relationship",
      confidence: 0.78,
      status: "observed",
      createdAt: now,
      updatedAt: now,
      sourceSessionId: input.sessionId,
      capturedAt: now,
    });
  }

  return {
    configured: false,
    usedModel: null,
    summary: transcript ? truncateText(transcript, 280) : null,
    learningSignals,
    conversationMemories,
    followUpQuestions: [],
  };
}

export async function triageMemoryWithChatGPT(input: MemoryTriageInput): Promise<MemoryTriageResult> {
  if (!OPENAI_API_KEY) {
    return buildFallbackResult(input);
  }

  const transcript = buildConversationTranscript(input.messages);
  if (!transcript) {
    return {
      configured: true,
      usedModel: DEFAULT_MEMORY_TRIAGE_MODEL,
      summary: null,
      learningSignals: [],
      conversationMemories: [],
      followUpQuestions: [],
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MEMORY_TRIAGE_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Freedom's governed memory-triage layer. Review the interaction and decide what is worth durable learning. " +
            "Only record durable user facts, preferences, goals, relationship expectations, recurring workflow patterns, and capability gaps. " +
            "Do not treat Freedom's own claims as memory facts. Prefer user-stated intent over assistant phrasing. " +
            "Return strict JSON with shape: " +
            "{\"summary\":\"...\",\"learningSignals\":[{\"topic\":\"...\",\"summary\":\"...\",\"kind\":\"preference|focus|workflow|capability\"}]," +
            "\"conversationMemories\":[{\"topic\":\"...\",\"summary\":\"...\",\"category\":\"identity|preference|project|relationship|context\",\"confidence\":0.0,\"status\":\"observed|confirmed|active\"}]," +
            "\"followUpQuestions\":[{\"question\":\"...\",\"rationale\":\"...\"}]}. " +
            "Use followUpQuestions only when learning would materially improve future usefulness and the current evidence is incomplete. " +
            "Prefer zero items over weak guesses. Keep summaries concise.",
        },
        {
          role: "user",
          content: [
            `Host: ${input.hostId}`,
            `Session: ${input.sessionTitle || "Freedom"} (${input.sessionId})`,
            `Source: ${input.source}`,
            input.existingContext ? `Existing durable context:\n${truncateText(input.existingContext, 5000)}` : null,
            `Recent conversation:\n${transcript}`,
          ].filter(Boolean).join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    return buildFallbackResult(input);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const rawContent = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!rawContent) {
    return buildFallbackResult(input);
  }

  try {
    const parsed = JSON.parse(rawContent) as {
      summary?: unknown;
      learningSignals?: unknown;
      conversationMemories?: unknown;
      followUpQuestions?: unknown;
    };

    return {
      configured: true,
      usedModel: DEFAULT_MEMORY_TRIAGE_MODEL,
      summary: typeof parsed.summary === "string" ? truncateText(parsed.summary, 800) : null,
      learningSignals: sanitizeLearningSignals(parsed.learningSignals, input.sessionId),
      conversationMemories: sanitizeConversationMemories(parsed.conversationMemories, input.sessionId),
      followUpQuestions: sanitizeFollowUps(parsed.followUpQuestions, input.sessionId, input.source),
    };
  } catch {
    return buildFallbackResult(input);
  }
}
export type MemoryTriageSource = "desktop_session" | "voice_runtime" | "mobile_standalone" | "offline_import";

export type MemoryFollowUpCandidate = {
  id: string;
  question: string;
  rationale: string;
  status: "pending" | "answered" | "dismissed";
  source: MemoryTriageSource;
  sourceSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryTriageResult = {
  configured: boolean;
  usedModel: string | null;
  summary: string | null;
  learningSignals: MobileLearningSignal[];
  conversationMemories: MobileConversationMemory[];
  followUpQuestions: MemoryFollowUpCandidate[];
};
