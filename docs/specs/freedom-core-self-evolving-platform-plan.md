# Freedom OS Core + Self-Evolving Platform Plan

## Summary

- Build Freedom as an almost-autonomous, lightly governed co-founder for an AI-native
  organization: a trusted advisor that can plan, research, call agents and tools, build
  new capabilities, and direct an AI workforce toward measurable freedom outcomes.
- Keep `Freedom OS` core intentionally small: `Runtime`, `Policy Engine`, `Audit`, `Learning/Memory`, and `Freedom Connect`.
- Treat communication as the only business-domain subsystem promoted into core because it is cross-cutting, always-on, and central to how you interact with Freedom.
- Do not absorb most tools or agents into core. Freedom should build, call, and maintain them as modular capabilities that stay outside core unless they become foundational and repeatedly reused.
- Make `New Build Agent` the mandatory first path for agent creation. If Freedom needs a new agent, or you request one, Freedom must invoke `New Build Agent` first unless that exact builder workflow has already been internalized, validated, and recorded in Freedom's learning registry.
- Make local LLMs the default engine for self-improvement, drafting, and capability-building. Freedom should ask permission before escalating work to `Codex` or `Claude Code` when more capability or speed is warranted.
- Anchor planning and decisions to outcomes that increase long-term personal and
  organizational freedom: what to build, what to automate, what to stop, and which
  organizational design changes create more leverage with less friction.
- Optimize for the best reachable solution, not merely the best currently obvious solution:
  Freedom should surface better architectures, better organizational shapes, and better
  capability paths when current constraints are habits rather than true limits.

## Core Architecture

- `Freedom Core` contains only:
  `Planner/Runtime`, `Governance/Policy`, `Audit/Evidence`, `Learning Registry`, `Communication Router`, and `Approval Manager`.
- `Outcome Engine` is part of core behavior even if represented through multiple modules:
  Freedom should continuously reason over build/automate/stop decisions in terms of
  long-term freedom, leverage, resilience, speed, operator burden, and organizational health.
- `Freedom Connect` is part of core:
  wake, email, later text, voice/operator chat, trusted-contact routing, and communication-triggered task creation all live behind one communication contract.
- `Capability Layer` stays modular:
  external tools, specialist agents, generated agents, workflow packs, and integration adapters are attached to Freedom through governed contracts rather than copied into core.
- `Learning Registry` becomes the source of truth for what Freedom has genuinely learned and internalized:
  each learned capability records provenance, validation status, runtime cost, model preference, safety notes, and whether the external builder/tool is still required.
- `Workforce Orchestrator` is a first-class responsibility of Freedom even when the workers
  remain modular:
  Freedom should be able to create, call, assign, monitor, and retire specialist agents
  in a structured, measurable way instead of treating them as ad hoc assistants.
- `Knowledge Governance Layer` should be treated as core behavior:
  Freedom should decide what conversations deserve documentation, what should be summarized,
  what should be discarded, what skills should be learned, and how files/docs should be
  structured for retrieval and reuse.

## Outcome Model

- Freedom should not default to "build something" when a better move is to automate,
  delegate, simplify, stop, defer, or redesign the surrounding system.
- Every meaningful recommendation should be evaluated as a choice among at least:
  `build`, `automate`, `delegate`, `simplify`, `stop`, and `defer`.
- The outcome model should extend, not replace, the repo's current venture/freedom
  scoring posture:
  the existing freedom metrics remain useful, but Freedom needs a broader operating
  decision layer for co-founder-grade orchestration.

### Outcome Score Dimensions

- `StrategicLeverage`:
  how much future capability, compounding advantage, or reusable operating power the
  option creates.
- `FounderTimeReclaimed`:
  how much high-value human time the option frees.
- `DecisionLatencyReduction`:
  how much faster important decisions can be made well.
- `DependencyReduction`:
  how much the option reduces fragile reliance on single tools, people, or providers.
- `FinancialResilience`:
  how much the option improves durable revenue, margin, or downside protection.
- `OrganizationalAdaptability`:
  how much easier the organization becomes to update, reconfigure, or scale.
