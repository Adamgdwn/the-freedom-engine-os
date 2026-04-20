# Mobile Realtime Voice Handoff

Last updated: 2026-04-17

## Purpose

This handoff is for the current mobile voice migration from the older chained phone-local
 STT/TTS loop to the same LiveKit + OpenAI Realtime voice runtime family already used on
 the web side.

Use this document before doing any more mobile voice work.

## What Shipped

The repo now contains a first end-to-end mobile realtime voice slice:

- the paired gateway can mint a mobile voice runtime session through
  `POST /voice/runtime/session`
- the mobile app can request that session and connect directly to LiveKit
- the mobile app now prefers realtime voice first and degrades to the older device
  STT/TTS path only when the premium path is unavailable
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

Without those values, the new APK will fall back to the older device voice loop.

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
- The menu shows:
  - app version
  - build code
  - voice runtime

### Gateway

- Mobile device tokens can now request a voice runtime session.
- The response includes:
  - LiveKit room token
  - websocket URL
  - room name
  - participant identity
  - shared voice binding metadata

### Agent

- The Python LiveKit agent now publishes transcript data with `source` metadata so the
  mobile client can distinguish assistant transcript from user transcript cleanly.

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

### Phase 5: Recovery

Test:

- lock/unlock
- app background/foreground
- temporary network drop

Expected:

- the app either reconnects clearly or degrades clearly
- it should not silently hang in fake processing

## Known Remaining Risks

### 1. Credentials are still the gating item

This is the biggest remaining blocker.

### 2. Mobile still carries both runtimes

The realtime path is now primary-capable, but the old device fallback still exists in the
 store and voice service code. That is intentional for now, but it means more state
 branching than the end-state architecture should keep.

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
