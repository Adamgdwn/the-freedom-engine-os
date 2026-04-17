# AI Bootstrap Rules

## Purpose

This repository must be workable by Claude, Codex, and local coding agents
using the same operating rules.

## Change rules

- Prefer editing existing files over creating duplicate replacements.
- Keep changes small and reversible.
- Do not rename or move core files unless explicitly instructed.
- Explain new dependencies before adding them.
- Update docs when behavior, interfaces, or architecture change.

## Governance

- Run the governance preflight before making substantial changes:
  `bash scripts/governance-preflight.sh`
- Review `project-control.yaml` for risk tier and required controls.
- Record deviations as exceptions rather than ignoring them.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck`

## Document control

- Architecture decisions go in `docs/`
- If code behavior changes, update the nearest controlled document in the same task

## Completion standard

A task is not complete until relevant validation is run or a blocker is clearly stated.

For user-visible Android mobile changes, completion also requires shipping the updated APK:
- bump `versionCode` / `versionName`
- run `npm run release:android-live` unless there is an explicit reason not to
- confirm the built artifact at
  `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- confirm the live install page
  `http://pop-os.taildcb5c5.ts.net:43111/install`
- confirm the build-specific APK URL shown on that page
- include all three locations in the final handoff
- do not rely only on `latest.apk`; the build-specific download URL is the release-grade link
