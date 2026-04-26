# Freedom Anywhere Via Freedom Desktop

Document status: live reference

## Decision

Freedom Engine should present a single `Freedom` identity on desktop and phone while
using the integrated desktop-host, gateway, and mobile runtime in this monorepo for
pairing, transport, and session delivery instead of depending on a second checkout.

The current repo now handles:

- phone pairing
- Codex login dependency on the desktop
- approved-root workspace constraints
- realtime message streaming between phone and desktop
- premium mobile voice handoff through LiveKit plus OpenAI Realtime when the paired
  desktop has the required runtime credentials

## Existing Phone Surface

- Repo:
  `/home/adamgoodwin/code/agents/the-freedom-engine-os`
- Current supported desktop GUI:
  Freedom Desktop shell launched from this repo, with a browser fallback at
  `http://127.0.0.1:43111/`
- Current phone app:
  Freedom Anywhere Android app built from this monorepo at `apps/mobile`

## Current Operator Loop

The current Freedom Anywhere behavior is now closer to a real Freedom operator
surface than a one-shot relay:

- continuous voice loop instead of one-tap transcript capture
- explicit barge-in interruption with immediate TTS stop and visible acknowledgment
- recognition paused during assistant playback, then resumed automatically after spoken replies
- auto-send voice turns with review only for genuinely risky or unusually long
  transcripts
- primary Freedom voice choices now surfaced as the real realtime presets such as
  Marin, with device spoken-reply fallback voices kept secondary in Homebase
- task-aware routing so Freedom can answer side questions or start a safe parallel
  subtask instead of defaulting to a single blocking "busy" response
- Freedom-owned chat/build surfaces so the phone stays pointed at Freedom even
  though the integrated runtime still carries the transport
- compact top bar plus menu sheet so navigation and session controls stay available
  without taking over the whole screen
- sparse `Start` launch surface, dedicated `Talk` voice canvas, and a hidden utility
  sheet so the phone behaves more like a focused voice surface than a dashboard
- premium realtime voice sessions now rehydrate from the recent thread and write their
  final transcripts back into the shared session history, so ending and restarting Talk
  no longer wipes the current conversational context
- the phone can now keep working offline before pairing or after the desktop link
  drops: local voice capture stays available, saved notes persist on-device, and cached
  phone-only threads survive later desktop refreshes instead of being overwritten
- pull-to-refresh on the offline-safe phone surface now stays local-safe: it rehydrates the
  saved on-device threads instead of throwing the operator back into a desktop-only pairing
  error path
- the `Talk` canvas now labels the second status chip by the active posture: desktop-linked
  sessions show the connected voice lane such as `Premium voice ready`, while only true
  offline-safe sessions show fallback labels such as `Saved for later`
- transient realtime reconnects no longer immediately throw a paired phone into a false
  offline-safe posture; the mobile surface now waits to confirm the desktop is
  actually unreachable before presenting the offline-safe state
- Freedom-hosted speech now wins over any previously saved legacy Android TTS choice, and
  stale phone-native voice selections are migrated away on boot so the old robotic voice
  does not silently hijack normal spoken replies
- the slim release no longer treats `MOBILE_DEFAULT_BASE_URL` as a fake offline cloud
  support path; hosted offline lookup now activates only when
  `MOBILE_DISCONNECTED_ASSISTANT_BASE_URL` is explicitly configured, while optional builds
  can still bundle the heavy on-device model and the default fallback remains notes-only
- offline mobile work is now review-first and safe by design:
  importing it writes non-executing `system` notes into canonical history and drafts one
  explicit `Continue with Freedom` follow-up instead of auto-replaying offline turns into
  live desktop execution
- the header controls are now split cleanly:
  the three-line pull-down is the actions/capabilities lane, while the three dots are
  the settings lane for voice choices, reply behavior, and system adjustments
- that settings sheet now holds the compact connection mark as well:
  `desktop_linked` and `reconnecting` both read as connected to Freedom, while only
  true `stand_alone` reads as disconnected
