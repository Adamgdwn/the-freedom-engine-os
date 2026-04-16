# Current Capabilities

Last updated: 2026-04-15

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
- Shared app shell with a sidebar voice panel and mobile voice FAB.
- Seeded but navigable venture, workflow, governance, approval, execution, and
  recommendation views.

### Voice Runtime

- LiveKit WebRTC browser voice session.
- OpenAI Realtime worker (`gpt-4o-realtime-preview`) in Python.
- Model-level interrupt support through LiveKit data messages.
- UI-visible voice states: `idle`, `connecting`, `listening`, `processing`,
  `speaking`, `error`.
- Mic mute on assistant playback to prevent assistant self-hearing.
- Park-and-resume task threads surfaced in the sidebar panel.
- Transcript and state updates streamed back into the browser UI.

### Persistent Memory

- Durable storage of parked voice tasks.
- Durable storage of learning signals from conversation.
- Durable storage of approval-gated self-programming requests.
- Supabase-backed server-side memory load and persist path.
- Local backup and restore of memory tables through:
  `npm run backup:freedom-memory`
  `npm run restore:freedom-memory -- --input=...`

### Partner Behavior

- Unified Freedom prompt across browser/runtime and Python worker.
- On-task redirection posture.
- Durable learning capture during voice sessions.
- Approval-gated self-programming requests that stop before execution.

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

## Modeled But Not Fully Operational

### Portfolio Data

- Venture, approval, workflow, policy, and recommendation data are still primarily
  seeded/model data in the control plane rather than fully Supabase-backed runtime queries.

### Multi-Agent Workforce

- Agent roles, skill definitions, self-evolving functions, capability definitions,
  escalation requests, and builder routing exist in the model/control-plane layer.
- They are not yet a fully autonomous, continuously running multi-agent orchestration layer.

### Model Routing

- Model Router policy and escalation views exist.
- Full live runtime model selection based on those policies is not yet wired end to end.

### Self-Programming

- Freedom can record and surface self-programming requests.
- Approved requests do not yet flow automatically into a governed build-and-apply pipeline.

## Planned / Intentionally Not Live Yet

- Autonomous self-modification without approval.
- Silent external sends.
- Memory loops that independently decide what to store, change, or act on without operator review.
- Full local-first model execution replacing current hosted voice runtime.
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