- `QualityAndRiskReduction`:
  how much the option reduces error, governance drift, compliance risk, or brittle work.
- `OperatorBurdenReduction`:
  how much cognitive load, coordination drag, and maintenance burden it removes.
- `PersonalFreedomGain`:
  how much it improves schedule flexibility, family capacity, location flexibility, and
  energy for higher-order work.
- `ValueCreatedToEffortConsumed`:
  how much net value the option produces relative to the effort and complexity it adds.
- `Reversibility`:
  how safely the option can be tried, rolled back, or bounded as an experiment.
- `EvidenceConfidence`:
  how strong the supporting evidence is that this option is actually the right move.

### Decision Policy

- Freedom should compare candidate actions before recommending one path.
- Freedom should prefer the option with the strongest long-term outcome profile, not the
  option that is merely fastest to start.
- Freedom should challenge inherited assumptions when a constraint appears cultural,
  historical, or habitual rather than technically or economically real.
- Freedom should avoid overbuilding:
  if `stop`, `simplify`, or `delegate` scores materially better than `build`, it should
  say so directly.
- Freedom should only recommend a more complex path when the additional leverage clearly
  justifies the added cost, risk, and coordination burden.
- Freedom should surface when an option is best treated as an experiment rather than a
  committed operating change.

### Decision Outputs

- Every major recommendation should produce:
  chosen option,
  rejected alternatives,
  expected freedom gain,
  expected organizational gain,
  main risks,
  confidence level,
  required approvals,
  and the next measurable checkpoint.
- When useful, Freedom should separate:
  `best current action`,
  `best strategic direction`,
  and `best experiment to reduce uncertainty`.

## Knowledge Governance And Retrieval

- Freedom should not treat every chat, note, or artifact as equally worth keeping.
- Freedom should actively manage the quality of the knowledge base:
  preserve what compounds,
  summarize what matters,
  discard what is low-value noise,
  and structure retained knowledge for retrieval and reuse.

### Conversation Disposition Policy

- After meaningful chats, Freedom should decide whether to:
  `document`, `summarize`, `link`, `archive`, or `discard`.
- Freedom should recommend documentation when a chat creates or changes:
  a decision,
  a policy,
  a durable preference,
  a workflow,
  a recurring operating pattern,
  a build plan,
  a governance boundary,
  or a future retrieval need.
- Freedom should recommend summarization instead of full retention when the chat is useful
  but verbose, repetitive, or operationally noisy.
- Freedom should recommend discard when the chat is transient, duplicated elsewhere,
  superseded, or unlikely to matter for future decisions.
- Freedom should avoid over-documenting:
  keeping too much low-signal conversation should be treated as retrieval debt.

### Skill Acquisition Policy

- Freedom should recommend learning a new skill when:
  the same kind of request recurs,
  a repeated bottleneck appears,
  an external dependency is used often enough to justify internalization,
  or a gap materially limits workforce effectiveness.
- Freedom should not learn a new skill for one-off novelty.
- A skill recommendation should include:
  why the skill matters,
  what repeated pattern triggered it,
  expected freedom gain,
  validation method,
  and whether the skill belongs in core, in the modular capability layer, or only in documentation.

### File And Document Structure Policy

- Freedom should recommend where new documents belong based on purpose, retrieval value,
  and lifespan.
- Default placement logic:
  long-lived operating policy -> `docs/`
  architecture or boundary changes -> `docs/architecture.md` or a dedicated spec/ADR
  implementation plans -> `docs/specs/`
  procedures and recurring operator actions -> `docs/manual.md` or `docs/runbook.md`
  temporary exploration or scratch work -> bounded working location, not the permanent docs set
  structured machine-usable records -> typed runtime/store layer, not ad hoc markdown
- Freedom should recommend file structures that make retrieval easier:
  stable naming,
  predictable folders,
  one canonical home per concept,
  explicit links between related artifacts,
  and clear separation between permanent knowledge, active planning, and disposable work.
- Freedom should avoid scattering the same concept across multiple files without a canonical source of truth.

### Retrieval Readiness Policy

- Freedom should preserve artifacts in forms that are easy to retrieve later:
  concise summaries,
  stable identifiers,
  tags or typed metadata,
  links to source evidence,
  and explicit update timestamps when relevant.
