import http from "node:http";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";
import OpenAI from "openai";

const relayDir = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(relayDir, "../../../.env"),
  path.resolve(os.homedir(), ".freedom-relay.env")
]) {
  dotenv.config({ path: envPath, override: true });
}

const host = process.env.FREEDOM_RELAY_HOST || "0.0.0.0";
const port = Number(process.env.FREEDOM_RELAY_PORT || "43311");
const startedAt = new Date().toISOString();

const relaySharedSecret = process.env.FREEDOM_RELAY_SHARED_SECRET?.trim() || "";
const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
const openaiModel = process.env.FREEDOM_RELAY_OPENAI_MODEL?.trim() || "gpt-4o-mini";
const perplexityApiKey = process.env.PERPLEXITY_API_KEY?.trim() || "";
const webSearchModel = process.env.FREEDOM_WEB_SEARCH_MODEL?.trim() || "sonar";
const relayRealtimeModel = process.env.FREEDOM_RELAY_REALTIME_MODEL?.trim() || "gpt-realtime-mini";
const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";
const livekitUrl = process.env.LIVEKIT_URL?.trim() || "";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || "";
const relayVoiceBootstraps = new Map();

let firebaseMessaging = null;

const assistantVoicePresetIds = ["alloy", "ash", "ballad", "cedar", "coral", "echo", "marin", "sage", "shimmer", "verse"];
const legacyAssistantVoiceAliases = {
  nova: "marin"
};
const assistantVoiceCatalog = [
  {
    id: "alloy",
    accentHints: ["international", "general"],
    toneHints: ["clear", "direct", "neutral"],
    warmth: "medium",
    pace: "steady"
  },
  {
    id: "ash",
    accentHints: ["general", "international"],
    toneHints: ["grounded", "calm", "measured"],
    warmth: "medium",
    pace: "steady"
  },
  {
    id: "ballad",
    accentHints: ["general", "international"],
    toneHints: ["warm", "storytelling", "expressive"],
    warmth: "high",
    pace: "slower"
  },
  {
    id: "cedar",
    accentHints: ["general", "international"],
    toneHints: ["direct", "dry", "steady"],
    warmth: "low",
    pace: "steady"
  },
  {
    id: "coral",
    accentHints: ["general", "international"],
    toneHints: ["warm", "upbeat", "friendly"],
    warmth: "high",
    pace: "adaptive"
  },
  {
    id: "echo",
    accentHints: ["general", "international"],
    toneHints: ["plainspoken", "direct", "focused"],
    warmth: "low",
    pace: "brisk"
  },
  {
    id: "marin",
    accentHints: ["general", "international"],
    toneHints: ["warm", "capable", "assured"],
    warmth: "high",
    pace: "steady"
  },
  {
    id: "sage",
    accentHints: ["general", "international"],
    toneHints: ["calm", "measured", "thoughtful"],
    warmth: "medium",
    pace: "slower"
  },
  {
    id: "shimmer",
    accentHints: ["general", "international"],
    toneHints: ["bright", "energetic", "light"],
    warmth: "medium",
    pace: "brisk"
  },
  {
    id: "verse",
    accentHints: ["general", "international"],
    toneHints: ["expressive", "dramatic", "textured"],
    warmth: "medium",
    pace: "adaptive"
  }
];
const RELAY_TIMEOUT_MS = 20_000;
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

async function loadFirebaseMessaging() {
  if (firebaseMessaging || !firebaseProjectId || !firebaseServiceAccountPath) {
    return firebaseMessaging;
  }
  const admin = await import("firebase-admin");
  const serviceAccount = await import(firebaseServiceAccountPath, { assert: { type: "json" } }).then(
    (mod) => mod.default ?? mod
  );
  admin.default.initializeApp({
    credential: admin.default.credential.cert(serviceAccount),
    projectId: firebaseProjectId
  });
  firebaseMessaging = admin.default.messaging();
  return firebaseMessaging;
}

