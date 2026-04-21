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

## Freedom Dispatcher

The Freedom Dispatcher (`agents/freedom-dispatcher/`) is a FastAPI service on 127.0.0.1:4317 that gives Freedom the ability to invoke any local tool or agent during conversation.

- Runs as a systemd user service (`freedom-dispatcher.service`) — starts automatically on login.
- Scans `~/code/**` every 20 seconds for `freedom.tool.yaml` manifests. New manifests are picked up automatically.
- To make any tool callable by Freedom: add a `freedom.tool.yaml` manifest beside the tool's code and ensure the tool accepts JSON on stdin and writes a JSON result as the last stdout line.
- Manifest schema version: 1. See `agents/freedom-dispatcher/tools/` for examples.
- Autonomy levels: A1 (verbal confirm), A2 (silent). Default A1.

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
