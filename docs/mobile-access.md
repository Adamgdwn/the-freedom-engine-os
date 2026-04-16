# Mobile Access Via Freedom Connect

## Decision

Freedom Engine should present a single `Freedom` identity on desktop and phone while
reusing the existing Connect runtime for pairing, transport, and session delivery
instead of building a second mobile bridge.

No migration of Adam Connect is required just to test this repo.

Connect already handles:

- phone pairing
- Codex login dependency on the desktop
- approved-root workspace constraints
- realtime message streaming between phone and desktop

## Existing Companion

- Repo:
  `/home/adamgoodwin/code/agents/the-freedom-engine-os`
- Current supported desktop GUI:
  Freedom Desktop shell launched from Connect, with a browser fallback at
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
- spoken-reply voice picker that now labels accent, engine, quality, and any
  safe style or gender hints Android actually exposes
- task-aware routing so Freedom can answer side questions or start a safe parallel
  subtask instead of defaulting to a single blocking "busy" response
- Freedom-owned chat/build surfaces so the phone stays pointed at Freedom even
  though Connect still carries the runtime and transport
- compact top bar plus menu sheet so navigation and session controls stay available
  without taking over the whole screen
- persistent bottom Freedom Voice dock so the primary talk control is always reachable

## What To Configure

In Connect's `.env`, set `DESKTOP_APPROVED_ROOTS` as a comma-separated list of
absolute roots. Include Freedom Engine's repo root:

`/home/adamgoodwin/code/agents/the-freedom-engine-os`

Example:

`DESKTOP_APPROVED_ROOTS=/home/adamgoodwin/code/agents/the-freedom-engine-os`

Current local check:

- Connect is installed and provisioned
- Freedom Engine is present in Connect's `DESKTOP_APPROVED_ROOTS`

That means the next clean step is real-device acceptance, not migration.

## Launch Path

1. In this repo, run `npm run launch`.
2. Confirm Codex is logged in on the desktop machine.
3. Confirm Tailscale or another private network path is available from the phone.
4. Pair the phone from the dashboard.
5. Open the Freedom desktop shell and create or restore the primary Freedom session.
6. Install the latest Freedom Android APK from this repo or the dashboard.
7. Chat with the local Freedom Engine workspace from the Freedom phone companion.

## APK Download

When the desktop host is running, the gateway serves the current release artifact at:

`http://pop-os.taildcb5c5.ts.net:43111/downloads/android/latest.apk`

The companion install page remains:

`http://pop-os.taildcb5c5.ts.net:43111/install`

## APK Release Hygiene

- Every distributed Android build must use a unique `versionCode`.
- Bump `versionName` whenever you want the human-visible release label to change.
- The gateway install page should expose a build-specific APK identifier and filename so you
  can tell at a glance which build a phone is about to install.
- Before sharing a new install link, verify the served APK matches the local release
  artifact by size or checksum.
- If a phone appears to "start where it left off" after reinstalling, check for
  preserved app storage or a restored paired device token before assuming the APK is stale.

## What This Means

This gives you phone access to the repo through a Freedom-branded shell and phone
companion while Connect stays underneath as the runtime bridge. It does not yet mean
Freedom Engine has its own independent hosted mobile backend. For "anytime" use, the
desktop or workstation running Connect must stay online and reachable.

## Next Improvements

- keep Freedom as the visible product identity while Connect remains the runtime layer
- connect the modeled parallel-skill and self-evolving-function registry to the
  live runtime so Freedom can branch governed work in practice
- add clearer builder-first actions from the desktop shell into Freedom-governed
  build requests
- finish real-device Android validation for the current interrupt and multi-task
  orchestration pass