function normalizeAssistantVoicePresetId(value) {
  const normalized = value?.trim().toLowerCase() ?? "";
  const aliased = legacyAssistantVoiceAliases[normalized] ?? normalized;
  return assistantVoicePresetIds.includes(aliased) ? aliased : "marin";
}

function getAssistantVoiceCatalogEntry(voiceId) {
  const normalized = normalizeAssistantVoicePresetId(voiceId);
  return assistantVoiceCatalog.find((voice) => voice.id === normalized) ?? assistantVoiceCatalog[0];
}

function buildAssistantSpeechInstructions(profile) {
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
    warmth === "high"
      ? "Keep the delivery warm and textured."
      : warmth === "low"
        ? "Keep the delivery lean and dry."
        : "Keep the delivery balanced and calm.",
    pace === "slower"
      ? "Speak a little slower than average."
      : pace === "brisk"
        ? "Speak a little brisker than average."
        : pace === "adaptive"
          ? "Adapt the pace naturally to the sentence."
          : "Keep a steady speaking pace.",
    notes ? `Operator note: ${notes}.` : null
  ];

  return parts.filter((part) => Boolean(part && part.trim())).join(" ");
}

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const RELAY_STANDALONE_CHAT_PROMPT = [
  "You are Freedom supporting Freedom Anywhere while the desktop is unavailable.",
  "Freedom Anywhere is the phone doorway into Freedom, not a separate assistant product.",
  "In stand-alone mode, help with capture, planning, brainstorming, summaries, practical next steps, and live public web lookups when the relay provides them.",
  "You may use the stand-alone runtime context and recent conversation bootstrap as real memory context for this session.",
  "Do not claim live desktop access, live governed execution, or completed actions you cannot verify here.",
  "Freedom's full governed runtime can inspect approved code and repo control files when the desktop lane is active and permissions allow it, so describe that capability accurately without pretending it is live in this stand-alone lane.",
  "Do not claim live canonical database reads unless they were explicitly provided in the runtime context for this session.",
  "If a request needs deeper business execution, coding, or governed autonomy, frame the next best step and preserve intent for the main Freedom runtime.",
  "Keep replies concise, practical, and consistent with Freedom's calm operating posture."
].join(" ");
const RELAY_STANDALONE_SUMMARY_PROMPT =
  "Summarize this stand-alone Freedom Anywhere work for later desktop review. Keep it factual, concise, and focused on next steps.";
const RELAY_LEARNING_EXTRACT_PROMPT = [
  "Extract only durable learning signals for Freedom from this stand-alone mobile work.",
  "Return strict JSON with shape: {\"signals\":[{\"topic\":\"...\",\"summary\":\"...\",\"kind\":\"preference|focus|workflow|capability\"}]}",
  "Only include signals when the pattern is explicit, repeated, or clearly durable.",
  "Do not include transient tasks, one-off facts, or speculative self-programming.",
  "Prefer zero signals over weak signals.",
  "Return at most 2 signals."
].join(" ");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "freedom-relay",
        startedAt,
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        platform: `${os.platform()} ${os.arch()}`,
        secretsConfigured: {
          FREEDOM_RELAY_SHARED_SECRET: Boolean(relaySharedSecret),
          OPENAI_API_KEY: Boolean(openaiApiKey),
          LIVEKIT_API_KEY: Boolean(livekitApiKey),
          LIVEKIT_API_SECRET: Boolean(livekitApiSecret),
          LIVEKIT_URL: Boolean(livekitUrl),
          FIREBASE_PROJECT_ID: Boolean(firebaseProjectId),
          FIREBASE_SERVICE_ACCOUNT_JSON: Boolean(firebaseServiceAccountPath)
        }
      });
    }

    if (req.method === "GET" && url.pathname === "/") {
      return sendJson(res, 200, {
        ok: true,
        service: "freedom-relay",
        endpoints: ["/health", "POST /chat", "POST /livekit-token", "POST /desktop-pulse", "/api/mobile-companion/speech"]
      });
    }

    if (req.method === "GET" && url.pathname === "/voice-runtime-bootstrap") {
      return handleVoiceRuntimeBootstrap(req, res, url);
    }

    if (req.method === "GET" && url.pathname === "/api/mobile-companion/speech") {
      return handleMobileCompanionSpeech(req, res);
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      return handleChat(req, res);
    }

    if (req.method === "POST" && url.pathname === "/livekit-token") {
      return handleLivekitToken(req, res);
    }

    if (req.method === "POST" && url.pathname === "/desktop-pulse") {
      return handleDesktopPulse(req, res);
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Relay error." });
  }
});

