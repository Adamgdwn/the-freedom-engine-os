import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Voice not configured on server.' }, { status: 503 });
  }

  const identity = `user-${Date.now()}`;
  const at = new AccessToken(apiKey, apiSecret, { ttl: '1h', identity });

  // VideoGrant requires `room` to be set when roomJoin is true
  at.addGrant({
    roomJoin:     true,
    room:         'freedom-voice',
    canPublish:   true,
    canSubscribe: true,
  });

  return NextResponse.json({
    token:    await at.toJwt(),
    wsUrl,
    roomName: 'freedom-voice',
  });
}