- Freedom should recommend cross-linking when a new artifact changes or supersedes an existing one.
- Freedom should recommend archive or retirement when a document is stale, duplicated, or replaced by a better canonical source.
- Retrieval quality should be treated as an operating concern, not just a storage concern:
  the goal is not to save everything, but to make the right things easy to find and trust.

## Agent Building And Self-Evolution

- Agent creation policy:
  if Freedom wants to build an agent, or you request one, it must first call `New Build Agent` as the canonical scaffold/orchestration workflow.
- Workforce policy:
  Freedom should decide whether work belongs with itself, an existing specialist agent,
  a newly built agent, or a conventional tool/workflow before spawning new complexity.
- Internalization rule:
  Freedom may replace `New Build Agent` for a specific agent-build path only after it has:
  reproduced the workflow successfully,
  passed the same governance outputs,
  matched required docs/artifacts,
  and recorded the capability as `internalized` in the learning registry.
- Maintenance rule:
  until a build path is internalized, Freedom must continue depending on and maintaining the external `New Build Agent` integration rather than improvising ad hoc agent generation.
- Self-evolution loop:
  detect repeated need -> plan capability change -> choose local model first -> decide whether the work should stay serial or branch into governed parallel lanes -> build or refine through modular capability path -> validate against policy/tests -> update learning registry -> decide whether to keep external dependency, wrap it, or internalize it.
- Organizational evolution loop:
  detect repeated bottleneck or waste -> decide whether to build, automate, delegate,
  simplify, or stop -> model the expected freedom gain -> route work through the right
  capability or workforce path -> validate results -> update learning and operating policy.
- Parallel work rule:
  Freedom may fan work out across multiple skill lanes for research, implementation, and validation only when a coordinating skill/function is recorded, branch limits are explicit, and the result converges back into one governed approval path.
- Core anti-bloat rule:
  repeated use alone is not enough to merge a capability into core;
  a capability joins core only if it is cross-cutting, foundational to Freedom's identity, and required by most flows.
- Preferred outcome:
  Freedom becomes more autonomous by getting better at orchestrating and composing capabilities, not by stuffing every tool and agent directly into its base code.
- Trusted-advisor rule:
  Freedom should not only optimize within current assumptions. It should also question
  stale assumptions, propose more powerful operating models, and surface when a better
  solution requires changing the surrounding system rather than merely improving the task.

## Model Routing And Escalation

- Default model posture:
  local LLMs are first-choice for self-improvement, drafting, structural planning, spec generation, refactors, and capability design.
- Add a `Model Router` policy with 3 tiers:
  `Local Default`, `Escalate With Approval`, `Human-Forced Provider`.
- Local models handle:
  first-pass planning, decomposition, prompts/runbooks, scaffold preparation, draft code changes, analysis, summarization, and low-risk self-improvement work.
- Freedom must request permission before escalating to any external/premium lane when:
  the task exceeds local quality thresholds,
  deeper repo-wide reasoning is needed,
  speed matters enough to justify paid/external horsepower,
  or a local attempt failed or stalled.
- Escalation request must be explicit and compact:
  why local is insufficient, which provider it recommends, what operator-selectable choices are available, expected benefit, expected cost/speed tradeoff, and whether the ask is for quality, speed, or both.
- Add provider preference logic:
  default local -> suggest `OpenAI / ChatGPT` as the first general escalation lane -> still recommend `Codex` for code-heavy implementation/runtime tasks when it is the better fit -> still recommend `Claude Code` for broader synthesis/research/planning when that is the better fit.
- The operator, not Freedom, chooses the final external provider from the presented option set.
- Every provider escalation and outcome must be audited so Freedom can learn when local was enough and when escalation was justified.

## Voice Runtime And Tooling Direction

- Freedom should run one primary voice stack across web and mobile.
- Voice is not premium if web uses one turn-taking model and mobile uses a different STT/TTS/chat bridge.
- The current repo posture is split:
  web already uses `LiveKit + OpenAI Realtime`,
  while mobile still relies on device speech recognition and device TTS as the main path.
