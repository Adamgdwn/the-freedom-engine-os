# Risk Register

## Current Risk Classification

- Tier: high
- Owner: Adam Goodwin
- Last reviewed: 2026-04-12

## Key Risks

| ID | Risk | Likelihood | Impact | Controls | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Portfolio recommendations drift away from evidence and become founder-bias theater | Medium | High | Evidence room, weight versioning, weekly review, human approval for reprioritization | Adam Goodwin | Open |
| R-002 | Agents exceed safe authority in code, money, or external commitments | Medium | High | Policy registry, approval queue, guarded governance reviewer, tool permission matrix | Adam Goodwin | Open |
| R-003 | Seeded data and real-world state diverge, causing poor decisions | High | Medium | Treat V1 as internal scaffold, prioritize Supabase persistence next, use weekly review to reconcile | Adam Goodwin | Open |
| R-004 | Platform work consumes time before revenue proof is strong enough | High | High | AI Consulting Build prioritized as first deep integration, weekly review stop-doing lens | Adam Goodwin | Open |
| R-005 | Future live integrations import sensitive or money-moving data without adequate controls | Medium | High | Reassess governance whenever data sensitivity or money movement changes | Adam Goodwin | Open |
| R-006 | Mobile companion access broadens the trust boundary around workspace control | Medium | High | Restrict `DESKTOP_APPROVED_ROOTS`, keep local Codex auth on the desktop, use Tailscale/private networking, and require explicit phone pairing | Adam Goodwin | Open |
