import OpenAI from "openai";
import { NextResponse } from "next/server";

type MobileCompanionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ReplyRequest = {
  kind: "reply";
  messages: MobileCompanionMessage[];
};

type SummaryRequest = {
  kind: "summary";
  draftTurns: string[];
};

const MOBILE_COMPANION_REPLY_PROMPT =
  "You are Freedom's internet-backed mobile companion when the desktop link is unavailable. " +
  "You can chat, brainstorm ideas, answer questions, and help the operator save notes for later sync. " +
  "Do not claim live desktop access, tool execution, or canonical sync. Keep replies concise and practical.";

const MOBILE_COMPANION_SUMMARY_PROMPT =
  "Summarize these disconnected mobile notes for later desktop review. Keep the summary factual, concise, and focused on next steps.";
const MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS = 20_000;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for the mobile web companion.");
  }
  return new OpenAI({ apiKey });
}

function getModel(): string {
  return process.env.MOBILE_DISCONNECTED_ASSISTANT_MODEL?.trim() || "gpt-4.1-mini";
}

function isReplyRequest(body: unknown): body is ReplyRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { kind?: unknown }).kind === "reply" &&
    Array.isArray((body as { messages?: unknown }).messages)
  );
}

function isSummaryRequest(body: unknown): body is SummaryRequest {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { kind?: unknown }).kind === "summary" &&
    Array.isArray((body as { draftTurns?: unknown }).draftTurns)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = getClient();
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS);

    if (isReplyRequest(body)) {
      const completion = await client.chat.completions.create(
        {
          model: getModel(),
          temperature: 0.55,
          messages: [
            { role: "system", content: MOBILE_COMPANION_REPLY_PROMPT },
            ...body.messages
              .filter((message) => message.content.trim())
              .map((message) => ({
                role: message.role,
                content: message.content.trim()
              }))
          ]
        },
        { signal: abortController.signal }
      );
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("The mobile web companion returned an empty reply.");
      }
      clearTimeout(timeout);
      return NextResponse.json({ text });
    }

    if (isSummaryRequest(body)) {
      const draftTurns = body.draftTurns.map((turn) => turn.trim()).filter(Boolean);
      if (!draftTurns.length) {
        return NextResponse.json({ error: "No draft turns were provided." }, { status: 400 });
      }

      const completion = await client.chat.completions.create(
        {
          model: getModel(),
          temperature: 0.35,
          messages: [
            { role: "system", content: MOBILE_COMPANION_SUMMARY_PROMPT },
            {
              role: "user",
              content: draftTurns.map((turn, index) => `${index + 1}. ${turn}`).join("\n")
            }
          ]
        },
        { signal: abortController.signal }
      );
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("The mobile web companion returned an empty summary.");
      }
      clearTimeout(timeout);
      return NextResponse.json({ text });
    }

    clearTimeout(timeout);
    return NextResponse.json({ error: "Unsupported mobile companion request." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Mobile companion request timed out after ${Math.round(MOBILE_COMPANION_UPSTREAM_TIMEOUT_MS / 1000)} seconds.`
        : error instanceof Error
          ? error.message
          : "Could not complete the mobile companion request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