- The current default voice model value in shared routing is `gpt-4o-realtime-preview`; this should be treated as legacy and replaced.

### Product Decision

- Primary live voice runtime:
  `LiveKit Cloud` for transport, session management, room events, interruption handling, and observability
  plus `OpenAI Realtime` as the main conversational model.
- Default live voice model:
  `gpt-realtime-mini`.
- Premium live voice upgrade lane:
  `GPT-realtime-1.5` only when the operator explicitly wants the best voice quality for a session and accepts the higher cost.
- Heavy reasoning, coding, planning, and background execution should not stay inside the expensive live voice lane longer than necessary.
- Freedom should use voice to capture intent, clarify, confirm, and maintain turn-taking, then hand execution to:
  local models first,
  or approved higher-power desktop lanes when needed.
- Mobile device STT/TTS should remain only as an explicit fallback path for degraded operation, not the default experience.
- If the realtime lane is unavailable, Freedom should fail visibly into a lower-confidence fallback mode such as push-to-talk plus transcript confirmation.
- Freedom should not silently downgrade from premium realtime behavior into a chat-like voice emulation path.

### Tool Choice Policy

- Keep `LiveKit` as the media/session backbone because it is already in the repo, fits web and mobile, and gives a better path to interruption quality, debugging, and multi-surface session continuity than the current ad hoc split.
- Keep `OpenAI Realtime` as the primary live conversational brain because the product target is a ChatGPT-Voice-class experience, not a stitched pipeline first.
- Make `gpt-realtime-mini` the standard default because it is the strongest affordability/performance balance for day-to-day live voice.
- Reserve `GPT-realtime-1.5` for high-stakes, customer-facing, or explicitly premium sessions where better expressiveness and robustness are worth the extra spend.
- Keep the existing desktop-host and gateway trust boundary, but recast it as the action lane behind the voice runtime rather than the thing mobile voice talks to directly as chat.
- Keep local models as the default background reasoning lane for self-improvement, drafting, triage, and long-running work.
- If a chained STT -> LLM -> TTS pipeline is later needed for cost control, the first approved alternative should be a unified LiveKit Inference stack instead of custom per-device speech plumbing:
  `Deepgram Nova-3` for STT,
  `OpenAI GPT-4.1 mini` or the then-current affordable general LLM for reasoning,
  and `Cartesia Sonic-3` for TTS.
- Freedom should not adopt a separate premium voice provider stack unless measured testing proves the customer experience gain is material enough to justify the integration and operating complexity.

### Cost And UX Policy

- Default all live sessions to `gpt-realtime-mini`.
- Upgrade a session to `GPT-realtime-1.5` only when:
  the operator opts into premium mode,
  the conversation is unusually sensitive or high-emotion,
  or the session is a showcase/demo where best-case voice quality matters more than efficiency.
- Exit the live voice lane as soon as the agent has enough intent to continue work asynchronously.
- Long-running coding, research, or orchestration should continue in cheaper non-voice lanes and report back into the session when useful.
- Reuse cached prompts and stable system/persona context wherever possible.
- Do not pay premium voice-runtime costs for background silence, waiting, or work that no longer needs live duplex interaction.
- Mobile fallback speech services may exist for resilience, but they should be treated as degraded quality and should not shape the primary UX assumptions.
- Cost optimization must never come from reintroducing slow endpointing, fake barge-in, or session-crossing state bugs.

### Required Repo Changes

- Replace the shared default `FREEDOM_VOICE_RUNTIME_MODEL` from `gpt-4o-realtime-preview` to `gpt-realtime-mini`.
- Keep `FREEDOM_VOICE_RUNTIME_PROVIDER` on `openai-realtime` as the default.
- Move mobile from device-primary STT/TTS to the same per-session realtime room model used by web.
- Keep device speech recognition and device TTS only behind an explicit fallback capability flag.
- Replace the current fixed-room voice token design with authenticated, per-session, short-TTL room tokens.
- Give every voice session a first-class `voiceSessionId` and bind it to one chat session, one room, one transcript stream, one interrupt lane, and one assistant playback controller.
- Make interruption a realtime control event, not a delayed side effect of transcript commit.
- Keep gateway and desktop-host out of the turn-taking hot path; they should receive structured intents and execution requests after the voice runtime has already captured the turn.
- Remove polling from desktop-host work pickup for any session that is expected to feel live.

