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

The premium path is implemented in code but it is not fully live on this machine yet
 because the required realtime credentials are still missing from this repo runtime:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`

Without those values, the new APK will fall back to the older device voice loop or
on-device offline ideation when the desktop is unreachable.

That is the main blocker now. It is no longer primarily a code blocker.

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

## Android Build And Release Flow

Any user-visible Android change must complete this full path:

```bash
bash scripts/governance-preflight.sh
npm run build:packages
npm run typecheck:workspace
npm test --workspace @freedom/mobile -- --runInBand
npm run release:android-live
```

Then verify:

- local artifact:
  [app-release.apk](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/android/app/build/outputs/apk/release/app-release.apk)
- install page:
  `http://pop-os.taildcb5c5.ts.net:43111/install`
- build-specific APK link shown on the install page

Current released build at handoff:

- `0.2.34`
- `versionCode 41`

## Suggested Test Sequence After Credentials Are Added

### Phase 1: Backend only

1. Start gateway and desktop from this repo.
2. Confirm `/voice/runtime/session` returns `200`.
3. Confirm the Python LiveKit agent is running against the same `LIVEKIT_*` and `OPENAI_API_KEY`.

### Phase 2: Phone install

1. Install the latest APK from the install surface.
2. Open the menu.
3. Confirm:
   - `App version = 0.2.34`
   - `Voice runtime = LiveKit + OpenAI Realtime`

If the UI shows the fallback lane after credentials are configured, inspect the mobile
 startup logs and the gateway response before changing code.

### Phase 3: Realtime smoke

Use one short test:

- “Freedom, say hello in one sentence.”

Expected:

- response starts noticeably faster than the old chained mobile path
- spoken response comes from the realtime lane, not device TTS fallback
- menu/runtime state remains on the premium lane

### Phase 4: Interrupt

Use:

- ask a short question
- while Freedom is speaking, say `wait`

Expected:

- interrupt should stop the reply
- the next user speech should be treated as a new turn, not a stale interrupt loop
- the phone should not keep reading stale local transcript audio beside the live reply

### Phase 5: Recovery

Test:

- lock/unlock
- app background/foreground
- temporary network drop

Expected:

- the app either reconnects clearly or degrades clearly
- it should not silently hang in fake processing
- if the desktop is unreachable but cached chats exist, the app should stay usable in
  `Offline / On-device` rather than forcing repair before ideation can continue

### Phase 6: Offline import safety

1. Stop the desktop host or disconnect the phone from the paired desktop.
2. Open a cached chat and create one or two offline turns.
3. Reconnect the desktop.
4. Review the offline import screen and import the notes.

Expected:

- the imported items arrive as `system` notes, not live user turns
- the import itself does not queue a desktop task
- the app offers one drafted `Continue with Freedom` turn, but does not auto-send it

## Known Remaining Risks

### 1. Credentials are still the gating item

This is the biggest remaining blocker.

### 2. Mobile still carries multiple voice/runtime branches

The realtime path is now primary-capable, while device fallback and offline on-device
ideation still exist in parallel. That is intentional for this release, but it means
more state branching than the end-state architecture should keep.

### 3. Desktop and mobile voice are still not one unified session controller

This slice moves mobile onto the same transport/runtime family, but it is not yet the
 full cleanup promised in the target architecture. There is still legacy speech queue
 logic around the fallback path.

## What Not To Do Next

- Do not clone another repo copy just to keep experimenting with LiveKit.
- Do not keep tuning the old device STT/TTS heuristics as the main strategy.
- Do not pair the phone against a different checkout than the one you are editing.
- Do not judge the new realtime path before the `LIVEKIT_*` and `OPENAI_API_KEY`
  credentials are actually loaded into this checkout.

## Best Next Step

The next highest-value step is:

1. add the missing realtime credentials
2. verify `POST /voice/runtime/session` returns `200`
3. reinstall the current APK
4. do a single controlled premium-lane voice test

If that works, then the next phase should be removing more of the legacy fallback-driven
 UI/state assumptions from mobile rather than adding more thresholds.
