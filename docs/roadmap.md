# Roadmap

Document status: active design

For the consolidated dated list of currently known deficiencies, see
[Known Deficiencies (2026-04-25)](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/known-deficiencies-2026-04-25.md:1).

## Done (as of 2026-04-15)

- V1 control plane: venture registry, scoring, workflow lab, governance, evidence room,
  weekly review, recommendation engine
- Supabase schema and migrations applied; persistence boundary in place
- Freedom Connect surfaces: desktop shell + mobile companion session identity, connect
  events, governed builder routing, outbound approval policy
- Voice Layer Phase 1: LiveKit WebRTC + OpenAI Realtime, mic-mute self-interruption fix,
  model-level interrupt path, in-memory parked task threads, operator voice console /
  mobile voice dock, Python agent scaffold
- Freedom Core Phase 2 type contracts: capability layer, agent-build contracts,
  model routing, `CommunicationChannel`
- Learning Registry surface: capability internalization status, validation records,
  builder dependencies, safety notes, learning history
- Model Router surface: tier policy, escalation request queue, provider preference order,
  operator provider-choice set, and resolved decision audit trail
- Monorepo consolidation: the legacy companion repo absorbed into
  `the-freedom-engine-os`; `@freedom/*` packages native to this repo; `monorepo-merge`
  merged to `main`
- Android Gradle build fixed for npm workspaces; APK (68 MB) built and verified from
  `npm run build:android-release`
- Full runtime cutover: gateway, desktop-host, and Electron shell now running from
  `the-freedom-engine-os`; install page at `pop-os.taildcb5c5.ts.net:43111/install`
  serves the Freedom Engine OS APK; the retired companion repo is no longer used
- Mobile voice stabilization + orchestration pass: STT pauses during TTS, Android
  restart timing tightened, hot voice switching added, Freedom Voice mobile surface
  refreshed, interrupt classification added, and gateway/desktop-host now schedule
  bounded parallel task work instead of a single blocking run
- Operator workspace refresh:
  desktop control plane is now a denser workbench and the Android shell now matches the
  command-and-capture voice posture more closely, with `Start`, `Talk`, and the hidden
  utility sheet replacing the older dashboard-style phone shell
- Conversational voice profile control:
  Freedom can now save live voice preferences for preset voice, gender presentation,
  accent hints, tone, warmth, and pace from conversation, and the Android companion
  now distinguishes the live realtime voice from the phone's fallback spoken-reply voice

## Now

- verify APK sideload on device and confirm voice + gateway pairing work end-to-end
- validate conversational voice-profile updates end to end: review current profile,
  save a new one in voice, restart the session, and confirm the next live voice uses
  the expected preset mapping
- run real-device Android acceptance for start voice, assistant playback, interrupt,
  mute/unmute, post-TTS resume, voice switching, and safe multi-task handling
- validate control-plane web voice against LiveKit/OpenAI in-browser: explicit interrupt,
  processing/speaking state transitions, parked-task updates, and resumed review offers
- validate conversation-learning behavior: durable learning signals appear in-session,
  focus redirection stays concise, and self-programming requests stop at approval
- verify Supabase-backed memory survives reloads and that local backup/restore captures
  learning signals, parked tasks, and self-programming requests cleanly
- validate the new approval-gated autonomy loop: open-task review, side-question handling,
  topic-shift parking, and duplicate self-programming suppression behave consistently
- validate the new personality layering: the stable core prompt stays intact, approved
  persona overlays load correctly, and pending persona-adjustment requests do not silently change behavior
- validate overlay lineage and retirement behavior so approved revisions supersede the prior
  overlay cleanly and approved retirement requests remove stale refinements without drifting the core persona
- validate the new Personality review surface end to end: Freedom-originated overlay
  requests appear in the UI, operator approvals activate them, and retire actions remove
  them from runtime context cleanly
- design the next voice-first identity layer: operator voice recognition, trusted-speaker
  filtering in shared rooms, and a wake phrase path such as "Freedom, it's Adam"
- define and validate the outcome model for build / automate / delegate / stop decisions
  so Freedom is optimizing for long-term personal and organizational freedom rather than
  just local task completion
- turn the outcome model into concrete TypeScript contracts and seed/control-plane views so
  recommendations can show scored alternatives instead of a single unstructured answer
- define the knowledge-governance model for chat disposition, skill-acquisition decisions,
  document placement, and retrieval readiness so Freedom can manage knowledge quality deliberately
- wire live Supabase persistence to replace seeded data (ventures, approvals, executions)
- connect AI Consulting Build metrics and workflow exceptions into the evidence room
- activate voice agent tools (`top_venture_status`, `pending_approvals`, `weekly_metrics`)
  against live Supabase data instead of stubs

## From Conversations To Be Done On Pop!_OS

This section is the dedicated bridge between app conversation and real implementation
work on the desktop build lane. Every serious idea that needs a programming or systems
session should land here before it becomes active execution.

