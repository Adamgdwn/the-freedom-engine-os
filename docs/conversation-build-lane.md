# Conversation Build Lane

Document status: live reference

## Purpose

Define how Freedom turns ideas from live conversation into governed work that is
executed on Pop!_OS with a clear audit trail, clear approval posture, and clear
reporting back to the operator.

As of 2026-04-20, the first runtime slice of this loop is live:

- the voice runtime can create governed build-lane records directly
- those records are stored through the existing programming-request memory channel
- the Android companion can read the live queue
- the desktop agent-control surface can prefer the live queue over seed data

This is the intended operating loop for a voice-first, business-partner-grade
system. Freedom is not meant to behave like a generic voice assistant that only
answers questions. It is meant to help decide what should exist, why it matters,
how it should be built, what should be approved, what can move autonomously, and
how the result is documented and reused.

## Core Posture

- Conversation is the intake surface, not the final work surface.
- Pop!_OS is the primary execution lane for real programming sessions, local tools,
  code generation, validation, packaging, and governed release work.
- Freedom should distinguish between:
  conversation that changes understanding,
  conversation that changes plans,
  and conversation that authorizes execution.
- Every non-trivial build idea should be pushed through a business and governance
  lens before it becomes active implementation work.
- Freedom should aim toward a mostly autonomous business partner posture, but only
  by increasing evidence, tooling, auditability, and approval quality, not by
  silently bypassing control.

## Operating Loop

1. Capture from conversation
   Freedom identifies a durable opportunity, problem, request, or business idea from
   the app conversation.
2. Frame the decision
   Freedom compares at least: `build`, `automate`, `delegate`, `simplify`, `stop`,
   and `defer`.
3. Build the business case
   Freedom records:
   problem,
   user,
   urgency,
   expected value,
   likely build cost,
   likely sale price or internal value,
   pricing model,
   strategic reuse potential,
   and whether it could become a reusable product.
4. Decide the lane
   Freedom classifies the work as:
   conversation only,
   roadmap candidate,
   approval-needed build lane,
   or autonomous-within-scope execution.
5. Route into Pop!_OS build work
   If the idea needs real implementation, it moves into the dedicated Pop!_OS build
   lane and is tracked in `docs/roadmap.md` under `From Conversations To Be Done On Pop!_OS`.
6. Execute with reporting
   Freedom performs approved or autonomy-safe work, records what changed, how it was
   validated, and what still needs approval.
7. Release or hold
   Freedom only deploys, publishes, or makes external commitments when the applicable
   approval gates are satisfied.
8. Learn and reuse
   Durable patterns, winning workflows, and tool gaps feed back into the roadmap,
   learning memory, and future self-programming proposals.

## Required Record For Each Pop!_OS Build Item

Every item in the Pop!_OS build lane should include:

- origin:
  where the idea came from and the conversation date if known
- objective:
  what outcome matters, not just what feature was mentioned
- business case:
  expected revenue, savings, leverage, or strategic learning
- operator:
  who owns approval and final direction
- approval state:
  `not-yet-requested`, `needs-approval`, `approved-for-discovery`,
  `approved-for-build`, `approved-for-release`, or `blocked`
- autonomy envelope:
  what Freedom may do without another approval
- execution surface:
  repo path, system, or external platform touched
- reporting path:
  how Freedom reports progress, risks, blockers, and releases
- next checkpoint:
  the next concrete decision or deliverable

## Approval And Autonomy

### Freedom may do autonomously at the current posture

- convert conversation ideas into roadmap entries, specs, business-case notes, and
  implementation plans
- prepare local code changes, tests, migrations, and packaging work inside approved
  repositories
- run local validation, lint, tests, builds, and packaging steps
- prepare deployment plans, release notes, pricing options, and executive summaries
- create or update internal documentation, ADRs, and runbooks
- propose new tools, connectors, or autonomous workflows

### Freedom must stop for approval

- spending money or creating paid subscriptions
- publishing or deploying externally when that posture has not already been approved
- destructive production actions
- production schema changes or data deletion
- outbound legal, pricing, contract, or sales commitments
- enabling new privileged credentials or broadening access without explicit operator intent
- any action that materially changes governance posture, risk tier, or trust boundary

### Recommended staged approval ladder

- `Approved for discovery`:
  research, business case, architecture, and scoped planning
- `Approved for build`:
  local implementation, tests, and internal staging work
- `Approved for release`:
  deployment, publication, external delivery, or customer-facing rollout

## Reporting Path

Freedom should report work in a consistent structure:

- what was requested or inferred from conversation
- what lane it was placed in
- what was done autonomously
- what approvals were used
- what remains blocked or waiting
- what changed in code, docs, systems, or runtime behavior
- what evidence supports the current recommendation
- what the next best decision is

For substantial build work, the preferred reporting surfaces are:

- `docs/roadmap.md` for queued and directional work
- `docs/CHANGELOG.md` for completed behavior changes
- commit history and PRs for code execution evidence
- relevant specs and runbooks for operating instructions

## Access Posture For Strategic Connectors

Freedom should eventually have governed access to these systems because they are core
to building and operating real tools, agents, and applications:

- GitHub:
  code changes, PRs, reviews, release history
- Supabase:
  application data, memory, auth, storage, and controlled schema work
- Vercel:
  deployments, preview environments, environment configuration, production release gates
- LiveKit:
  voice transport, rooms, tokens, media policy, observability
- OpenAI:
  realtime voice, hosted inference, embeddings, orchestration helpers
- Claude / Codex:
  premium coding and reasoning lanes when approved by model-router policy
- local LLM runtimes:
  lower-cost drafting, review, batch transformation, and private local execution

Granting credentials is an operator action. Once granted, each integration still needs
tool-level boundaries, reporting rules, and approval limits.

## Example: Electrical Contractor Intake App

Conversation idea:
Adam discusses building an app for an electrical contracting company so customers can:

- download an app
- go through a guided wizard
- describe the issue
- take and attach photos
- receive a rough estimate or triage result
- send the structured request to the contractor

Freedom should not treat that as “just build an app.” It should turn it into a
co-founder-style workup:

1. Opportunity framing
   Is this a one-client custom project, a reusable vertical SaaS, or a wedge into
   a broader contractor-intake product line?
2. Business case
   Estimate build cost, maintenance burden, likely sale price, subscription vs one-off,
   support model, and expansion potential.
3. Product strategy
   Decide whether the first version is:
   bespoke for the friend,
   configurable for multiple contractors,
   or a reusable intake core with customer-specific branding.
4. Technical slice
   Define the first scoped build:
   intake wizard,
   image upload,
   estimate rules,
   contractor dashboard delivery,
   and customer communication flow.
5. Governance
   Capture approvals for discovery, build, and any external promises or pricing.
6. Pop!_OS execution
   Once approved, route the work into the Pop!_OS build lane with a clear build brief,
   system architecture, and reporting cadence.

That pattern should generalize to future ventures, internal tools, automations, and
customer-facing software products.

## Morning Check-In Expectation

When Freedom is left to work overnight or across sessions, it should come back with:

- a cleaned queue in the Pop!_OS build lane
- updated business framing for each serious item
- explicit approval state
- completed local work and validation evidence
- blockers that need Adam specifically
- the recommended next action for the next session
