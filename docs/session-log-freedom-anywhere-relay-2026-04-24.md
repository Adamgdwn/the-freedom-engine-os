# Freedom Anywhere — Relay & Stand-Alone Brain Session Log
**Date:** 2026-04-24  
**Scope:** Mobile state machine fix, Freedom relay deployment, stand-alone brain wiring, APK downloads

---

## The Problem We Started With

The Freedom Anywhere app was showing a "Reconnecting" screen with a "Backup voice only" chip and the message *"This slim build does not bundle the old on-device model."* This happened whenever the desktop was off.

**Why it was broken:**

1. **Infinite reconnect loop.** The app retried the desktop gateway forever (1→2→4→8→10s) and never declared itself stand-alone. There was no grace window.

2. **Architectural inversion.** The gateway on the desktop is the thing that would tell the phone "you're stand_alone" — but when the desktop is off, that message never arrives. The phone had no way to self-diagnose.

3. **No brain when disconnected.** `DISCONNECTED_ASSISTANT_MODE = "notes_only"` — the APK had no relay configured, so there was no stand-alone AI at all.

4. **No stand-alone voice.** The fallback path showed a "Backup voice only" chip and used device-side speech recognition instead of LiveKit. There was no relay to mint LiveKit tokens.

---

## What We Built

### Architectural posture

This work only stays valid if relay, desktop gateway, and mobile all behave like
one Freedom runtime with two transport paths, not like separate assistants with
different memory rules.

That means:

- the canonical voice-session contract must stay shared between desktop and relay
- session continuity should be attached to the selected chat thread, not to a
  particular room or process
- a new realtime voice session should bootstrap from the same recent thread
  history whether the phone reached Freedom through the desktop gateway or the
  stand-alone relay

### 1. Freedom Relay (`apps/relay/`)

A small always-on Node.js service that lives on a Tailscale node (your OnePlus phone running Termux). It is **support infrastructure**, not a second assistant — when the desktop is on, Freedom still prefers the desktop gateway.

**Endpoints:**

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Liveness check + which secrets are configured |
| `POST /chat` | Proxies chat to OpenAI (`gpt-4o-mini`); the stand-alone brain |
| `POST /livekit-token` | Mints a short-lived LiveKit JWT so the phone can start a premium voice session without the desktop |
| `POST /desktop-pulse` | Desktop calls this on startup; relay fans out an FCM push so the phone immediately exits slow-poll |

All non-health endpoints require an `x-freedom-relay-secret` header matching a shared secret known to both the relay and the mobile build.

**Why a relay instead of calling OpenAI directly from the phone?**  
API keys must stay server-side. A relay keeps them off the device and lets you rotate them without rebuilding the APK.

---

### 2. Mobile Reconnect Grace Window (`appStore.ts`)

**Before:** Retried forever with exponential backoff (max 10s). Never declared `stand_alone`.

**After:** Three-phase reconnect cadence:

```
Attempts 1–3  →  20 second gap each  (60s total grace window)
After attempt 3 fails  →  synthesise stand_alone locally, switch to 10-min slow poll
When desktop comes back  →  reconnectAttempts resets to 0, stand_alone cleared
```

The key insight: the phone must self-declare `stand_alone` after the grace window because the desktop (the only thing that would send that signal) is unreachable.

`shouldUseOfflineSafeMode()` now also returns `true` when `reconnectAttempts > 3`, so every code path that reads offline state gets the same answer.

---

### 3. Relay Companion Service (`apps/mobile/src/services/offline/relayCompanion.ts`)

A first-class service class (same pattern as the API client) that wraps all relay calls:

- `generateReply(messages)` — calls relay `/chat`, returns the AI reply string
- `summarizeDraftTurns(draftTurns)` — builds a summary prompt and calls `/chat`
- `createVoiceSession(input)` — calls relay `/livekit-token`, returns a `VoiceRuntimeSessionResponse` in the same shape as the gateway

The relay companion replaced the old `CloudCompanionService` in all offline paths. The old service called `/api/mobile-companion` on a web Freedom host with a different request/response shape — that code was never wired to the relay and became dead code. It was removed.

---

### 4. Stand-Alone Voice via Relay (`appStore.ts`)

**Before:** When offline, `getDisconnectedAssistantRuntimeMode()` returned `"device_fallback"` — the old local speech-recognition path. Voice sessions never used LiveKit when the desktop was off.

**After:**  
- `getDisconnectedAssistantRuntimeMode()` returns `"realtime_primary"` when relay is configured  
- `startRealtimeVoiceSession()` branches on `offlineMode && RELAY_BASE_URL`: calls `relayCompanion.createVoiceSession()` instead of the gateway  
- The `startVoice` action condition changed from `!offlineMode && prefersRealtimePrimary` to `prefersRealtimePrimary || (offlineMode && RELAY_BASE_URL)` — LiveKit is always tried first

