# Mobile Access Via Freedom Desktop

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

## Existing Companion

- Repo:
  `/home/adamgoodwin/code/agents/the-freedom-engine-os`
- Current supported desktop GUI:
  Freedom Desktop shell launched from this repo, with a browser fallback at
  `http://127.0.0.1:43111/`
- Current phone companion:
  Freedom Android app built from this monorepo at `apps/mobile`

## Current Operator Loop

The current mobile companion behavior is now closer to a real Freedom operator
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
  sheet so the phone behaves more like a focused voice companion than a dashboard
- premium realtime voice sessions now rehydrate from the recent thread and write their
  final transcripts back into the shared session history, so ending and restarting Talk
  no longer wipes the current conversational context
- if the paired desktop becomes unreachable after the app has cached chats, the phone can
  stay in `Offline / On-device` mode for local ideation, drafting, summaries, and queued
  import review instead of only throwing a connection error
- offline mobile work is now review-first and safe by design:
  importing it writes non-executing `system` notes into canonical history and drafts one
  explicit `Continue with Freedom` follow-up instead of auto-replaying offline turns into
  live desktop execution
- the header controls are now split cleanly:
  the three-line pull-down is the actions/capabilities lane, while the three dots are
  the settings lane for voice choices, reply behavior, and system adjustments
- the `Talk` header now uses that same layout without the old back-control remnant, so
  both primary voice surfaces read consistently
- compact footer actions on the `Talk` canvas with `Mute`, `Text`, live voice controls,
  a raised typed-turn composer, and one lower `Recent thread` card for opening and
  collapsing transcript history without overloading the center Freedom dialogue; the
  transcript itself now scrolls inside a bounded panel so the collapse control stays reachable
- the governed `From Conversations To Build` queue now lives in the pull-down utility
  sheet instead of the main start surface, so Freedom can surface it intentionally when
  a conversation should graduate into real build work

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

## Launch Path

1. In this repo, run `npm run launch`.
2. Confirm Codex is logged in on the desktop machine.
3. Confirm Tailscale or another private network path is available from the phone.
4. Pair the phone from the dashboard.
5. Open the Freedom desktop shell and create or restore the primary Freedom session.
6. Install the latest Freedom Android APK from this repo or the dashboard.
7. Chat with the local Freedom Engine workspace from the Freedom phone companion.
8. For premium voice, prefer the `Talk` canvas. The current realtime lane defaults to
   `gpt-realtime-mini` and normalizes legacy unsupported voice ids such as `nova` back
   to a supported voice like `marin`.
9. Ask Freedom directly to change the live voice profile if you want a different voice,
   gender presentation, accent hint, tone, pace, or warmth. Restart the voice session
   to hear a new realtime preset; the phone's local spoken-reply fallback picker stays
   separate in Homebase.
10. Use the small `Text` button for side-channel typed turns inside the current voice
    conversation, and use the `Build` view's `Launch build chat` flow when you want a
    separate project thread rather than more continuity in the default voice thread.

## APK Download

When the desktop host is running, the gateway serves the current release artifact at:

`http://pop-os.taildcb5c5.ts.net:43111/downloads/android/latest.apk`

The companion install page remains:

`http://pop-os.taildcb5c5.ts.net:43111/install`

## APK Release Hygiene

- Every distributed Android build must use a unique `versionCode`.
- Bump `versionName` whenever you want the human-visible release label to change.
- Use `npm run release:android-live` for the normal release path. It builds the Android APK,
  publishes it to the currently live website-backed release directory, and verifies the
  served `latest.apk` matches the local artifact.
- If the APK is already built and only the live website needs to be refreshed, run
  `npm run publish:android-release`.
- The live install page should expose a build-specific APK identifier and filename so you
  can tell at a glance which build a phone is about to install, even if `latest.apk`
  remains as a compatibility alias.
- Before sharing a new install link, verify the served APK matches the local release
  artifact by size or checksum. The publish script performs that verification automatically.
- If a phone appears to "start where it left off" after reinstalling, check for
  preserved app storage or a restored paired device token before assuming the APK is stale.
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

This gives you phone access to the repo through a Freedom-branded shell and phone
companion while the integrated Freedom desktop runtime stays underneath as the bridge.
It does not yet mean
Freedom Engine has its own independent hosted mobile backend. For "anytime" use, the
desktop or workstation running Freedom Desktop must stay online and reachable.

## Next Improvements

- keep Freedom as the visible product identity while the integrated runtime remains the transport layer
- connect the modeled parallel-skill and self-evolving-function registry to the
  live runtime so Freedom can branch governed work in practice
- add clearer builder-first actions from the desktop shell into Freedom-governed
  build requests
- continue real-device Android validation for the current offline companion and realtime
  interrupt/recovery pass, especially under conference-grade network and noise conditions
