import http from "node:http";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import OpenAI from "openai";

const host = process.env.FREEDOM_RELAY_HOST || "0.0.0.0";
const port = Number(process.env.FREEDOM_RELAY_PORT || "43211");
const startedAt = new Date().toISOString();

const relaySharedSecret = process.env.FREEDOM_RELAY_SHARED_SECRET?.trim() || "";
const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
const openaiModel = process.env.FREEDOM_RELAY_OPENAI_MODEL?.trim() || "gpt-4o-mini";
const relayRealtimeModel = process.env.FREEDOM_RELAY_REALTIME_MODEL?.trim() || "gpt-realtime-mini";
const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";
const livekitUrl = process.env.LIVEKIT_URL?.trim() || "";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || "";
const relayVoiceBootstraps = new Map();

let firebaseMessaging = null;

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

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const RELAY_STANDALONE_CHAT_PROMPT = [
  "You are Freedom supporting Freedom Anywhere while the desktop is unavailable.",
  "Freedom Anywhere is the phone doorway into Freedom, not a separate assistant product.",
  "In stand-alone mode, help with capture, planning, brainstorming, summaries, and practical next steps until the desktop returns.",
  "Do not claim live desktop access, governed execution, canonical sync, durable memory reads, or completed actions you cannot verify here.",
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
        endpoints: ["/health", "POST /chat", "POST /livekit-token", "POST /desktop-pulse"]
      });
    }

    if (req.method === "GET" && url.pathname === "/voice-runtime-bootstrap") {
      return handleVoiceRuntimeBootstrap(req, res, url);
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
    usage: completion.usage ?? null
  });
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
