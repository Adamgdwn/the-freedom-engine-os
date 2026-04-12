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
3. For local development, start with `npm run dev`.
4. When persistence is introduced, apply the Supabase migration in
   `supabase/migrations/202604120001_freedom_engine_v1.sql` before promoting the app.

## Rollback

- Code rollback:
  redeploy the previous known-good commit.
- Schema rollback:
  prefer additive forward fixes; do not manually drop governance data without an approved
  recovery plan.
- Operational rollback:
  if a new control-plane release is unstable, fall back to the previous deployed version
  and use Weekly Review plus approvals as the manual decision surface until restored.

## Validation

- Confirm all primary routes load:
  `/`, `/workflow-lab`, `/agent-control`, `/governance`, `/evidence-room`,
  `/weekly-review`, and `/ventures/ai-consulting-build`
- Confirm the score workbench renders and creates simulated versions
- Confirm build and lint remain clean