- the `Talk` header now uses that same layout without the old back-control remnant, so
  both primary voice surfaces read consistently
- compact footer actions on the `Talk` canvas with `Mute`, `Text`, live voice controls,
  a raised typed-turn composer, and one lower `Recent thread` card for opening and
  collapsing transcript history without overloading the center Freedom dialogue; the
  transcript itself now scrolls inside a bounded panel so the collapse control stays reachable
- the typed composer on `Talk` now feeds the same live Freedom conversation instead of
  a separate side-channel: if the talk loop is already active, the arrow injects that
  typed turn into the current voice session; if not, the arrow starts the talk loop and
  routes the typed turn into it automatically
- the governed `From Conversations To Build` queue now lives in the pull-down utility
  sheet instead of the main start surface, so Freedom can surface it intentionally when
  a conversation should graduate into real build work
- connected Homebase now exposes the live `A3` operator ledger itself:
  the phone can see approval posture, review gaps, next checkpoints, and recent
  governed runs without pretending to be a second execution engine
- connected Homebase can now open a structured consequence-review editor, and reviewed
  runs can then expose governed `Continue Run` controls that push the same run id into
  the desktop lane instead of spawning parallel work
- stand-alone phone review/import now supports deferred operator-run drafts in addition
  to offline notes and conservative learning candidates; importing those drafts creates
  canonical `awaiting-approval` operator runs later rather than replaying them directly
- typed phone capture is beginning to behave like a real training loop rather than a
  dumb transcript box: when the operator enters clear contact-style information,
  Freedom Anywhere can reason about the content, decide it likely belongs in the
  contact system, save it conservatively through the gateway, and keep the live
  conversation intact

## What To Configure

In this repo's `.env`, set `DESKTOP_APPROVED_ROOTS` as a comma-separated list of
absolute roots. Include Freedom Engine's repo root:

`/home/adamgoodwin/code/agents/the-freedom-engine-os`

Example:

`DESKTOP_APPROVED_ROOTS=/home/adamgoodwin/code/agents/the-freedom-engine-os`

Current local check:

- the integrated Freedom desktop-host and gateway can run from this repo
- Freedom Engine is present in this repo's `DESKTOP_APPROVED_ROOTS`

That means the next clean step is real-device acceptance, not repo-to-repo migration.

For premium mobile voice, repo-root `.env` must also contain:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`

Keep `.env.example` as placeholders only. The live runtime does not read secrets from the
template file.

The desktop host now autostarts the Python LiveKit/OpenAI worker when those runtime
credentials are present. The default command is:

`uv run --with-requirements requirements.txt agent.py dev`

Optional control knobs:

- `DESKTOP_VOICE_WORKER_AUTOSTART=false` disables automatic worker launch
- `DESKTOP_VOICE_WORKER_COMMAND=<custom command>` overrides the default worker command
- `DESKTOP_DATA_DIR/voice-worker/worker.log` keeps the durable worker log
- `DESKTOP_DATA_DIR/voice-worker/worker.lock.json` shows which desktop-host instance
  currently owns the managed worker

## Launch Path

1. In this repo, run `npm run launch`.
2. Confirm Codex is logged in on the desktop machine.
3. Confirm Tailscale or another private network path is available from the phone.
4. Pair the phone from the dashboard.
5. Open the Freedom desktop shell and create or restore the primary Freedom session.
6. Install the latest Freedom Android APK from this repo or the dashboard.
7. Chat with the local Freedom Engine workspace from Freedom Anywhere.
8. For premium voice, prefer the `Talk` canvas. The current realtime lane defaults to
   `gpt-realtime-mini` and normalizes legacy unsupported voice ids such as `nova` back
   to a supported voice like `marin`.
9. Ask Freedom directly to change the live voice profile if you want a different voice,
   gender presentation, accent hint, tone, pace, or warmth. Restart the voice session
   to hear a new realtime preset; the phone's local spoken-reply fallback picker stays
   separate in Homebase.
10. Use the small `Text` button when you want to type into the current Freedom
    conversation. Press the arrow to send that typed turn through the live talk loop;
    if `Talk` is not already running, the arrow now starts it first. Use the `Build`
    view's `Launch build chat` flow when you want a separate project thread rather than
    more continuity in the default voice thread.
11. When you want Freedom Anywhere to learn from typed information, prefer explicit
    structured entries at first. Clear name-plus-email notes are the current strongest
    path; broader "read this and figure out what to do with it" training is the next
    expansion of the same loop.

## APK Download

When the desktop host is running, the gateway serves the current release artifact at:

`http://pop-os.taildcb5c5.ts.net:43111/downloads/android/latest.apk`

