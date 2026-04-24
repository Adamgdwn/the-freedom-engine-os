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
const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";
const livekitUrl = process.env.LIVEKIT_URL?.trim() || "";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || "";

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
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return sendJson(res, 400, { error: "messages[] is required." });
  }

  const completion = await openai.chat.completions.create({
    model: body.model?.trim() || openaiModel,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
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

  return sendJson(res, 200, {
    token: await accessToken.toJwt(),
    wsUrl: livekitUrl,
    roomName,
    participantIdentity,
    expiresAt,
    binding: {
      voiceSessionId,
      chatSessionId: typeof body?.chatSessionId === "string" ? body.chatSessionId : null,
      assistantName: typeof body?.assistantName === "string" ? body.assistantName : "Freedom",
      runtimeMode: "realtime_primary",
      transport: "livekit_webrtc",
      roomName,
      participantIdentity,
      degraded: false,
      source: "relay"
    }
  });
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