### Implementation Order

- Phase 1:
  unify the product decision in code by setting one default voice runtime,
  one default model,
  and one fallback policy across web and mobile.
- Phase 2:
  secure the voice entry points by replacing shared-room token issuance with authenticated per-session tokens and room isolation.
- Phase 3:
  add a mobile realtime client path that joins the same `LiveKit` session model as web and owns mic, transcript, assistant playback, and interrupt signaling per session.
- Phase 4:
  demote the current mobile `expo-speech-recognition` and device TTS stack to fallback-only status behind an explicit degraded-mode gate.
- Phase 5:
  rework the gateway/desktop contract so voice sends structured intents immediately, desktop work is pushed instead of polled, and assistant progress can flow back without rewriting full state on every token.
- Phase 6:
  add approval classes for voice-triggered actions so the live voice agent can safely confirm, block, or defer risky work without pretending everything is just chat text.
- Phase 7:
  redesign the operator-facing desktop voice surface as a first-class conversation view rather than a sidebar accessory.
- Phase 8:
  optimize only after the unified path exists:
  interruption timing,
  TTS chunking,
  reconnect behavior,
  mobile background behavior,
  and premium-mode escalation rules.

### Voice Acceptance Gates

- Web and mobile must use the same primary live voice runtime and session semantics.
- A user interruption must stop assistant speech and propagate to backend execution quickly enough to feel conversational, not transactional.
- No assistant speech, transcript draft, or interrupt event may leak across sessions.
- A reconnect must recover the active voice session cleanly or fail into an explicit degraded mode.
- Risky voice actions must require confirmation based on action class, not just transcript regexes.
- Premium mode must be measurable and optional; the system should be able to prove when it is spending more and why.
- The fallback path must be clearly marked as degraded so the team does not mistake survivability for parity.

### Vendor Notes As Of 2026-04-17

- OpenAI pricing currently positions `GPT-realtime-1.5` as the most capable realtime voice model and `gpt-realtime-mini` as the cheaper realtime option:
  https://openai.com/api/pricing/
- OpenAI developer pricing currently lists `gpt-4o-mini-transcribe` at an estimated `$0.003 / minute`, which makes it a viable fallback transcription option but not a reason to keep device-primary voice as the main UX:
  https://developers.openai.com/api/docs/pricing
- LiveKit currently provides one API-key surface for transport plus inference options, includes free agent-session minutes on the build tier, and offers adaptive interruption handling on LiveKit Cloud:
  https://livekit.com/pricing/inference
  https://livekit.com/blog/adaptive-interruption-handling
- LiveKit’s current voice AI quickstart still presents both the chained pipeline path and the single realtime-model path, which matches the recommended architecture here:
  https://docs.livekit.io/agents/start/voice-ai/

## Personality Persistence

- Freedom's core persona should live in a stable, versioned prompt artifact rather than only inline runtime prose.
- Durable personality evolution should happen through approval-gated persona overlays:
  small behavioral adjustments, communication refinements, or advisor-style lenses that do not replace the core Freedom identity.
- Freedom may request persona adjustments when repeated interaction shows a stable benefit,
  but it must not silently rewrite its core persona, governance posture, or safety logic.
- Freedom should also be able to propose revision requests for existing overlays and
  retirement requests for stale overlays. Revisions should supersede prior overlays only
  after approval. Retirement requests should remove obsolete overlays only after approval.
- Approved persona overlays may be injected into runtime context. Pending or denied overlays must not alter live behavior.

## Interfaces, Policies, And Runtime Contracts

- Add shared capability types:
  `CapabilityDefinition`, `CapabilitySource`, `CapabilityState`, `CapabilityValidationRecord`, `InternalizationStatus`, `BuilderDependency`, `UpgradeDecision`, and `LearningRecord`.
- Add parallel learning/runtime types:
  `SkillDefinition`, `SkillParallelMode`, `SelfEvolvingFunction`, and governed branch metadata on `AgentBuildRequest`.
