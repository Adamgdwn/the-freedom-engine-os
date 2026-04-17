# Architecture Overview

## Summary

The Freedom Engine OS is a full-stack monorepo and control plane for an AI-native
organization. It combines a Next.js governance interface with a React Native Android
companion, Node.js gateway, Electron desktop shell, Codex bridge host, and wake relay —
all under one npm workspace. It is structured so Supabase-backed persistence can replace
the seeded data layer without rewriting the UI or service boundaries.

For a fast operator-facing view of what is actually live right now, use
`docs/current-capabilities.md`.

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
- Freedom email layer:
  Trusted outbound recipient registry, confirmation-gated draft flow, and delivery audit
  now surfaced directly in the Next.js control plane at `/communications`.
- Learning Registry:
  Capability internalization tracking — state, validation records, builder dependencies,
  safety notes, and learning history at `/learning-registry`.
- Personality:
  Stable Freedom persona artifact, pending persona-adjustment approvals, active overlays,
  revision/retirement requests, and resolved persona history at `/personality`.
- Model Router:
  Local-first model tier policy, escalation request queue, provider recommendation,
  operator-selectable provider choices, and resolved decision audit trail at `/model-router`.
- Web voice layer:
  Shared React voice session context, LiveKit room session, interrupt/task data channel,
  and Python Realtime worker coordination surfaced in the Next.js operator workbench
  voice console and mobile voice action surfaces.
- Voice partner autonomy layer:
  The Python Freedom worker carries an explicit operating-policy prompt plus read/write
  coordination tools for open tasks, durable learning, pending programming requests,
  trusted recipients, approved persona overlays, parked-task updates, and approval-gated
  email, programming, persona-adjustment, overlay-revision, and overlay-retirement actions.
- Persistence boundary:
  Supabase migrations under `supabase/migrations/` mirror both the original control-plane
  entities and the Freedom Connect runtime entities.
- Durable memory layer:
  Server-only Supabase admin client, memory API routes, and local backup/restore scripts
  preserve learning signals, parked voice tasks, approval-gated self-programming requests,
  and approval-gated persona overlays.
- Outbound communication layer:
  Server-side Resend delivery, Supabase-backed trusted recipients, and recent delivery
  audit records bridge the current web/voice Freedom surface to explicit external email.
- Native runtime surfaces (npm workspace packages):
  `apps/mobile` — React Native Android companion (`@freedom/mobile`);
  `apps/gateway` — Node.js pairing and wake gateway (`@freedom/gateway`);
  `apps/desktop` — Electron shell (`@freedom/desktop`);
  `apps/desktop-host` — routed desktop execution host / VS Code extension with local
  command lane plus Codex bridge fallback (`@freedom/desktop-host`);
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
6. The web voice lane exchanges short-lived LiveKit tokens, audio, interrupt events, and
   task-state updates between the browser and the Python Realtime worker.
7. Voice memory updates are persisted through a server-only Next.js API into Supabase,
   and the Python worker hydrates recent open-task, learning, programming, recipient,
   and approved persona-overlay context into the live session prompt.
8. The operator reviews persona-adjustment, revision, and retirement requests in the
   Personality page and only approved overlays remain active runtime refinements.
9. When Freedom prepares an external email, the Python worker publishes a draft event,
   the control plane presents it for explicit confirmation, and the server sends it
   only to a trusted recipient recorded in Supabase.
10. Local backup and restore scripts export the durable memory tables into repo-local
   storage so partner memory can survive a wider service issue.
11. Desktop-host routes non-voice work through a shared model-router policy so routine
   read-only turns can stay on a configured local command lane while escalated work can
   use an operator-selected external lane such as `OpenAI / ChatGPT`, `Codex`, or
   `Claude Code`.
12. Future persistence will swap the seed layer for Supabase queries while preserving the
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
- External email is draft-first and confirmation-gated. Freedom can prepare the send,
  but the operator still authorizes the actual outbound delivery in the UI.
- Durable Freedom memory is server-written and locally exportable; self-programming
  requests are persisted but still stop at explicit approval.
- Score weights are editable in the UI and versioned in-memory now, with schema support
  for durable history later.
- Freedom is the product identity on desktop and phone; the runtime surfaces
  (gateway, desktop-host, mobile, wake-relay) are transport and pairing infrastructure.
- Mobile and desktop conversations land in Freedom-owned session contexts with shared
  audit correlation.
- `codex_adam_connect` has been fully absorbed into this repo (2026-04-15) and is
  archived. All future mobile, gateway, and desktop work happens here.
- Android Gradle build requires explicit `reactNativeDir` / `codegenDir` / `cliFile`
  overrides and root-relative `includeBuild` paths because npm workspaces hoists
  `node_modules` to repo root rather than `apps/mobile/node_modules`.
- The gateway, desktop-host, and Electron shell run from repo root via
  `npm run launch:no-open`; the install page is at
  `pop-os.taildcb5c5.ts.net:43111/install`.
- The first integration posture centres AI Consulting Build, with PDF Flow as a live
  execution domain and GitHub as the code-control surface.

See `docs/adr/0001-shared-control-plane-v1.md`.
