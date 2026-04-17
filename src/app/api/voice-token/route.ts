import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type VoiceTokenRequest = {
  sessionId?: string;
};

function isValidVoiceSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^voice-web-[a-z0-9-]{8,}$/.test(value);
}

export async function POST(request: Request) {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Voice not configured on server.' }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const sameOrigin =
    (origin ? origin === requestUrl.origin : true) &&
    (referer ? referer.startsWith(requestUrl.origin) : true);

  if (!sameOrigin) {
    return NextResponse.json({ error: 'Cross-origin voice token requests are not allowed.' }, { status: 403 });
  }

  let payload: VoiceTokenRequest = {};
  try {
    payload = (await request.json()) as VoiceTokenRequest;
  } catch {
    return NextResponse.json({ error: 'Voice session id is required.' }, { status: 400 });
  }

  if (!isValidVoiceSessionId(payload.sessionId)) {
    return NextResponse.json({ error: 'Invalid voice session id.' }, { status: 400 });
  }

  const roomName = payload.sessionId;
  const identity = `voice-web-${crypto.randomUUID()}`;
  const at = new AccessToken(apiKey, apiSecret, { ttl: '2m', identity });

  at.addGrant({
    roomJoin:     true,
    room:         roomName,
    canPublish:   true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token:    await at.toJwt(),
    wsUrl,
    roomName,
  });
}