async function handleChat(req, res) {
  if (!requireSharedSecret(req, res)) return;
  if (!openai) return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured on the relay." });

  const body = await readJson(req);
  const messages = normalizeMessages(body?.messages);
  if (!messages || messages.length === 0) {
    return sendJson(res, 400, { error: "messages[] is required." });
  }

  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "standalone_chat";
  const runtimeContext = typeof body?.runtimeContext === "string" ? body.runtimeContext.trim() : "";
  const latestUserPrompt = normalizeMessageContent(
    [...messages].reverse().find((message) => message.role === "user")?.content
  );
  const shouldUseWebLookup =
    purpose === "standalone_chat" &&
    Boolean(
      body?.enableWebLookup === true ||
      (latestUserPrompt && WEB_LOOKUP_PATTERNS.some((pattern) => pattern.test(latestUserPrompt)))
    );
  if (shouldUseWebLookup) {
    const reply = await requestPerplexityLookup(systemMessagesForWebLookup(purpose, runtimeContext, messages));
    return sendJson(res, 200, {
      reply,
      model: webSearchModel,
      usage: null,
      usedWebLookup: true
    });
  }
  const systemMessages = buildRelaySystemMessages(purpose, runtimeContext);

  const completion = await openai.chat.completions.create({
    model: body.model?.trim() || openaiModel,
    messages: [...systemMessages, ...messages].map((m) => ({ role: m.role, content: m.content })),
    temperature: typeof body.temperature === "number" ? body.temperature : 0.6
  });

  const reply = completion.choices?.[0]?.message?.content ?? "";
  return sendJson(res, 200, {
    reply,
    model: completion.model,
    usage: completion.usage ?? null,
    usedWebLookup: false
  });
}

