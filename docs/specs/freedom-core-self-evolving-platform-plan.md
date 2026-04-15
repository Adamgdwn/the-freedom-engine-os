# Freedom OS Core + Self-Evolving Platform Plan

## Summary

- Keep `Freedom OS` core intentionally small: `Runtime`, `Policy Engine`, `Audit`, `Learning/Memory`, and `Freedom Connect`.
- Treat communication as the only business-domain subsystem promoted into core because it is cross-cutting, always-on, and central to how you interact with Freedom.
- Do not absorb most tools or agents into core. Freedom should build, call, and maintain them as modular capabilities that stay outside core unless they become foundational and repeatedly reused.
- Make `New Build Agent` the mandatory first path for agent creation. If Freedom needs a new agent, or you request one, Freedom must invoke `New Build Agent` first unless that exact builder workflow has already been internalized, validated, and recorded in Freedom's learning registry.
- Make local LLMs the default engine for self-improvement, drafting, and capability-building. Freedom should ask permission before escalating work to `Codex` or `Claude Code` when more capability or speed is warranted.

## Core Architecture

- `Freedom Core` contains only:
  `Planner/Runtime`, `Governance/Policy`, `Audit/Evidence`, `Learning Registry`, `Communication Router`, and `Approval Manager`.
- `Freedom Connect` is part of core:
  wake, email, later text, voice/operator chat, trusted-contact routing, and communication-triggered task creation all live behind one communication contract.
- `Capability Layer` stays modular:
  external tools, specialist agents, generated agents, workflow packs, and integration adapters are attached to Freedom through governed contracts rather than copied into core.
- `Learning Registry` becomes the source of truth for what Freedom has genuinely learned and internalized:
  each learned capability records provenance, validation status, runtime cost, model preference, safety notes, and whether the external builder/tool is still required.

## Agent Building And Self-Evolution

- Agent creation policy:
  if Freedom wants to build an agent, or you request one, it must first call `New Build Agent` as the canonical scaffold/orchestration workflow.
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
- Parallel work rule:
  Freedom may fan work out across multiple skill lanes for research, implementation, and validation only when a coordinating skill/function is recorded, branch limits are explicit, and the result converges back into one governed approval path.
- Core anti-bloat rule:
  repeated use alone is not enough to merge a capability into core;
  a capability joins core only if it is cross-cutting, foundational to Freedom's identity, and required by most flows.
- Preferred outcome:
  Freedom becomes more autonomous by getting better at orchestrating and composing capabilities, not by stuffing every tool and agent directly into its base code.

## Model Routing And Escalation

- Default model posture:
  local LLMs are first-choice for self-improvement, drafting, structural planning, spec generation, refactors, and capability design.
- Add a `Model Router` policy with 3 tiers:
  `Local Default`, `Escalate With Approval`, `Human-Forced Provider`.
- Local models handle:
  first-pass planning, decomposition, prompts/runbooks, scaffold preparation, draft code changes, analysis, summarization, and low-risk self-improvement work.
- Freedom must request permission before escalating to `Codex` or `Claude Code` when:
  the task exceeds local quality thresholds,
  deeper repo-wide reasoning is needed,
  speed matters enough to justify paid/external horsepower,
  or a local attempt failed or stalled.
- Escalation request must be explicit and compact:
  why local is insufficient, which provider it recommends, expected benefit, expected cost/speed tradeoff, and whether the ask is for quality, speed, or both.
- Add provider preference logic:
  default local -> prefer `Codex` for code-heavy implementation/runtime tasks -> prefer `Claude Code` for broader synthesis/research/planning when that is the better fit.
- Every provider escalation and outcome must be audited so Freedom can learn when local was enough and when escalation was justified.

## Interfaces, Policies, And Runtime Contracts

- Add shared capability types:
  `CapabilityDefinition`, `CapabilitySource`, `CapabilityState`, `CapabilityValidationRecord`, `InternalizationStatus`, `BuilderDependency`, `UpgradeDecision`, and `LearningRecord`.
- Add parallel learning/runtime types:
  `SkillDefinition`, `SkillParallelMode`, `SelfEvolvingFunction`, and governed branch metadata on `AgentBuildRequest`.
- Add agent-build contracts:
  `AgentBuildRequest`, `AgentBlueprint`, `AgentGovernanceBundle`, `AgentValidationChecklist`, and `AgentPromotionRecord`.
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

## Test Plan

- Freedom receives a request to create a new agent and routes it through `New Build Agent`, producing the full governed artifact set instead of improvising a custom shortcut.
- Freedom refuses to bypass `New Build Agent` for non-internalized build paths and explains why.
- A previously validated internalized build path is allowed to run without the external builder and leaves a learning/audit trace proving eligibility.
- Freedom uses a local model for self-improvement work by default and completes the task without provider escalation when quality thresholds are met.
- When local capability is insufficient, Freedom pauses and requests permission to upgrade to `Codex` or `Claude Code` with a clear justification.
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
- Text support: designed now as part of the communication contract, implemented after current wake/email work.
