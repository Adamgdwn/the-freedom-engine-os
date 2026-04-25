# Architecture Overview

Document status: live reference

## Summary

The Freedom Engine OS is a full-stack monorepo and control plane for an AI-native
organization. It combines a Next.js governance interface with a React Native Android
companion, Node.js gateway, Electron desktop shell, Codex bridge host, and wake relay —
all under one npm workspace. It is structured so Supabase-backed persistence can replace
the seeded data layer without rewriting the UI or service boundaries.

For a fast operator-facing view of what is actually live right now, use
`docs/current-capabilities.md`.

## Components

- Web control plane:
  Next.js App Router UI and server routes under `src/`; feature-level behavior is tracked
  in `docs/current-capabilities.md` and the per-feature specs under `docs/specs/`.
- Voice runtime:
  React voice surfaces plus the Python LiveKit/OpenAI worker under `agents/freedom_agent`;
  see `docs/voice-realtime-architecture.md` and `docs/specs/voice-layer-v1-spec.md`.
- Device and host runtime:
  `apps/mobile`, `apps/gateway`, `apps/desktop`, `apps/desktop-host`, and
  `apps/wake-relay` provide the phone, pairing, desktop-shell, host, and wake surfaces.
- Shared runtime contracts:
  `packages/shared` holds shared contracts, runtime helpers, and cross-surface utility code.
- Persistence and governance:
  Supabase migrations live under `supabase/migrations/`; governed operating rules live in
  `project-control.yaml`, `AI_BOOTSTRAP.md`, `docs/manual.md`, and `docs/runbooks/operations.md`.

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
7. Freedom now uses a governed memory loop rather than raw transcript carry-forward
   alone: completed text turns, connected voice turns, and offline-import sessions
   can be triaged by ChatGPT for durable learning, with only the approved memory
   channels (`learning signals`, `conversation memory`, open task memory, build-lane
   items, and persona overlays) written into canonical persistence.
8. That memory path is no longer purely remote-store dependent: the desktop gateway now
   keeps a durable local cache of learning signals and conversation memories, merges it
   with the remote Supabase-backed store when available, and exposes the combined digest
   back to mobile and voice runtime callers.
9. Voice memory updates are persisted through a server-only Next.js API into Supabase
   when configured, and the Python worker hydrates recent open-task, learning,
   programming, recipient, approved persona-overlay, and conversation-memory context
   into the live session prompt.
10. The operator reviews persona-adjustment, revision, and retirement requests in the
   Personality page and only approved overlays remain active runtime refinements.
11. When Freedom prepares an external email, the Python worker publishes a draft event,
   the control plane presents it for explicit confirmation, and the server sends it
   only to a trusted recipient recorded in Supabase.
12. Local backup and restore scripts export the durable memory tables into repo-local
   storage so partner memory can survive a wider service issue.
13. Desktop-host routes non-voice work through a shared model-router policy so routine
    read-only turns can stay on a configured local command lane while escalated work can
    use an operator-selected external lane such as `OpenAI / ChatGPT`, `Codex`, or
    `Claude Code`.
14. The desktop host now supervises the LiveKit/OpenAI voice worker, while the mobile
    app can also continue in a bounded offline ideation posture with cached chats and a
    bundled on-device model when the desktop is unreachable.
15. The live voice agent can inspect its own repo-side governance and tool YAML, and
    after explicit confirmation it can bridge approved programming work into the desktop
    execution lane instead of stopping only at a request-for-later posture.
16. Significant ideas that arise in conversation are meant to be promoted into the
    dedicated Pop!_OS build lane, where business case, approval posture, and execution
    evidence are made explicit before or during implementation.
17. Future persistence will swap the seed layer for Supabase queries while preserving the
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
  requests are persisted but still stop at explicit approval. The gateway now also keeps
  a durable local cache for learning signals and conversation memories so rich memory is
  not reduced to a thin prompt layer when the remote store is absent.
- Score weights are editable in the UI and versioned in-memory now, with schema support
  for durable history later.
- Freedom is the product identity on desktop and phone; the runtime surfaces
  (gateway, desktop-host, mobile, wake-relay) are transport and pairing infrastructure.
- Mobile and desktop conversations land in Freedom-owned session contexts with shared
  audit correlation.
- The earlier companion repo has been fully absorbed into this repo (2026-04-15) and is
  retired. All future mobile, gateway, and desktop work happens here.
- Android Gradle build requires explicit `reactNativeDir` / `codegenDir` / `cliFile`
  overrides and root-relative `includeBuild` paths because npm workspaces hoists
  `node_modules` to repo root rather than `apps/mobile/node_modules`.
- The gateway, desktop-host, and Electron shell run from repo root via
  `npm run launch:no-open`; the install page is at
  `pop-os.taildcb5c5.ts.net:43111/install`.
- The first integration posture centres AI Consulting Build, with PDF Flow as a live
  execution domain and GitHub as the code-control surface.
- The intended operating direction is a mostly autonomous business partner:
  Freedom should capture opportunities from conversation, classify them through business
  and governance lenses, execute approved Pop!_OS work, and report back with evidence
  rather than behaving like a generic question-answer voice assistant.

See `docs/adr/0001-shared-control-plane-v1.md`.