async function handleMobileCompanionSpeech(req, res) {
  if (!requireSharedSecret(req, res)) return;
  if (!openaiApiKey) {
    return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured on the relay." });
  }

  const text = readSpeechTextHeader(req.headers);
  const voiceProfile = readSpeechVoiceProfileHeader(req.headers);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiApiKey}`,
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
    return sendJson(res, 502, { error: detail || `Freedom speech request failed (${response.status}).` });
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  res.statusCode = 200;
  res.setHeader("content-type", response.headers.get("content-type")?.trim() || "audio/mpeg");
  res.setHeader("cache-control", "no-store");
  res.end(audioBuffer);
}

async function handleLivekitToken(req, res) {
  if (!requireSharedSecret(req, res)) return;
  if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
    return sendJson(res, 503, { error: "LiveKit is not configured on the relay." });
  }

  const body = await readJson(req);
  const rawVoiceSessionId = typeof body?.voiceSessionId === "string" ? body.voiceSessionId.trim().toLowerCase() : "";
  const voiceSessionId = /^voice-mobile-[a-z0-9-]{8,}$/.test(rawVoiceSessionId)
    ? rawVoiceSessionId
    : `voice-mobile-${randomUUID()}`;
  const chatSessionId = typeof body?.chatSessionId === "string" ? body.chatSessionId.trim() : "";
  if (!chatSessionId) {
    return sendJson(res, 400, { error: "chatSessionId is required." });
  }
  const assistantName = typeof body?.assistantName === "string" && body.assistantName.trim()
    ? body.assistantName.trim()
    : "Freedom";
  const runtimeContext = typeof body?.runtimeContext === "string" ? body.runtimeContext.trim() : "";
  const recentMessages = normalizeRecentMessages(body?.recentMessages);
  const hostId = typeof body?.hostId === "string" && body.hostId.trim() ? body.hostId.trim() : "standalone";
  const roomName = `${hostId}-${voiceSessionId}`;
  const participantIdentity = `voice-mobile-${randomUUID()}`;
  const ttlSeconds = 120;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
    ttl: `${ttlSeconds}s`,
    identity: participantIdentity
  });
  accessToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true
  });

  relayVoiceBootstraps.set(roomName, {
    roomName,
    chatSessionId,
    runtimeContext,
    recentMessages,
    sessionTitle: assistantName,
    assistantName,
    createdAt: new Date().toISOString(),
    expiresAt
  });
  pruneExpiredVoiceBootstraps();

  return sendJson(res, 200, {
    token: await accessToken.toJwt(),
    wsUrl: livekitUrl,
    roomName,
    participantIdentity,
    expiresAt,
    binding: {
      voiceSessionId,
      chatSessionId,
      assistantName,
      model: relayRealtimeModel,
      runtimeMode: "realtime_primary",
      transport: "livekit_webrtc",
      roomName,
      participantIdentity,
      degraded: false
    }
  });
}

function handleVoiceRuntimeBootstrap(req, res, url) {
  if (!requireSharedSecret(req, res)) return;
  pruneExpiredVoiceBootstraps();
  const roomName = url.searchParams.get("roomName")?.trim();
  if (!roomName) {
    return sendJson(res, 400, { error: "roomName is required." });
  }
  const bootstrap = relayVoiceBootstraps.get(roomName);
  if (!bootstrap) {
    return sendJson(res, 404, { error: "Voice runtime bootstrap not found." });
  }
  return sendJson(res, 200, bootstrap);
}

function pruneExpiredVoiceBootstraps() {
  const now = Date.now();
  for (const [roomName, bootstrap] of relayVoiceBootstraps.entries()) {
    const expiresAt = Date.parse(bootstrap.expiresAt || "");
    if (Number.isFinite(expiresAt) && expiresAt < now - 5 * 60 * 1000) {
      relayVoiceBootstraps.delete(roomName);
    }
  }
}

async function handleDesktopPulse(req, res) {
  if (!requireSharedSecret(req, res)) return;

  const body = await readJson(req);
  const deviceTokens = Array.isArray(body?.deviceTokens) ? body.deviceTokens.filter((t) => typeof t === "string" && t) : [];
  const reason = typeof body?.reason === "string" ? body.reason : "desktop_back_online";

  const messaging = await loadFirebaseMessaging();
  if (!messaging || deviceTokens.length === 0) {
    return sendJson(res, 200, {
      ok: true,
      delivered: 0,
      skipped: deviceTokens.length,
      note: messaging ? "No device tokens supplied." : "Firebase not configured; pulse accepted but not delivered."
    });
  }

  const message = {
    data: { kind: "desktop_pulse", reason, at: new Date().toISOString() },
    tokens: deviceTokens
  };
  const result = await messaging.sendEachForMulticast(message);
  return sendJson(res, 200, {
    ok: true,
    delivered: result.successCount,
    skipped: result.failureCount
  });
}

function requireSharedSecret(req, res) {
  if (!relaySharedSecret) {
    sendJson(res, 503, { error: "Relay shared secret is not configured." });
    return false;
  }
  const presented = (req.headers["x-freedom-relay-secret"] || "").toString().trim();
  if (presented !== relaySharedSecret) {
    sendJson(res, 401, { error: "Invalid relay secret." });
    return false;
  }
  return true;
}

function buildRelaySystemMessages(purpose, runtimeContext) {
  const basePrompt =
    purpose === "offline_summary"
      ? RELAY_STANDALONE_SUMMARY_PROMPT
      : purpose === "learning_extract"
        ? RELAY_LEARNING_EXTRACT_PROMPT
        : RELAY_STANDALONE_CHAT_PROMPT;
  const contextBlock = runtimeContext
    ? `Stand-alone runtime context:\n${runtimeContext}`
    : null;

  return [
    { role: "system", content: basePrompt },
    ...(contextBlock ? [{ role: "system", content: contextBlock }] : [])
  ];
}

function systemMessagesForWebLookup(purpose, runtimeContext, messages) {
  return [
    ...buildRelaySystemMessages(purpose, runtimeContext),
    ...messages.slice(-8)
  ];
}

function normalizeMessageContent(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.flatMap((message) => {
    if (!message || typeof message !== "object") {
      return [];
    }

    const role = typeof message.role === "string" ? message.role.trim() : "";
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (!content || (role !== "system" && role !== "user" && role !== "assistant")) {
      return [];
    }

    return [{ role, content }];
  });
}

function normalizeRecentMessages(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((message) => {
    if (!message || typeof message !== "object") {
      return [];
    }

    const id = typeof message.id === "string" ? message.id.trim() : "";
    const role = message.role === "user" || message.role === "assistant" ? message.role : "";
    const content = typeof message.content === "string" ? message.content.trim() : "";
    const createdAt = typeof message.createdAt === "string" ? message.createdAt.trim() : "";
    if (!id || !role || !content || !createdAt) {
      return [];
    }

    return [{ id, role, content, createdAt }];
  }).slice(-10);
}

function readSpeechTextHeader(rawHeaders) {
  const value = rawHeaders["x-freedom-speech-input"];
  const encoded = Array.isArray(value) ? value[0]?.trim() ?? "" : value?.trim() ?? "";
  if (!encoded) {
    throw new Error("Freedom speech input header is required.");
  }

  try {
    return decodeURIComponent(encoded).trim();
  } catch {
    throw new Error("Freedom speech input header is malformed.");
  }
}

function readSpeechVoiceProfileHeader(rawHeaders) {
  const value = rawHeaders["x-freedom-speech-profile"];
  const encoded = Array.isArray(value) ? value[0]?.trim() ?? "" : value?.trim() ?? "";
  if (!encoded) {
    return normalizeSpeechVoiceProfile({ targetVoice: "marin" });
  }

  try {
    return normalizeSpeechVoiceProfile(JSON.parse(decodeURIComponent(encoded)));
  } catch {
    return normalizeSpeechVoiceProfile({ targetVoice: "marin" });
  }
}

function normalizeSpeechVoiceProfile(profile) {
  return {
    targetVoice: normalizeAssistantVoicePresetId(profile?.targetVoice ?? "marin"),
    accent: profile?.accent?.trim() || null,
    tone: profile?.tone?.trim() || null,
    warmth: profile?.warmth?.trim() || null,
    pace: profile?.pace?.trim() || null,
    notes: profile?.notes?.trim() || null
  };
}

async function requestPerplexityLookup(messages) {
  if (!perplexityApiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured on the relay.");
  }

  const payload = await requestJson("https://api.perplexity.ai/v1/sonar", {
    method: "POST",
    headers: {
      authorization: `Bearer ${perplexityApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: webSearchModel,
      messages: [
        {
          role: "system",
          content:
            "You are Freedom's stand-alone web lookup tool. Answer concisely, include dates when they matter, and ground the answer in current web results."
        }
      ].concat(messages),
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
    throw new Error("The stand-alone web lookup returned an empty reply.");
  }

  const citations = Array.isArray(payload?.citations)
    ? payload.citations.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
  const topCitations = citations.slice(0, 3).map((url) => `- ${url}`).join("\n");
  return topCitations ? `${text}\n\nSources:\n${topCitations}` : text;
}

async function requestJson(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);

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
      throw new Error(`Relay request timed out after ${Math.round(RELAY_TIMEOUT_MS / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

server.listen(port, host, () => {
  process.stdout.write(`freedom-relay listening on http://${host}:${port}\n`);
});
