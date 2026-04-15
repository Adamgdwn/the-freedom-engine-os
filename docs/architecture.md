# Architecture Overview

## Summary

The Freedom Engine OS is a shared control plane for an AI-native organization. The
current build is a seeded Next.js application that models ventures, workflows, agents,
approvals, evidence, recommendations, and cross-surface Freedom Connect activity in one
governed interface. It is structured so Supabase-backed persistence can replace the
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
- Freedom Connect:
  Desktop shell and phone companion session identity, connect events, outbound policy,
  and governed builder routing surfaced as Freedom-owned runtime state.
- Persistence boundary:
  Supabase migrations under `supabase/migrations/` mirror both the original control-plane
  entities and the new Freedom Connect runtime entities.
- Runtime bridge:
  Connect at `/home/adamgoodwin/code/agents/codex_adam_connect` acts as the transport,
  pairing, shell, and mobile runtime layer underneath the user-facing Freedom product.

## Data Flow

1. Venture, workflow, governance, and execution records are loaded from typed seed data.
2. The scoring engine calculates venture score, freedom score, and combined priority.
3. The recommendation layer derives next actions from ranked ventures, live workflows,
   evidence items, blocked executions, and approval state.
4. Freedom Connect sessions, events, and governed builder requests are assembled into the
   same control-plane snapshot so phone and desktop activity stay visible in governance.
5. Pages render portfolio, workflow, governance, and review views from the assembled
   control-plane snapshot.
6. Future persistence will swap the seed layer for Supabase queries while preserving the
   same entity boundaries.

## Dependencies

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript 5
- Supabase hosted project `basbwglynuyfxcqxfyur` in West US (Oregon)
- Connect runtime at `/home/adamgoodwin/code/agents/codex_adam_connect` for the Freedom
  desktop shell and Freedom mobile companion

## Key Decisions

- V1 uses a seeded in-repo data layer to create a working governed slice quickly.
- The UI is a control plane, not a chat shell or siloed SaaS dashboard.
- Human approval is preserved for reprioritization, policy edits, spending, and
  irreversible external commitments.
- Score weights are editable in the UI and versioned in-memory now, with schema support
  for durable history later.
- Freedom is the product identity on desktop and phone; Connect remains the runtime and
  transport layer underneath that identity.
- Mobile and desktop conversations should land in Freedom-owned session contexts with
  shared audit correlation instead of presenting Connect as a separate assistant.
- The first integration posture centers AI Consulting Build, with PDF Flow as a live
  execution domain and GitHub as the code-control surface.

See `docs/adr/0001-shared-control-plane-v1.md`.
