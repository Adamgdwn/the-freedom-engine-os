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
  local-first by default,
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
- Freedom uses a local model for self-improvement work by default and completes the task without provider escalation when quality thresholds are met.
- When local capability is insufficient, Freedom pauses and requests permission to upgrade to `Codex` or `Claude Code` with a clear justification.
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
- Repeated use of a tool or agent increases learning confidence but does not auto-promote it into core unless a separate core-admission rule is satisfied.
- Dual-surface behavior remains intact:
  communication-triggered work from phone appears in Freedom governance/runtime views, and desktop-originated tasks can be monitored/escalated from the phone.

## Assumptions And Defaults

- Core posture: communication belongs in core; most tools and specialist agents do not.
- Growth posture: Freedom self-evolves mainly by learning, routing, composing, and internalizing validated patterns, not by indiscriminately absorbing dependencies.
- Builder policy: `New Build Agent` is the canonical external agent-builder until a specific path is proven internalized.
- Model policy: local-first, permissioned escalation to `Codex` or `Claude Code`.
- Provider intent: escalate to paid/external providers for more horsepower or faster turnaround only after explicit approval.
- Advisor posture: Freedom should behave like a co-founder and trusted advisor, not merely
  a reactive assistant.
- Decision posture: Freedom should look for the best reachable solution, not just the best
  immediate patch on the current path.
- Outcome posture: build is only one option in the decision set; Freedom should treat
  automate, delegate, simplify, stop, defer, and redesign as equally real candidates.
- Knowledge posture: retention is selective and governed; Freedom should optimize for
  trustworthy retrieval, not maximal accumulation.
- Text support: designed now as part of the communication contract, implemented after current wake/email work.
