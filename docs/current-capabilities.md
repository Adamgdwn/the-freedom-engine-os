# Current Capabilities

Last updated: 2026-04-17

This document is the working reference for what Freedom can actually do today.
Update it whenever a change materially affects live behavior, operator workflows,
or the boundary between modeled and fully operational capability.

## How To Read This

- `Live` means the capability exists in runnable code and is part of the current system behavior.
- `Modeled` means the concept exists in the control plane or seed data, but is not yet a full end-to-end runtime behavior.
- `Planned` means it is intentionally not live yet.

## Live Now

### Control Plane

- Next.js 16 governed control plane with:
  Portfolio Home, Workflow Lab, Agent Control, Governance Console, Evidence Room,
  Weekly Review, Learning Registry, Model Router, and Communications.
- Shared operator workbench shell with:
  a compact top bar, desktop activity rail, launcher-style Portfolio Home tabs,
  an inspectable desktop voice console, and a stronger mobile bottom voice action.
- Seeded but navigable venture, workflow, governance, approval, execution, and
  recommendation views.

### Voice Runtime

- LiveKit WebRTC browser voice session.
- OpenAI Realtime worker (`gpt-realtime-mini`) in Python.
- Model-level interrupt support through LiveKit data messages.
- Web voice is the repo's only primary-grade realtime voice path today.
- Web voice tokens are short-lived and bound to explicit browser voice-session ids instead of a shared room.
- Mobile can now request its own authenticated LiveKit voice session from the paired
  gateway and connect directly to the same realtime voice worker contract.
- UI-visible voice states: `idle`, `connecting`, `listening`, `processing`,
  `speaking`, `error`.
- Mic mute on assistant playback to prevent assistant self-hearing.
- Park-and-resume task threads surfaced in the desktop voice console and mobile session controls.
- Task-aware interruption routing across mobile/gateway/desktop:
  `quick_question`, `clarification`, `parallel_subtask`, `replace_task`, and `stop_task`.
- Mobile voice loops are pinned to one chat session at a time so switching chats does not silently reroute live speech or spoken replies.
- Mobile now prefers the realtime voice runtime first and only drops to the older chained
  device STT -> text agent -> device TTS loop when the paired desktop does not have
  `LIVEKIT_*` and `OPENAI_API_KEY` configured for the premium path.
- The mobile utility sheet now shows whether `Auto-send voice turns` is on, and legacy
  installs that picked up the temporary default-off state are migrated back to auto-send
  unless the user had explicitly changed that preference.
- On Android, if the phone lacks the current locale's on-device speech model and has no
  better recognizer available than the TTS-backed service, Freedom now opens the system
  speech-model download flow instead of failing silently.
- Bounded safe parallel task execution when the scheduler judges tasks non-conflicting.
- Transcript and state updates streamed back into the browser UI.

### Persistent Memory

- Durable storage of parked voice tasks.
- Durable storage of learning signals from conversation.
- Durable storage of approval-gated self-programming requests.
- Durable storage of persona overlays and persona-adjustment requests.
- Supabase-backed server-side memory load and persist path.
- Runtime read access for Freedom to inspect open tasks, recent learning signals,
  pending self-programming requests, approved persona overlays, and trusted email recipients during voice sessions.
- Local backup and restore of memory tables through:
  `npm run backup:freedom-memory`
  `npm run restore:freedom-memory -- --input=...`

### Partner Behavior

- Stable Freedom core persona loaded from a dedicated prompt artifact.
- On-task redirection posture.
- Durable learning capture during voice sessions.
- Approval-gated self-programming requests that stop before execution.
- Approval-gated persona-adjustment requests that do not rewrite the core persona.
- Revision-aware persona overlays so Freedom can propose a better version of an active
  overlay and supersede the old one only after approval.
- Approval-gated persona-overlay retirement requests so Freedom can propose removing stale
  or counterproductive overlays without silently dropping them.
- Dedicated `Personality` review surface in the control plane for approving, denying,
  denying, and retiring Freedom-originated persona overlays, revisions, and retirements.
- Explicit operating policy for topic shifts, side questions, checkpointing,
  memory recording, and approval-gated improvement requests.

### Communications

- Server-side outbound email using Resend env configuration.
- Trusted-recipient registry in Supabase for the current web/control-plane path.
- Voice-prepared, confirmation-gated email drafts.
- UI confirmation before sending external email.
- Recent delivery audit shown in the Communications page.
- Legacy mobile/gateway outbound email path still exists in parallel.

### Native Runtime Surfaces

- Desktop shell, desktop host, gateway, wake relay, and mobile companion all live in this monorepo.
- Phone and desktop pair into one Freedom-owned session identity through the Connect runtime.
- Governed session routing, pairing, and activity surfaces are visible in the control plane.
- Desktop-host and gateway runtime stores now bootstrap missing local state from committed,
  sanitized example files while continuing to keep live machine-specific state local-only.
- Gateway install surfaces now expose build-specific Android APK identifiers and filenames,
  while preserving `latest.apk` as a compatibility alias.
- Android companion shell now emphasizes:
  command-and-capture from the phone, a sparse Start surface, a dedicated Talk canvas,
  and a hidden utility sheet instead of a dashboard-style shell.
- The mobile utility menu now includes an `About this build` section that shows the
  installed app version, build code, and current voice runtime directly on-device for
  release verification.
- Mobile voice auto-send is on by default again, and riskier or unusually long spoken requests are pushed into transcript review before they can run.
- Android live voice now uses the device-default recognizer language instead of forcing
  `en-US`, which avoids on-device language-pack mismatches on phones whose configured
  speech locale differs from U.S. English.