**Current limitation:** The relay mints the LiveKit token (the phone's credential to join a room), but a Python voice agent also needs to join that room on the AI side. The desktop-host runs this agent (`agents/freedom_agent/agent.py`). When the desktop is off, the room is empty and the phone hears silence. **Stand-alone voice requires the Python agent to also run on the relay node** — that is the next piece.

### 4.1 Conversation continuity fix across desktop + relay

After the first relay pass, a new stand-alone voice session could still feel
amnesic even though the phone already held the correct chat thread locally.

**Why that happened:**

- the desktop gateway's `voice-runtime-bootstrap` returned `recentMessages`
- the Freedom voice agent already knew how to prepend those `recentMessages`
  into the runtime context for a new room
- the relay bootstrap only carried `runtimeContext`, not the actual recent
  thread turns

So the system had split behavior:

- desktop path: new voice room restored recent thread continuity
- relay path: new voice room started "clean" and only had generic runtime context

**The fix:**

- extend the shared voice-session request contract so mobile can send the last
  completed user/assistant turns from the selected chat thread
- persist those `recentMessages` inside the relay room bootstrap
- return them from the relay's `GET /voice-runtime-bootstrap`
- let the existing Freedom voice-agent bootstrap path consume them the same way
  it already does on the desktop route

This is intentionally **not** a relay-specific memory feature. It is one shared
continuity bootstrap contract used by both desktop and relay so Freedom Anywhere,
the desktop gateway, and the relay act like one system.

---

### 5. Build Pipeline Changes

**`scripts/write-mobile-runtime-config.mjs`:**  
Now reads `MOBILE_RELAY_BASE_URL` and `FREEDOM_RELAY_SHARED_SECRET` from `.env` and emits them into the generated `runtimeConfig.ts`. If a relay URL is present, `DISCONNECTED_ASSISTANT_MODE` is automatically set to `"cloud"` — no manual override needed.

**`apps/mobile/android/app/build.gradle`:**  
Bumped to `versionCode 82 / versionName "0.2.75"` for the new relay-enabled build.

---

### 6. APK Downloads (Desktop & Website)

**Before:** APK was only available via the desktop gateway install page (`/install`).

**After:** One APK on disk, served by two surfaces:

- **Desktop gateway** (`http://your-desktop:43111/install`) — already had this, unchanged
- **Website** (`/downloads` page + `GET /api/android/latest`) — new Next.js route streams the same file from `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

The `Downloads` nav entry was added to the sidebar.

---

## What Changed on the Phone (OnePlus in Termux)

### What you set up manually

1. **Installed Termux** from F-Droid (not Play Store — the Play Store version is outdated and lacks packages).

2. **Installed Node.js 24** via `pkg install nodejs-lts`.

3. **Installed Tailscale** and joined your tailnet. The phone's Tailscale IP is `100.101.116.15`.

4. **Installed Termux:Boot** so processes can auto-start when the phone reboots.

5. **Created `~/freedom-relay/`** by copying `apps/relay/src` and `apps/relay/package.json` from the workstation via SSH, then ran `npm install`.

6. **Created `~/.freedom-relay.env`** with these keys:
   ```
   FREEDOM_RELAY_PORT=43311
   FREEDOM_RELAY_SHARED_SECRET=...
   OPENAI_API_KEY=...
   LIVEKIT_URL=...
   LIVEKIT_API_KEY=...
   LIVEKIT_API_SECRET=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_SERVICE_ACCOUNT_JSON=...
   ```

7. **Created `~/.termux/boot/start-relay.sh`** for auto-start on reboot:
   ```sh
   #!/data/data/com.termux/files/usr/bin/sh
   cd /data/data/com.termux/files/home/freedom-relay
   env $(grep -v '^#' /data/data/com.termux/files/home/.freedom-relay.env | xargs) \
     node src/server.js >> relay.log 2>&1
   ```

### The critical lesson about Termux env files

Node.js (and most programs) do not automatically read a `.env` file unless the app calls `dotenv.config()`. The relay's `server.js` reads from `process.env`, which only contains what was in the shell environment when the process started.

**Wrong way to start the relay:**
```bash
node src/server.js   # process.env has no relay vars
```

**Right way:**
```bash
env $(grep -v '^#' ~/.freedom-relay.env | xargs) node src/server.js
```

The `env $(...)` wrapper injects the file's variables into the child process's environment before it starts. This is why `pkill` + naive restart didn't work for most of the session — the relay kept restarting without its secrets.

### Port confusion resolved

KDE Connect uses port `43211` on the phone. The relay was originally configured on `43211` and collided with it. We moved the relay to `43311`. These are permanently different:

| Port | Service | Machine |
|------|---------|---------|
| `43111` | Desktop gateway | Workstation |
| `43211` | KDE Connect | Phone |
| `43311` | Freedom relay | Phone |

### Smoke tests that confirmed the relay was working

```bash
# From workstation, with matching shared secret:

# 1. Health — all 7 secrets green
curl http://100.101.116.15:43311/health

# 2. Chat — OpenAI replied "relay_ok"
curl -X POST http://100.101.116.15:43311/chat \
  -H "x-freedom-relay-secret: ..." \
  -d '{"messages":[{"role":"user","content":"Reply with exactly: relay_ok"}]}'

# 3. LiveKit token — real JWT minted against your LiveKit project
curl -X POST http://100.101.116.15:43311/livekit-token \
  -H "x-freedom-relay-secret: ..." \
  -d '{"voiceSessionId":"voice-mobile-test-smoke-01","hostId":"standalone"}'
```

---

## What Is Left

| Item | Status |
|------|--------|
| Stand-alone voice (voice agent on relay node) | Not started — needs Python + LiveKit Agents on Termux |
| FCM push receiver in mobile app | Not started |
| Desktop pulse sender in gateway | Not started |
| Rotate exposed API keys (OpenAI, LiveKit) | Deferred by user |
| Firebase project + `google-services.json` for APK | Not started |

The next logical step is installing Python + `agents/freedom_agent/requirements.txt` on the phone so the voice agent runs alongside the relay and answers LiveKit rooms when the desktop is off.
