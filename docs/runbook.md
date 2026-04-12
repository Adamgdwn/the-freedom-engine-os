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
- Phone access fails through Adam Connect:
  verify Codex login, Tailscale reachability, and that Freedom Engine's repo root is
  present in `DESKTOP_APPROVED_ROOTS`.

## Dependencies

- Node.js and npm for local runtime
- Next.js toolchain for build and routing
- Supabase migration files for future database setup
- GitHub workflow access for future code-control integration
- Adam Connect for paired mobile access to the local workstation

## Recovery

1. Re-run `bash scripts/governance-preflight.sh`.
2. Re-run validation commands.
3. If the issue is limited to seeded data, restore the last known-good data snapshot from
   version control.
4. If the issue is architectural, document the change in `docs/architecture.md` and add
   or update an ADR before re-releasing.
5. If phone access breaks, fall back to direct desktop use of the web app and recover the
   Adam Connect host separately.

## Escalation

- Owner:
  Adam Goodwin for priority changes, policy decisions, and external commitments
- Technical lead:
  hybrid session for architecture, validation, and deployment readiness
