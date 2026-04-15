# Changelog

## 2026-04-14

- documented the current Freedom companion operator loop, including the native
  Freedom Desktop shell path, continuous phone voice loop, and richer spoken-reply
  voice metadata in [docs/mobile-access.md](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/mobile-access.md)
- clarified that parallel skills and self-evolving functions are now modeled in the
  control plane, while live multi-lane runtime execution is the next integration step

## 2026-04-13

- added first-class parallel skill and self-evolving function registry data so Freedom can
  model governed branch fan-out as part of capability-building rather than only as chat
  interruption behavior
- surfaced parallel-capable skills, self-evolving functions, and branch-aware build routing
  in Portfolio Home and Agent Control
- added Freedom Connect domain types, seeded session activity, and governed builder
  routing data to the control plane
- surfaced desktop-shell and phone-companion activity directly in Portfolio Home, Agent
  Control, and Governance Console
- added Supabase schema support for connect sessions, connect events, outbound policy,
  and agent build requests
- updated mobile-access and architecture docs to make `Freedom` the product identity and
  Connect the runtime bridge underneath it

## 2026-04-12

- added repository-local governance automation so preflight passes in-repo
- scaffolded a Next.js 16, TypeScript, Tailwind 4 control-plane application
- implemented seeded venture registry, scoring engine, workflow intelligence,
  governance console, agent control, evidence room, and weekly review views
- added a Supabase-ready V1 schema for ventures, workflows, governance, evidence,
  approvals, executions, and recommendations
- replaced placeholder controlled docs with project-specific operating guidance
- initialized local git, created the private GitHub repository, and pushed the first main branch
- provisioned Supabase project `basbwglynuyfxcqxfyur`, linked the repo, and applied the
  initial migration
- documented Adam Connect reuse as the phone-access path for Freedom Engine
- added a focus-guardrail policy and prompt so the system can flag off-roadmap drift