The companion install page remains:

`http://pop-os.taildcb5c5.ts.net:43111/install`

When the install page is opened from a reachable LAN URL instead of the Tailscale
hostname, it now prefers the URL you actually opened for the pairing instructions,
QR target, and APK link. The Tailscale URL remains the recovery path when local
network routing is unavailable.

## APK Release Hygiene

- Every distributed Android build must use a unique `versionCode`.
- Bump `versionName` whenever you want the human-visible release label to change.
- Use `npm run release:android-live` for the normal slim release path. It builds the
  Android APK, publishes it to the currently live website-backed release directory,
  and verifies the served `latest.apk` matches the local artifact.
- Use `npm run release:android-live-offline` only when you intentionally want the
  separate heavy build that bundles the on-device model.
- If the APK is already built and only the live website needs to be refreshed, run
  `npm run publish:android-release`.
- The live install page should expose a build-specific APK identifier and filename so you
  can tell at a glance which build a phone is about to install, even if `latest.apk`
  remains as a compatibility alias.
- Before sharing a new install link, verify the served APK matches the local release
  artifact by size or checksum. The publish script performs that verification automatically.
- If a phone appears to "start where it left off" after reinstalling, check for
  preserved app storage or a restored paired device token before assuming the APK is stale.
- If the phone says it is offline while both devices are on the same Wi-Fi, verify the
  app is paired against the same LAN or Tailscale URL that the install page showed when
  you opened it. The URL the phone stores matters more than the fact that both devices
  are on the same network.
- If premium voice connects but stalls without hearing your speech, verify the paired
  desktop worker is reading secrets from repo-root `.env`, confirm the desktop-host logs
  show `[voice-worker] starting ...`, and reinstall the latest APK so the latest Android
  speech/runtime fixes are present on the phone.
- If `Talk` connects but stays on `Listening`, treat that as a missing or stalled desktop
  voice worker first. The phone can connect to the LiveKit room successfully even when
  nobody is there yet to answer.
- If an interrupt ever sounds like two different Freedom voices answering at once, verify
  the phone is on Android `0.2.68 (75)` or later. That build stops the phone-local
  spoken-reply path from competing with live realtime playback.

## What This Means

This gives you phone access to Freedom in two postures:

- desktop-linked, where premium realtime voice and shared canonical history stay aligned
  with the workstation runtime, including the governed operator-run ledger
- stand-alone on the phone, where voice capture and saved notes stay available even
  without any desktop link, hosted lookup or hosted spoken replies come online only
  when an explicit offline support host is configured, and deferred operator work stays
  explicitly local until a later import into the desktop-backed governed lane

Independent hosted lookup now uses the dedicated offline support endpoint only when
`MOBILE_DISCONNECTED_ASSISTANT_BASE_URL` is explicitly configured. Without that explicit
host, the phone falls back to notes-only capture instead of silently depending
on the desktop URL.

## Next Improvements

- keep Freedom as the visible product identity while the integrated runtime remains the transport layer
- connect the modeled parallel-skill and self-evolving-function registry to the
  live runtime so Freedom can branch governed work in practice
- add clearer builder-first actions from the desktop shell into Freedom-governed
  build requests
- continue real-device Android validation for the current offline companion and realtime
  interrupt/recovery pass, especially under conference-grade network and noise conditions
