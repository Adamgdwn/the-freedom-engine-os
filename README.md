# The Freedom Engine OS

## Purpose

The Freedom Engine OS is a governed internal venture operating system for an AI-native
organization. It is designed to help a founder and an agent workforce decide what to
build next, what to stop doing, which workflows deserve automation, and which actions
increase long-term freedom through measurable value creation.

Freedom in this system is tracked as outcomes, not slogans:

- more control over time
- more family capacity
- more location flexibility
- more financial resilience
- more leverage with fewer wasted hours
- more value created for society than extracted from it

## Status

- Owner: Adam Goodwin
- Technical lead: hybrid session
- Risk tier: high
- Production status: local governed V1 scaffold

## Infrastructure Baseline

- GitHub:
  private repository at `https://github.com/Adamgdwn/the-freedom-engine-os`
- Supabase:
  linked hosted project `basbwglynuyfxcqxfyur` in West US (Oregon), with the V1 schema applied
- Phone access:
  reuse the existing Adam Connect stack instead of building a second mobile bridge

## What V1 Includes

- A Next.js 16 control-plane UI with the required views:
  Portfolio Home, Venture Detail, Workflow Lab, Agent Control, Governance Console,
  Evidence Room, and Weekly Review
- A seeded venture registry and opportunity scoring engine with versioned weight sets
- Workflow intelligence, agent registry, policy registry, approvals, evidence logging,
  execution logs, overrides, and recommendation generation
- A Supabase-ready SQL schema for future persistence and multi-tenant expansion
- Repository-local governance preflight support

## Quick Start

1. Install dependencies:
   `npm install`
2. Run the governance preflight:
   `bash scripts/governance-preflight.sh`
3. Start the app:
   `npm run dev`
4. Copy environment defaults if needed:
   `.env.example` to `.env.local`
4. Validate changes:
   `npm run lint`
   `npm run typecheck`
   `npm test`
   `npm run build`

## Mobile Access

Freedom Engine can already be reached from your phone through the existing Adam Connect
companion at `/home/adamgoodwin/code/agents/codex_adam_connect`. See
`docs/mobile-access.md` for the exact approved-root setup and launch path.

## Documentation

- `docs/architecture.md`
- `docs/manual.md`
- `docs/roadmap.md`
- `docs/deployment-guide.md`
- `docs/runbook.md`
- `docs/CHANGELOG.md`
- `docs/risks/risk-register.md`

## Support Model

This repository is maintained as a governed internal venture. Any substantial code or
configuration change should start with governance preflight, review of
`project-control.yaml`, and updates to the nearest relevant controlled docs.
