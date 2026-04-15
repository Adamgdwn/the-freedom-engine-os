# Architecture Overview

## Summary

The Freedom Engine OS is a full-stack monorepo and control plane for an AI-native
organization. It combines a Next.js governance interface with a React Native Android
companion, Node.js gateway, Electron desktop shell, Codex bridge host, and wake relay —
all under one npm workspace. It is structured so Supabase-backed persistence can replace
the seeded data layer without rewriting the UI or service boundaries.

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
- Learning Registry:
  Capability internalization tracking — state, validation records, builder dependencies,
  safety notes, and learning history at `/learning-registry`.
- Model Router:
  Local-first model tier policy, escalation request queue, provider preference order,
  and resolved decision audit trail at `/model-router`.
- Persistence boundary:
  Supabase migrations under `supabase/migrations/` mirror both the original control-plane
  entities and the Freedom Connect runtime entities.
- Native runtime surfaces (npm workspace packages):
  `apps/mobile` — React Native Android companion (`@freedom/mobile`);
  `apps/gateway` — Node.js pairing and wake gateway (`@freedom/gateway`);
  `apps/desktop` — Electron shell (`@freedom/desktop`);
  `apps/desktop-host` — Codex bridge / VS Code extension host (`@freedom/desktop-host`);
  `apps/wake-relay` — Wake-on-LAN relay server (`@freedom/wake-relay`);
  `packages/shared`, `packages/core`, `packages/provider-adapters` — shared runtime contracts.

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

- Next.js 16 (control-plane web UI)
- React 19
- Tailwind CSS 4
- TypeScript 5
- LiveKit WebRTC + OpenAI Realtime API (voice layer)
- React Native 0.79 + Expo (Android companion)
- Electron (desktop shell)
- Supabase hosted project `basbwglynuyfxcqxfyur` in West US (Oregon)
- npm workspaces (monorepo; no Turborepo)

## Key Decisions

- V1 uses a seeded in-repo data layer to create a working governed slice quickly.
- The UI is a control plane, not a chat shell or siloed SaaS dashboard.
- Human approval is preserved for reprioritization, policy edits, spending, and
  irreversible external commitments.
- Score weights are editable in the UI and versioned in-memory now, with schema support
  for durable history later.
- Freedom is the product identity on desktop and phone; the runtime surfaces
  (gateway, desktop-host, mobile, wake-relay) are transport and pairing infrastructure.
- Mobile and desktop conversations land in Freedom-owned session contexts with shared
  audit correlation.
- `codex_adam_connect` has been fully absorbed into this repo (2026-04-15) and is
  archived. All future mobile, gateway, and desktop work happens here.
- The first integration posture centres AI Consulting Build, with PDF Flow as a live
  execution domain and GitHub as the code-control surface.

See `docs/adr/0001-shared-control-plane-v1.md`.
