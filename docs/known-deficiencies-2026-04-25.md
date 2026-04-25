# Known Deficiencies

Date: 2026-04-25
Status: current consolidated list

This document is the canonical dated list of known deficiencies, missing runtime
links, and intentionally unfinished areas across Freedom as of 2026-04-25.

It consolidates gaps previously spread across `docs/current-capabilities.md`,
`docs/roadmap.md`, `docs/session-log-freedom-anywhere-relay-2026-04-24.md`, and
`apps/relay/README.md`.

## Scope

- Include deficiencies that materially affect live behavior, autonomy posture,
  persistence, governance, or deployment readiness.
- Include intentionally deferred items when they still matter to planning or
  operator expectations.
- Exclude completed work already live on `main`.

## Canonical Deficiencies As Of 2026-04-25

### Runtime Data And Persistence

- Venture, approval, workflow, policy, recommendation, and weekly-metric data
  are still too dependent on seeded or modeled control-plane data instead of
  live Supabase-backed retrieval.
- Voice agent tools such as `top_venture_status`, `pending_approvals`, and
  `weekly_metrics` still need live Supabase implementations instead of stubs.
- The outcome model exists in specs and typed contracts, but is not yet wired
  into live runtime recommendations, workforce routing, or self-programming
  decisions.
- Knowledge-governance decisions are defined conceptually, but are not yet fully
  wired into live chat disposition, document placement, archival behavior, or
  retrieval workflows.
- Score-weight versions, approvals, overrides, weekly reviews, and related
  evidence histories still need fuller durable persistence and audit coverage.

### Autonomy And Execution

- Freedom is moving toward a co-founder or trusted-advisor posture, but that
  higher-order operating behavior is not yet fully operational end to end in the
  live runtime.
- Multi-agent workforce definitions, skills, and self-evolving functions exist
  in the model layer, but they are not yet a live continuously running governed
  orchestration system.
- Approved self-programming requests are persisted and surfaced, but the full
  governed execution pipeline from approval to bounded implementation is still
  incomplete.
- Broader self-directed research remains governed and intentionally limited; the
  system should not silently expand into autonomous external research loops.
- Autonomous self-modification without approval is intentionally not live.
- Broad autonomous business operations without governance review are
  intentionally not live.

### Model Routing And Provider Governance

- The model-router surface is much more real than before, but modeled provider
  policy, escalation views, and budget logic still are not fully wired through
  every runtime decision path.
- The premium mobile realtime voice lane still depends on desktop-side
  `LIVEKIT_*` and `OPENAI_API_KEY` credentials being present when running in the
  connected posture.
- Full local-model execution is still an optional configured lane, not the
  default runtime posture and not a full replacement for the hosted voice path.
- The escalation flow for provider choice exists, but still needs more complete
  validation in the real operator loop and UI.

### Stand-Alone Mobile And Relay

- Stand-alone mobile sync currently covers durable `learning` signals only. It
  does not yet auto-sync self-programming requests or persona changes.
- Stand-alone voice with the full Freedom Python voice agent running directly on
  the relay host is not started yet.
- The current relay `/chat` path is still a bounded OpenAI-backed fallback and
  must continue to be kept behaviorally aligned with the main Freedom runtime.
- The relay is still deployed on a temporary always-on phone/Termux host rather
  than a more durable box such as a Pi, NAS, or VPS.
- FCM push receive support in the mobile app is not started yet.
- The desktop pulse sender path in the gateway is not started yet.
- Firebase project setup plus `google-services.json` for the APK is not started
  yet.

### Identity, Personality, And Review Flows

- The voice-first identity layer still needs design and validation for operator
  voice recognition, trusted-speaker filtering, and wake-phrase handling.
- Personality layering needs fuller end-to-end validation: approved overlays,
  pending requests, lineage, retirement, and runtime activation behavior all
  need confirmation in real usage.
- The personality review surface needs more validation to ensure approved
  revisions supersede prior overlays cleanly and retirement removes stale
  refinements without drifting the core persona.

### Validation, Evals, And Reliability

- Real-device Android acceptance still needs broader validation across voice
  start, playback, interrupt, mute, resume, voice switching, and safe task
  handling.
- Control-plane web voice still needs deeper validation for interrupts, state
  transitions, parked-task updates, and resumed-review behavior.
- Conversation-learning behavior still needs deeper validation so durable
  learning, concise redirection, and approval-gated self-programming behave
  consistently.
- Supabase-backed memory, backup, and restore still need stronger validation for
  reload survival and clean capture of learning signals, parked tasks, and
  self-programming requests.
- The approval-gated autonomy loop still needs broader validation for open-task
  review, side-question handling, topic-shift parking, and duplicate
  self-programming suppression.
- Transcript-based evals still need to be added for the partner loop, parking,
  learning capture, approval-gated self-programming, email drafting, personality
  persistence, best-solution behavior, and documentation or retrieval decisions.

### Data Model And System Consolidation

- The older mobile and gateway email-recipient store still needs to be unified
  with the newer control-plane email store if the goal is one recipient
  registry.
- Learning-registry seed data still needs to be promoted into fuller live
  Supabase-backed capability tracking.
- Knowledge governance, outcome scoring, and workforce orchestration still need
  tighter integration so they do not remain partially parallel planning systems.

### Security And Deployment Follow-Up

- Exposed OpenAI and LiveKit keys were intentionally left unrotated during the
  relay sprint and still need follow-up rotation.
- Authenticated access and role-aware approval flows remain incomplete.
- Governed external-facing surfaces are intentionally deferred until internal
  operating confidence is higher.

## Intentional Non-Deficiencies

These are intentionally not live yet and should not be mistaken for accidental
gaps:

- autonomous self-modification without approval
- silent external sends
- memory loops that independently decide what to store, change, or act on
  without operator review
- full local model execution replacing the hosted voice runtime today
- broad autonomous business operations without governance review

## Source Documents

- [Current Capabilities](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/current-capabilities.md:1)
- [Roadmap](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/roadmap.md:1)
- [Freedom Anywhere Relay Session Log](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/session-log-freedom-anywhere-relay-2026-04-24.md:1)
- [Relay README](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/relay/README.md:1)