Runtime note:

- the first live routing loop is now in place:
  the voice runtime can persist structured build-lane items,
  the mobile companion can read them,
  and the desktop agent-control queue can prefer them over seeded examples

Status legend:

- `Conversation capture`:
  the idea is real, but still needs business framing
- `Needs approval`:
  Freedom recommends the work, but execution scope is not yet authorized
- `Approved for discovery`:
  Freedom may research, spec, estimate, and architecture the work
- `Approved for build`:
  Freedom may execute the local Pop!_OS programming session inside approved bounds
- `Approved for release`:
  Freedom may ship or publish through the allowed release path
- `Blocked`:
  waiting on Adam, a credential, an external dependency, or a policy decision

- `Conversation build lane + reporting path`
  Status: `Approved for discovery`
  Objective: turn app conversations into governed Pop!_OS implementation work with a
  clear audit trail, approval state, reporting path, and next checkpoint
  Business case: makes Freedom more scalable, more autonomous, and less likely to
  drift into voice-assistant behavior
  Next checkpoint: wire roadmap/spec/process records so build candidates can be
  promoted from conversation into execution with explicit status and ownership

- `Connector authority pack`
  Status: `Needs approval`
  Objective: define governed access posture for GitHub, Supabase, Vercel, LiveKit,
  OpenAI, Claude, Codex, and local LLM runtimes so Freedom can modify and create real
  systems independently inside approved boundaries
  Business case: reduces operator bottlenecks and makes real autonomous execution
  possible instead of only planning
  Next checkpoint: finalize which credentials and permissions Freedom should hold,
  what actions are autonomous, and what still requires explicit release approval

- `Electrical contractor intake app opportunity`
  Status: `Conversation capture`
  Objective: evaluate and possibly build a customer intake and estimating app for an
  electrical contracting company
  Business case: potential immediate service revenue plus a reusable vertical product
  if the intake, triage, and estimate flow generalizes to other contractors
  Next checkpoint: produce a founder-grade opportunity memo covering:
  one-off build vs repeatable product,
  likely build cost,
  sale price,
  subscription vs one-time pricing,
  support burden,
  expansion potential,
  and the first thin technical slice

- `Executive business-case workbench for new builds`
  Status: `Approved for discovery`
  Objective: standardize how Freedom evaluates new app, tool, and agent opportunities
  from the voice surface before implementation starts
  Business case: raises build quality, pricing discipline, and reuse thinking across
  all future ventures and client work
  Next checkpoint: turn the electrical-app example into a reusable evaluation template
  for future `New Build` conversations

## Next

- Learning Registry: promote seed data to live capability tracking backed by Supabase
- Model Router: wire escalation request + decision flow so Freedom can surface live
  approval requests in the UI, recommend a provider, and stop for operator selection of
  `OpenAI / ChatGPT`, `Codex`, or `Claude Code`
- Workforce orchestration: add governed contracts, runtime flows, and review surfaces so
  Freedom can assign work across specialist agents and tools as a measurable agent workforce
- Outcome Engine: connect the new outcome contracts to venture scoring, recommendation
  generation, and workforce-routing decisions
- Knowledge Governance: add contracts, storage, and review surfaces so Freedom can
  recommend what to document, summarize, archive, discard, and where durable artifacts belong
- add transcript-based evals for the Freedom partner loop so parking, learning capture,
  approval-gated self-programming, and email drafting can be regression-tested
- add evals for personality persistence and self-correction so Freedom's core stance stays
  stable while approved persona overlays can refine behavior without drifting governance
- add evals for “best solution” behavior so Freedom can challenge stale framing and propose
  stronger organizational or systems-level solutions when appropriate
- add evals for documentation and retrieval behavior so Freedom can justify preserving,
  summarizing, discarding, or re-homing knowledge artifacts consistently
- Authenticated access and role-aware approval flows
- Persist score-weight versions, approvals, overrides, and weekly reviews
- Connect PDF Flow metrics directly into evidence room
- Expand recommendation quality with evidence freshness and experiment outcomes

## Later

- Voice Layer Phase 2: memory loops, autonomy hooks, deeper resource-aware concurrency,
  Supabase-backed tool implementations
- promote conversation learning from durable memory into richer retrieval, review, audit,
  and rollback controls
- add live external research tools plus governed retrieval policy so Freedom can become
  a self-researching partner without bluffing unsupported capabilities
- raise Freedom from operator partner to co-founder-grade agentic OS by connecting outcome
  modeling, workforce orchestration, approved self-programming, and governed organizational redesign loops
- connect knowledge governance to durable memory, document structure, and retrieval so
  Freedom can steward an evolving organizational knowledge base instead of just accumulating chats
- Self-evolving function runtime: live branch fan-out with governed convergence
- Multi-tenant internal venture studio support
- Governed external-facing surfaces after internal operating confidence is high
