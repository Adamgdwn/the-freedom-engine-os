# Deployment Guide

Document status: live reference

## Environments

- `dev`:
  local seeded mode for product development and workflow design
- `staging`:
  future Supabase-backed preview environment for approval and integration testing
- `prod`:
  future internal operating environment after live persistence and auth are enabled

## Deployment Steps

1. Run `bash scripts/governance-preflight.sh`.
2. Validate the application:
   `npm run lint`
   `npm run typecheck`
   `npm test`
   `npm run build`
3. Confirm repo-root `.env` contains the desktop, gateway, and mobile runtime secrets.
   Keep `.env.example` as placeholders only.
   For stand-alone relay-backed Freedom Anywhere, also confirm
   `MOBILE_RELAY_BASE_URL`, `MOBILE_DISCONNECTED_ASSISTANT_BASE_URL`, and
   `FREEDOM_RELAY_SHARED_SECRET` are real values rather than placeholders.
4. Confirm `.env.local` points at the linked Supabase project
   `basbwglynuyfxcqxfyur` when web-only overrides are needed.
5. Confirm `SUPABASE_SERVICE_ROLE_KEY` is available for server-side Freedom memory persistence.
6. Run `npm run backup:freedom-memory` before promoting schema or memory-behavior changes.
7. For local development, start with `npm run dev`.
8. Apply new Supabase migrations before promoting any environment changes.
9. Keep live desktop-host and gateway `.local-data` state out of source control; only the
   sanitized `*.example.json` bootstrap fixtures should be versioned.

## Android Companion Release

When publishing a new Freedom Android APK:

1. Bump `versionCode` in [apps/mobile/android/app/build.gradle](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/android/app/build.gradle:112). Every shared APK must have a unique build number.
2. Bump `versionName` when you want the release to be visibly distinguishable in Android settings or install flows.
3. Build the default slim release artifact and publish it to the live install surface in one step.
   `npm run release:android-live`
   if you intentionally want the larger bundled-model build instead:
   `npm run release:android-live-offline`
   expected output:
   `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
4. If you need to publish without rebuilding, run:
   `npm run publish:android-release`
5. By default the publish script syncs the built APK and `output-metadata.json` into the currently live desktop install stack at:
   `apps/mobile/android/app/build/outputs/apk/release`
   override with:
   `ANDROID_PUBLISH_TARGET_DIR=/absolute/path/to/release npm run publish:android-release`
6. The publish step also verifies the live gateway download at:
   `http://127.0.0.1:43111/downloads/android/latest.apk`
   override with:
   `ANDROID_PUBLISH_VERIFY_URL=http://host:port/downloads/android/latest.apk npm run publish:android-release`
7. Confirm the install page shows the intended Android build identifier:
   `versionName`, `versionCode`, and the unique build-specific APK filename.
8. Confirm the desktop cockpit at `http://127.0.0.1:43111/` is serving the current
   gateway shell, including the robot owl logo from `/assets/robot-origin-logo.png`,
   the manual command composer, pairing code/URL copy controls, and the Android install
   link.
9. If the current relay host is the phone's Termux runtime, confirm
   `~/.freedom-relay.env` contains the same `FREEDOM_RELAY_SHARED_SECRET` as the desktop
   build before shipping the APK.

## Rollback

- Code rollback:
  redeploy the previous known-good commit.
- Schema rollback:
  prefer additive forward fixes; do not manually drop governance data without an approved
  recovery plan.
- Operational rollback:
  if a new control-plane release is unstable, fall back to the previous deployed version
  and use Weekly Review plus approvals as the manual decision surface until restored.
- Memory rollback:
  restore the latest local memory snapshot with
  `npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json`
  after the target environment has the current schema.

## Validation

- Confirm all primary routes load:
  `/`, `/workflow-lab`, `/agent-control`, `/governance`, `/evidence-room`,
  `/weekly-review`, and `/ventures/ai-consulting-build`
- Confirm the score workbench renders and creates simulated versions
- Confirm the linked Supabase project exists and the migration history is current
- Confirm Freedom memory backup completes locally before release when memory behavior changed
- Confirm build and lint remain clean
- When premium mobile voice is enabled, confirm the desktop host can write
  `DESKTOP_DATA_DIR/voice-worker/worker.log` and expose a current
  `DESKTOP_DATA_DIR/voice-worker/worker.lock.json` during an active voice-worker run
- Confirm the freshly built APK reports the intended `versionCode` / `versionName`
- Confirm the gateway install page is serving the expected unique APK filename for that build,
  not just the generic `latest.apk` alias
- Confirm the gateway desktop cockpit is not serving stale desktop copy or placeholder
  branding after release; `/assets/robot-origin-logo.png` should return `200 OK`