- When Android's on-device recognizer does not have the current locale model installed,
  the mobile runtime now falls back to another visible recognizer service instead of
  repeatedly choosing the broken path.

## Modeled But Not Fully Operational

### Portfolio Data

- Venture, approval, workflow, policy, and recommendation data are still primarily
  seeded/model data in the control plane rather than fully Supabase-backed runtime queries.

### Multi-Agent Workforce

- Agent roles, skill definitions, self-evolving functions, capability definitions,
  escalation requests, and builder routing exist in the model/control-plane layer.
- They are not yet a fully autonomous, continuously running multi-agent orchestration layer.

### Co-Founder / Trusted Advisor

- Freedom is being shaped toward an almost-autonomous co-founder and trusted advisor that
  decides what to build, automate, delegate, or stop based on long-term freedom outcomes.
- That higher-level operating posture is not yet fully operational end to end in the live runtime.

### Outcome-Driven Orchestration

- The explicit outcome engine for comparing `build`, `automate`, `delegate`, `simplify`,
  `stop`, `defer`, or `redesign` options is now defined in the planning/spec and typed
  model layer.
- It is not yet wired into live runtime recommendations, workforce routing, or self-programming decisions.

### Knowledge Governance

- Knowledge-governance and retrieval policies are now defined in the planning/spec and
  typed model layer:
  when Freedom should document, summarize, archive, discard, learn a new skill, and where
  durable documents should live for future retrieval.
- Those decisions are not yet wired into live chat disposition, document placement, or retrieval workflows.

### Model Routing

- Model Router policy, escalation views, and example execution budgets exist in the control plane.
- The intended posture is Codex-first for day-to-day conversation and operating work, with
  local models kept as an optional lower-cost lane instead of the default experience.
- The desktop-host runtime now applies a real routed execution policy for non-voice work:
  routine read-only operating turns can prefer the premium day-to-day lane by default,
  while workspace-changing or build-lane work routes to the heavier provider lane.
- Desktop-host work pickup now long-polls the gateway instead of waiting on a fixed
  one-second polling cadence, reducing idle latency for newly queued turns and interrupts.
- Escalation is now modeled as:
  Freedom recommends a provider, presents the operator choice set, and the operator
  selects which external lane to use.
- `OpenAI / ChatGPT` is now a first-class escalation option alongside `Codex` and
  `Claude Code`.
- Local execution becomes truly active when `FREEDOM_LOCAL_MODEL_COMMAND` is configured;
  it now acts as an explicit optional cost-control lane rather than the default posture.
- The current live web voice runtime now defaults to `gpt-realtime-mini`, so the default
  voice lane is cheaper than before even though it is still hosted rather than local.
- The premium mobile realtime lane still depends on desktop-side `LIVEKIT_*` plus
  `OPENAI_API_KEY` being present. Without those credentials, the APK degrades to the
  older device fallback instead of silently pretending the premium path exists.
- Gateway assistant streaming now defers disk persistence instead of rewriting the full
  state file on every token chunk.
- Environment-level routing config now exists for the modeled router:
  `FREEDOM_LOCAL_MODELS_ENABLED`, `FREEDOM_DAY_TO_DAY_PROVIDER`,
  `FREEDOM_HEAVY_CODE_PROVIDER`, `FREEDOM_BROAD_SYNTHESIS_PROVIDER`,
  `FREEDOM_LOCAL_MODEL_COMMAND`, `FREEDOM_OPENAI_COMMAND`, `FREEDOM_CLAUDE_CODE_COMMAND`,
  `FREEDOM_VOICE_RUNTIME_PROVIDER`, and `FREEDOM_VOICE_RUNTIME_MODEL`.

### Self-Programming

- Freedom can record and surface self-programming requests.
- Approved requests do not yet flow automatically into a governed build-and-apply pipeline.

### Autonomous Research

- Freedom can identify missing information, capability gaps, and candidate follow-up work.
- The current voice runtime does not yet have a live external research toolchain, so
  self-research remains approval-gated and partially modeled rather than end-to-end operational.

## Planned / Intentionally Not Live Yet

- Autonomous self-modification without approval.
- Silent external sends.
- Memory loops that independently decide what to store, change, or act on without operator review.
- Full local model execution replacing current hosted voice runtime.
- Broad autonomous business operations without governance review.

## Guardrails That Are Live

- Governance preflight before substantial repo changes.
- High-risk project classification with `A1` autonomy.
- Explicit approval posture for irreversible or external actions.
- Trusted-recipient boundary for outbound email.
- Confirmation-gated email send flow.
- Self-programming requests persist, but do not execute themselves.

## Primary Persistence And Runtime Boundaries

- Supabase:
  control-plane schema, connect/session runtime data, durable memory, trusted email recipients,
  and email delivery audit.
- LiveKit:
  browser voice transport and data-channel signaling.
- OpenAI Realtime:
  current voice model runtime.
- Resend:
  outbound email delivery for the control-plane path.

## Best Next Uses Of Existing Capability

- Use voice for interruption-safe operating partner conversations.
- Use the Learning Registry and durable memory to inspect what Freedom is noticing repeatedly.
- Use Communications when Freedom should draft or send a governed external summary.
- Use Agent Control and Governance to inspect what is modeled versus what is approved/live.

## Most Important Gaps Before Building More

- Replace stub venture/approval/weekly-metric tools with real Supabase-backed retrieval.
- Connect modeled model-routing policy to real runtime decisions.
- Turn approved self-programming requests into a governed execution pipeline.
- Unify the older mobile/gateway email recipient store with the newer control-plane email store if a single recipient registry is desired.
