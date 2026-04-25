# Mobile Realtime Voice Handoff

Archived: 2026-04-25
Last active update before archive: 2026-04-21
Status: historical migration handoff, superseded by the normal runtime docs and runbooks.

Use [Current Capabilities](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/current-capabilities.md:1)
for live behavior,
[Known Deficiencies (2026-04-25)](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/known-deficiencies-2026-04-25.md:1)
for remaining gaps, and
[runbooks/operations.md](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/runbooks/operations.md:1)
for current operational checks.

The original content is preserved below for migration history.

# Mobile Realtime Voice Handoff

Last updated: 2026-04-21

## Purpose

This handoff is for the current mobile voice migration from the older chained phone-local
 STT/TTS loop to the same LiveKit + OpenAI Realtime voice runtime family already used on
 the web side.

Use this document before doing any more mobile voice work.

## What Shipped

The repo now contains a live mobile voice stack with both premium realtime and bounded
offline fallback behavior:

- the paired gateway can mint a mobile voice runtime session through
  `POST /voice/runtime/session`
- the mobile app can request that session and connect directly to LiveKit
- the mobile app now prefers realtime voice first and degrades to the older device
  STT/TTS path only when the premium path is unavailable
- the desktop host now autostarts and supervises the Python LiveKit/OpenAI worker when
  the required voice env is present
- when the paired desktop is unreachable but cached chats exist, the mobile app can stay
  usable in `Offline / On-device` mode for local ideation
- offline mobile work can be imported later through `POST /sessions/:id/offline-import`
  as non-executing `system` notes, followed by one explicit drafted continuation turn
- Android native bootstrap now initializes the LiveKit React Native SDK
- iOS bootstrap is also prepared for the same SDK
- the mobile menu shows the active voice runtime so testers can tell which lane they are on

## Critical Truth

The premium path is live in code and depends on the paired desktop actually owning a
healthy Python LiveKit/OpenAI worker at runtime.

The required repo-root `.env` values are still:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`

Without those values, the APK falls back to the older device voice loop or the
disconnected companion path when the desktop is unreachable.

With those values present, the most common failure is now desktop-side worker
ownership or startup health, not missing mobile code. Check:

- `DESKTOP_DATA_DIR/voice-worker/worker.log`
- `DESKTOP_DATA_DIR/voice-worker/worker.lock.json`

## Files To Know First

Read these first if you are continuing the work:

- [apps/mobile/src/store/appStore.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/store/appStore.ts:1)
- [apps/mobile/src/services/voice/realtimeVoiceService.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/voice/realtimeVoiceService.ts:1)
- [apps/gateway/src/store.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/gateway/src/store.ts:1)
- [apps/gateway/src/index.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/gateway/src/index.ts:1)
- [agents/freedom_agent/agent.py](/home/adamgoodwin/code/agents/the-freedom-engine-os/agents/freedom_agent/agent.py:1)
- [packages/shared/src/contracts/voiceRuntime.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/packages/shared/src/contracts/voiceRuntime.ts:1)
- [packages/shared/src/schemas/platform.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/packages/shared/src/schemas/platform.ts:1)
- [docs/specs/reference-voice-migration-plan.md](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/specs/reference-voice-migration-plan.md:1)

## Current Product Behavior

### Mobile

- Default runtime mode is now `realtime_primary`.
- If the gateway returns a valid LiveKit session, the phone should connect to the realtime room.
- If that setup fails, the app falls back to the older device STT/TTS loop.
- During an active realtime session, phone-local auto-read is now suppressed so the old
  "two different voices after interrupt" split no longer competes with the live reply.
- The menu shows:
  - app version
  - build code
  - voice runtime

### Gateway

- Mobile device tokens can now request a voice runtime session.
- Mobile device tokens can now import offline session notes through
  `POST /sessions/:id/offline-import`.
- The response includes:
  - LiveKit room token
  - websocket URL
  - room name
  - participant identity
  - shared voice binding metadata
- The gateway now also:
  - deduplicates near-identical voice user turns that arrive inside the short duplicate window
  - recovers orphaned queued/running tasks when the desktop host restarts and registers again

### Agent

- The Python LiveKit agent now publishes transcript data with `source` metadata so the
  mobile client can distinguish assistant transcript from user transcript cleanly.

### Desktop Host

- The desktop host should now launch the worker automatically with:

```bash
uv run --with-requirements requirements.txt agent.py dev
```

- Use `DESKTOP_VOICE_WORKER_AUTOSTART=false` to disable that behavior when debugging.
- Use `DESKTOP_VOICE_WORKER_COMMAND` if you need a different worker launch command.

## Required Environment Setup

Add these to the repo `.env` used by this checkout:

```bash
LIVEKIT_URL=wss://<your-livekit-project>.livekit.cloud
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
OPENAI_API_KEY=<your-openai-api-key>
```

Optional but useful:

```bash
FREEDOM_VOICE_RUNTIME_PROVIDER=openai-realtime
FREEDOM_VOICE_RUNTIME_MODEL=gpt-realtime-mini
```

## How To Confirm The Credentials Are Working

### 1. Start the gateway

```bash
npm run dev:gateway
```

### 2. Start the desktop host

In a second terminal:

```bash
npm run dev:desktop
```

Expected desktop-host log line:

```text
[voice-worker] starting uv run --with-requirements requirements.txt agent.py dev
```

The desktop host also now writes a durable worker log at:

```text
DESKTOP_DATA_DIR/voice-worker/worker.log
```

and the current worker ownership lock at:

```text
DESKTOP_DATA_DIR/voice-worker/worker.lock.json
```

### 3. Confirm the gateway health endpoint

```bash
curl http://127.0.0.1:43111/healthz
```

Expected:

```json
{"ok":true}
```

### 4. Confirm voice session minting works

Use a paired device token and call:

```bash
curl -X POST http://127.0.0.1:43111/voice/runtime/session \
  -H "authorization: Bearer <device-token>" \
  -H "content-type: application/json" \
  -d '{
    "voiceSessionId": "voice-mobile-smoke-12345678",
    "chatSessionId": "<session-id>",
    "assistantName": "Freedom"
  }'
```

Expected:

- `200`
- response includes:
  - `token`
  - `wsUrl`
  - `roomName`
  - `participantIdentity`
  - `binding.runtimeMode = "realtime_primary"`

If you get:

```json
{"error":"Realtime voice is not configured on this desktop yet."}
```

the env is still missing or not loaded.
