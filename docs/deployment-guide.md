# Deployment Guide

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
3. Confirm `.env.local` points at the linked Supabase project
   `basbwglynuyfxcqxfyur`.
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` is available for server-side Freedom memory persistence.
5. Run `npm run backup:freedom-memory` before promoting schema or memory-behavior changes.
6. For local development, start with `npm run dev`.
7. Apply new Supabase migrations before promoting any environment changes.

## Android Companion Release

When publishing a new Freedom Android APK:

1. Bump `versionCode` in [apps/mobile/android/app/build.gradle](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/android/app/build.gradle:112). Every shared APK must have a unique build number.
2. Bump `versionName` when you want the release to be visibly distinguishable in Android settings or install flows.
3. Build the release artifact.
   `npm run build:android-release`
   expected output:
   `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
4. Verify the gateway-served `latest.apk` matches the local release artifact before sending the link out.
5. Confirm the install page shows the intended Android build identifier:
   `versionName`, `versionCode`, and the unique build-specific APK filename.

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
- Confirm the freshly built APK reports the intended `versionCode` / `versionName`
- Confirm the gateway install page is serving the expected unique APK filename for that build,
  not just the generic `latest.apk` alias
