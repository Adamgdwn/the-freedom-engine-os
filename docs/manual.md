# Manual

## What This Project Is

This project is an internal venture operating system. It helps compare ventures
objectively, inspect workflow leverage, govern agent actions, and run a weekly review
that ties business outcomes back to freedom outcomes.

## How To Work In This Repo

1. Run `bash scripts/governance-preflight.sh`.
2. Review `project-control.yaml` and confirm that exceptions remain empty or are updated
   intentionally.
3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env.local` if local Supabase values are missing.
5. Start the control plane with `npm run dev`.
5. When changing behavior, update the nearest matching controlled document in `docs/`.
6. Before finishing, run:
   `npm run lint`
   `npm run typecheck`
   `npm test`
   `npm run build`

## Expected Outputs

- working application code
- updated governed documentation
- evidence-backed changes to venture, workflow, or governance behavior
- validation results or a clearly stated blocker

## Current Capability Reference

- Start with `docs/current-capabilities.md` when deciding whether to build a new
  Freedom feature or extend an existing one.
- Keep that document current whenever live behavior, operator workflows, or the
  modeled-vs-live boundary changes.

## Operator Notes

- V1 is seeded and does not yet require Supabase credentials.
- The repo is now linked to Supabase project `basbwglynuyfxcqxfyur`, and the initial
  migration has been pushed.
- The `supabase/migrations/` directory is now the canonical schema source for remote updates.
- Persistent Freedom memory now requires `SUPABASE_SERVICE_ROLE_KEY` on the server side.
- Freedom email now lives in the web control plane at `/communications`.
- Trusted recipients are stored in Supabase and are the safety boundary for outbound mail.
- Freedom can prepare email drafts from voice, but the operator still confirms the send
  in the UI before anything leaves the system.
- The web control plane now uses a denser operator workbench shell:
  Portfolio Home acts as a launcher, deeper routes use list/detail layouts, and the
  desktop voice surface lives in the shell instead of a decorative marketing panel.
- The Android companion now treats the phone as command-and-capture:
  navigation is tucked behind a menu sheet and Freedom Voice is always reachable from
  the persistent bottom dock.
- Local memory backup:
  run `npm run backup:freedom-memory`
- Local memory restore:
  run `npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json`
- Desktop-host and gateway live runtime state under `.local-data/` is intentionally local-only.
  The committed `*.example.json` files in those folders are safe bootstrap fixtures for
  first run and for sharing the repo with others.
- The scoring workbench is intended for scenario testing, not for silently changing live priorities.
- Weekly Review is the preferred place to convert observations into approved next actions.
- Phone access should reuse Adam Connect. Add this repo root to Adam Connect's
  `DESKTOP_APPROVED_ROOTS` as a comma-separated absolute path list, then launch Adam
  Connect and pair from your phone.
- The operating rule for focus is simple:
  if a task is interesting but off-plan, the system should challenge it, park it, or turn
  it into a bounded experiment instead of silently expanding scope.