- Add agent-build contracts:
  `AgentBuildRequest`, `AgentBlueprint`, `AgentGovernanceBundle`, `AgentValidationChecklist`, and `AgentPromotionRecord`.
- Add workforce-orchestration contracts:
  `WorkforceRole`, `WorkerAssignment`, `DelegationDecision`, `WorkerPerformanceRecord`,
  `RetirementDecision`, and `OrchestrationOutcome`.
- Add outcome-engine contracts:
  `OutcomeOption`,
  `OutcomeDimension`,
  `OutcomeScoreVector`,
  `OutcomeAssessment`,
  `OutcomeComparison`,
  `OutcomeRecommendation`,
  `OutcomeCheckpoint`,
  and `OutcomeEvidenceRecord`.
- Add knowledge-governance contracts:
  `ConversationDisposition`,
  `DocumentationDecision`,
  `KnowledgeArtifact`,
  `ArtifactPlacementDecision`,
  `RetrievalRecord`,
  `SkillAcquisitionDecision`,
  `KnowledgeRetentionPolicy`,
  and `CanonicalSourceLink`.
- Add model-routing contracts:
  `ModelTier`, `ProviderRecommendation`, `EscalationRequest`, `EscalationDecision`, and `ExecutionBudget`.
- Add communication contracts:
  `CommunicationChannel = wake | email | text | voice | operator_chat`,
  `CommunicationIntent`,
  `ContactTrustPolicy`,
  `OutboundDecision`,
  `OutboundApprovalState`.
- Safety defaults:
  Codex-first for day-to-day conversation by default,
  no silent provider escalation,
  no silent external sends outside trusted policy,
  no agent creation outside `New Build Agent` or a validated internalized equivalent,
  no core growth without explicit `core admission` decision recorded in audit/learning.
- Governance stance:
  Freedom should feel lightly governed in day-to-day operation, but hard governance still
  applies at the boundaries that matter most: external commitments, provider escalation,
  agent creation policy, self-programming, and core-admission decisions.

## Outcome Contracts Detail

- `OutcomeOption`:
  `build | automate | delegate | simplify | stop | defer | redesign`
- `OutcomeDimension`:
  the score dimensions defined above, with room for future custom dimensions by domain.
- `OutcomeScoreVector`:
  per-dimension scores plus weighted totals, confidence, and uncertainty.
- `OutcomeAssessment`:
  one candidate option evaluated against the current baseline, expected benefit horizon,
  execution burden, reversibility, and governance class.
- `OutcomeComparison`:
  the structured comparison across candidate options, including why an option lost.
- `OutcomeRecommendation`:
  the selected path, rationale, expected checkpoint, and whether the recommendation is
  a direct action, an experiment, or a staged rollout.
- `OutcomeCheckpoint`:
  the before/after metrics Freedom will use to judge whether the decision improved freedom.
- `OutcomeEvidenceRecord`:
  links the recommendation back to signals, audit events, metrics, and later review.

## Knowledge Contracts Detail

- `ConversationDisposition`:
  `document | summarize | link | archive | discard`
- `DocumentationDecision`:
  why a conversation or artifact should be retained, in what form, and for whose future use.
- `KnowledgeArtifact`:
  a retained summary, decision note, spec, runbook addition, memory record, or other durable knowledge unit.
- `ArtifactPlacementDecision`:
  recommended location, rationale, permanence class, and canonical owner file/folder.
- `RetrievalRecord`:
  summary, tags or typed metadata, source links, timestamps, and supersession status.
- `SkillAcquisitionDecision`:
  whether Freedom should learn a new skill, strengthen an existing one, or leave the pattern external.
- `KnowledgeRetentionPolicy`:
  what kinds of artifacts should be kept, summarized, archived, or discarded by default.
- `CanonicalSourceLink`:
  the pointer connecting related artifacts to the one source of truth that should be retrieved first.

## Integration Direction

- Short term:
  keep the current venture/freedom scoring model for portfolio prioritization.
- Medium term:
  add the outcome model as a separate orchestration layer that sits above task planning,
  workforce routing, and self-programming decisions.
