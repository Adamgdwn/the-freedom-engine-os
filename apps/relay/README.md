# @freedom/relay

Always-on relay that gives Freedom Anywhere a bounded stand-alone brain and a
LiveKit voice path when the desktop gateway is unreachable. This repo holds the
canonical source; the relay is deployed to a small always-on Tailscale node
(today: a phone running Termux; tomorrow: a Pi, NAS, or VPS).

The relay is support infrastructure for Freedom, not a second assistant
product. When the desktop is available, Freedom Anywhere should still prefer the
desktop-linked runtime. When the desktop is unavailable, the relay should keep
the phone useful for capture, planning, summaries, and bounded voice sessions
without pretending it has the full governed desktop execution surface.

## What the relay does

- `GET /health` — liveness + which secrets are wired up.
- `POST /chat` — bounded stand-alone chat / summary fallback for the phone while
  the desktop is unavailable. This path should stay behaviorally aligned with
  the main Freedom runtime and not evolve into a separate assistant identity.
- `POST /livekit-token` — mints a short-lived LiveKit room token so the phone
  can run premium voice without the desktop gateway.
- `POST /desktop-pulse` — desktop gateway posts here on startup; relay fans out
  an FCM push to paired phones so Freedom Anywhere drops out of its slow-poll
  window immediately.

All non-health endpoints require the `x-freedom-relay-secret` header matching
`FREEDOM_RELAY_SHARED_SECRET`.

## Environment

Set these on the box that runs the relay (e.g. `~/.freedom-relay.env`):

```
FREEDOM_RELAY_PORT=43311
FREEDOM_RELAY_SHARED_SECRET=<generate a long random string>

OPENAI_API_KEY=<same key as root .env>
FREEDOM_RELAY_OPENAI_MODEL=gpt-4o-mini

LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<same key as root .env>
LIVEKIT_API_SECRET=<same secret as root .env>

FIREBASE_PROJECT_ID=<firebase project id>
FIREBASE_SERVICE_ACCOUNT_JSON=/absolute/path/to/service-account.json
```

The shared secret must also be set on the desktop gateway (for `/desktop-pulse`)
and passed into the mobile build (for `/chat` and `/livekit-token`).

## Integration Notes

- The relay is intentionally a fallback surface. It should preserve the same
  `Freedom` identity and stand-alone boundaries described in the phone product
  spec.
- The relay is not the owner of a separate conversation memory model. Voice
  continuity should follow the selected chat thread, and the relay should honor
  the same bootstrap contract the desktop gateway uses for new realtime voice
  rooms.
- The current `/chat` route is a bounded OpenAI-backed fallback. If you later
  run the full Freedom voice agent on the relay host, prefer keeping `/chat`
  behavior aligned with that same runtime context instead of letting chat and
  voice drift into different personalities or authority models.
- The relay voice token response should continue matching the shared
  `VoiceRuntimeSessionResponse` contract used by the gateway so mobile does not
  need a second relay-specific runtime path.
- `POST /livekit-token` and `GET /voice-runtime-bootstrap` should be treated as
  one shared continuity lane with the desktop gateway: mobile supplies the
  selected thread id plus recent completed turns, and the voice agent receives
  the same shape of bootstrap context regardless of whether the room came from
  desktop or relay.

## Run locally

```
cd apps/relay
npm install
node src/server.js
```

Smoke test:

```
curl http://127.0.0.1:43311/health
```

## Deploy to the always-on phone (Termux)

From this repo, on your workstation:

```
scp -r apps/relay/src apps/relay/package.json \
  u0_aXXX@<tailscale-ip>:/data/data/com.termux/files/home/freedom-relay/
ssh u0_aXXX@<tailscale-ip> \
  'cd ~/freedom-relay && npm install --omit=dev && \
   kill $(pgrep -f "src/server.js") 2>/dev/null; sleep 1; \
   env $(grep -v "^#" ~/.freedom-relay.env | xargs) nohup node src/server.js > relay.log 2>&1 &'
```

The relay reads `~/.freedom-relay.env` at startup via the `env $(...)` wrapper — the
env file must be sourced explicitly because the process runs as `node`, not as a named
service. The same wrapper must be used for manual restarts in Termux.

Then hit `http://<tailscale-ip>:43311/health` from any Tailscale peer and confirm
`secretsConfigured` lights up for the keys you populated.

## Moving to a real always-on box later

The relay is pure Node with no native deps. Migration is:

1. Copy `apps/relay/` to the new box.
2. `npm install --omit=dev` inside it.
3. Drop the same env file at `~/.freedom-relay.env`.
4. Install as a systemd unit (Linux) or LaunchAgent (macOS). A sample unit:

   ```
   [Unit]
   Description=Freedom Relay
   After=network-online.target

   [Service]
   EnvironmentFile=%h/.freedom-relay.env
   ExecStart=/usr/bin/node /opt/freedom-relay/src/server.js
   Restart=on-failure
   RestartSec=5
   User=freedom

   [Install]
   WantedBy=multi-user.target
   ```

5. Point `MOBILE_RELAY_BASE_URL` at the new host and rebuild the mobile app.

No application code should need to change when you migrate hosts.
