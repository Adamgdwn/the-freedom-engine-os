# Architecture Overview

## Summary

The Freedom Engine OS is a shared control plane for an AI-native organization. V1 is a
seeded Next.js application that models ventures, workflows, agents, approvals,
evidence, and recommendations in one governed interface. The current build is optimized
for internal use first and structured so Supabase-backed persistence can replace the
seeded data layer without rewriting the UI or service boundaries.

## Components

- App shell:
  Next.js App Router interface for Portfolio Home, Venture Detail, Workflow Lab,
  Agent Control, Governance Console, Evidence Room, and Weekly Review.
- Domain seed layer:
  Typed portfolio, workflow, governance, and execution entities in `src/lib/seed-data.ts`.
- Scoring engine:
  Weighted venture scoring plus freedom metrics in `src/lib/scoring.ts`.
- Recommendation layer:
  Evidence-backed heuristics that translate scores, workflow state, and governance state
  into next-step recommendations.
- Governance fabric:
  Policies, approvals, overrides, human registry, tool registry, and execution logs
  surfaced in the UI and represented in the schema.
- Persistence boundary:
  Supabase migration under `supabase/migrations/` that mirrors the seeded entity model.

## Data Flow

1. Venture, workflow, governance, and execution records are loaded from typed seed data.
2. The scoring engine calculates venture score, freedom score, and combined priority.
3. The recommendation layer derives next actions from ranked ventures, live workflows,
   evidence items, blocked executions, and approval state.
4. Pages render portfolio, workflow, governance, and review views from the assembled
   control-plane snapshot.
5. Future persistence will swap the seed layer for Supabase queries while preserving the
   same entity boundaries.

## Dependencies

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript 5
- Supabase SQL migration scaffold for future persistence

## Key Decisions

- V1 uses a seeded in-repo data layer to create a working governed slice quickly.
- The UI is a control plane, not a chat shell or siloed SaaS dashboard.
- Human approval is preserved for reprioritization, policy edits, spending, and
  irreversible external commitments.
- Score weights are editable in the UI and versioned in-memory now, with schema support
  for durable history later.
- The first integration posture centers AI Consulting Build, with PDF Flow as a live
  execution domain and GitHub as the code-control surface.

See `docs/adr/0001-shared-control-plane-v1.md`.
