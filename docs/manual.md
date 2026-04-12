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
4. Start the control plane with `npm run dev`.
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

## Operator Notes

- V1 is seeded and does not yet require Supabase credentials.
- The `supabase/migrations/` directory defines the persistence target for the next build phase.
- The scoring workbench is intended for scenario testing, not for silently changing live priorities.
- Weekly Review is the preferred place to convert observations into approved next actions.