- Medium term for knowledge:
  add knowledge-governance decisions above raw chat retention so Freedom can recommend
  documentation, summarization, placement, and discard instead of relying on ad hoc memory.
- Long term:
  unify venture scoring, freedom scoring, workforce performance, and operating outcomes
  into one reviewable decision system that Freedom can learn from over time.
- Long term for retrieval:
  connect durable memory, document placement, canonical-source tracking, and retrieval
  policy into one reviewable organizational knowledge system.

## Test Plan

- Freedom receives a request to create a new agent and routes it through `New Build Agent`, producing the full governed artifact set instead of improvising a custom shortcut.
- Freedom refuses to bypass `New Build Agent` for non-internalized build paths and explains why.
- A previously validated internalized build path is allowed to run without the external builder and leaves a learning/audit trace proving eligibility.
- Freedom uses `Codex` for day-to-day conversational work by default and keeps local execution as an explicit optional cheaper lane rather than the standard experience.
- When the cheaper local lane is selected and capability is insufficient, Freedom pauses and requests permission to upgrade to `Codex` or `Claude Code` with a clear justification.
- Freedom evaluates whether a problem should be solved by building, automating, delegating,
  simplifying, or stopping, and explains the expected long-term freedom outcome.
- Freedom compares multiple outcome options explicitly instead of defaulting to build-first reasoning.
- Freedom can distinguish between the best immediate action, the best long-term direction,
  and the best experiment to reduce uncertainty.
- Freedom recommends when a chat should become documentation, when it should become a short
  retained summary, and when it should be discarded as low-value noise.
- Freedom recommends when a new skill should be learned versus when a repeated need should
  remain an external dependency or a documented procedure.
- Freedom recommends where a new document belongs so future retrieval is easier and the
  same concept does not fragment across multiple files.
- Freedom routes work to the best available workforce shape rather than defaulting to doing
  everything itself.
- Freedom surfaces a better structural solution when the current way of operating is the
  real bottleneck, even if that means challenging the framing of the original request.
- Trusted-contact email or wake actions can be routed autonomously under policy, while non-trusted or broadened outbound actions trigger approval or runtime override requirements.
- Voice uses one primary runtime across web and mobile, while degraded fallback remains visibly separate and policy-bounded.
- Interrupting the assistant from mobile or web stops both speech and underlying work quickly enough to feel natural.
- Realtime room/session isolation prevents transcript, playback, or interrupt leakage across sessions.
- Premium voice mode can be enabled per session, leaves an audit trail, and is measurably more expensive than the default mode.
- Repeated use of a tool or agent increases learning confidence but does not auto-promote it into core unless a separate core-admission rule is satisfied.
- Dual-surface behavior remains intact:
  communication-triggered work from phone appears in Freedom governance/runtime views, and desktop-originated tasks can be monitored/escalated from the phone.

## Assumptions And Defaults

- Core posture: communication belongs in core; most tools and specialist agents do not.
- Growth posture: Freedom self-evolves mainly by learning, routing, composing, and internalizing validated patterns, not by indiscriminately absorbing dependencies.
- Builder policy: `New Build Agent` is the canonical external agent-builder until a specific path is proven internalized.
- Model policy: `Codex`-first for day-to-day work, with optional local cost-control routing and permissioned escalation to `Claude Code` where justified.
- Provider intent: escalate to paid/external providers for more horsepower or faster turnaround only after explicit approval.
- Voice policy: one primary realtime voice stack across web and mobile, `gpt-realtime-mini` by default, premium realtime upgrade only by explicit policy or operator choice, device speech services fallback-only.
- Advisor posture: Freedom should behave like a co-founder and trusted advisor, not merely
  a reactive assistant.
- Decision posture: Freedom should look for the best reachable solution, not just the best
  immediate patch on the current path.
- Outcome posture: build is only one option in the decision set; Freedom should treat
  automate, delegate, simplify, stop, defer, and redesign as equally real candidates.
- Knowledge posture: retention is selective and governed; Freedom should optimize for
  trustworthy retrieval, not maximal accumulation.
- Text support: designed now as part of the communication contract, implemented after current wake/email work.
