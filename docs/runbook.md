# Runbook

## Purpose

Operate the Freedom Engine OS safely as a governed internal decision system.

## Alerts And Failures

- Governance preflight fails:
  restore missing required files or fix `project-control.yaml` before making further
  substantial changes.
- UI route fails to render:
  run `npm run typecheck` and `npm run build` to isolate compile-time issues.
- Recommendation quality degrades:
  inspect evidence freshness, blocked approvals, and score-weight drift.
- Workflow or execution state looks wrong:
  review the seed data or future persistence source before changing priorities.
- Phone access fails through Freedom Desktop:
  verify Codex login, Tailscale reachability, and that Freedom Engine's repo root is
  present in `DESKTOP_APPROVED_ROOTS`.
- Premium mobile voice connects but does not answer:
  verify repo-root `.env` contains the LiveKit and OpenAI keys, confirm only one
  `python agent.py dev` worker is running, and reinstall the latest Android build so
  the speech-service selection fix is on-device.
- Freedom memory looks missing or stale:
  verify `SUPABASE_SERVICE_ROLE_KEY`, confirm the latest memory migration is applied, and
  restore from the latest local backup if needed.

## Dependencies

- Node.js and npm for local runtime
- Next.js toolchain for build and routing
- Supabase migration files for future database setup
- Supabase service-role access for durable Freedom memory persistence and restore
- GitHub workflow access for future code-control integration
- Freedom desktop-host and gateway for paired mobile access to the local workstation

## Recovery

1. Re-run `bash scripts/governance-preflight.sh`.
2. Re-run validation commands.
3. If the issue is limited to seeded data, restore the last known-good data snapshot from
   version control.
4. If Freedom memory is at risk, run `npm run backup:freedom-memory` immediately if the
   project is still reachable. If Supabase memory is lost, restore with
   `npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json`.
5. If the issue is architectural, document the change in `docs/architecture.md` and add
   or update an ADR before re-releasing.
6. If phone access breaks, fall back to direct desktop use of the web app and recover the
   Freedom desktop-host and gateway separately.
7. If premium mobile voice still stalls after reconnecting, stop stale LiveKit workers,
   restart one clean worker from `agents/freedom_agent`, and start a fresh room from the
   phone instead of reusing an already-stuck session.

## Escalation

- Owner:
  Adam Goodwin for priority changes, policy decisions, and external commitments
- Technical lead:
  hybrid session for architecture, validation, and deployment readiness
