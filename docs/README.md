# Docs Index

Document status: live reference

Use this file to understand which documents are current operating references,
which are forward-looking design work, and which are preserved mainly for
historical context.

Status legend:

- `Live reference`: current operator or implementation reference
- `Active design`: forward-looking design or planning doc that still informs live work
- `Historical`: preserved context, decision history, or superseded implementation notes

## Live Reference

| Path | Purpose |
| --- | --- |
| `docs/README.md` | Canonical status index for the docs set |
| `docs/current-capabilities.md` | Current live system behavior and boundaries |
| `docs/known-deficiencies-2026-04-25.md` | Canonical dated deficiency ledger |
| `docs/manual.md` | Working instructions for operating in the repo |
| `docs/architecture.md` | High-level live system shape |
| `docs/SECURITY_ASSUMPTIONS.md` | Security posture and v1 constraints |
| `docs/conversation-build-lane.md` | Current conversation-to-build execution posture |
| `docs/mobile-access.md` | Current desktop-plus-phone access posture |
| `docs/deployment-guide.md` | Current deployment and validation checklist |
| `docs/outbound-email-setup.md` | Outbound email delivery setup |
| `docs/tool-permission-matrix.md` | Tool authority boundaries |
| `docs/agent-inventory.md` | Current modeled agent roster |
| `docs/model-registry.md` | Model roster and intended roles |
| `docs/exception-record-template.md` | Exception record template |
| `docs/adr-template.md` | ADR template for new architectural decisions |
| `docs/runbooks/operations.md` | Current operational checks and failure handling |
| `docs/runbooks/freedom-anywhere-operator-validation.md` | Real-device validation path for the governed desktop-plus-phone operator loop |
| `docs/wake-relay-deployment.md` | Wake relay deployment runbook |
| `docs/risks/risk-register.md` | Current risk ledger |
| `docs/CHANGELOG.md` | Chronological record of completed changes |

## Active Design

| Path | Purpose |
| --- | --- |
| `docs/roadmap.md` | Directional work and queued initiatives |
| `docs/prompt-register.md` | Prompt inventory with active and draft entries |
| `docs/specs/freedom-anywhere-first-principles-spec.md` | Phone product reset and design truth |
| `docs/specs/freedom-anywhere-implementation-plan.md` | Current phone cleanup sequence |
| `docs/specs/freedom-core-self-evolving-platform-plan.md` | Long-range platform and autonomy plan |

## Historical

| Path | Purpose |
| --- | --- |
| `docs/session-log-freedom-anywhere-relay-2026-04-24.md` | Relay sprint session record |
| `docs/voice-realtime-architecture.md` | Earlier migration note for mobile voice architecture |
| `docs/specs/reference-voice-migration-plan.md` | Reference-driven migration plan from the earlier voice upgrade phase |
| `docs/specs/voice-layer-v1-spec.md` | Original Phase 1 voice build spec |
| `docs/adr/0001-shared-control-plane-v1.md` | Accepted architectural decision record |
| `docs/adr/0002-mobile-access-architecture.md` | Accepted mobile architecture decision record |
| `docs/adr/0003-freedom-anywhere-recovery.md` | Accepted phone recovery decision record |
| `docs/archive/README.md` | Index of archived planning and handoff docs |
| `docs/archive/cleanup-plan-v1.md` | Archived cleanup and integration plan |
| `docs/archive/gui-direction-backlog.md` | Archived deferred GUI direction backlog |
| `docs/archive/mobile-realtime-voice-handoff-2026-04-21.md` | Archived mobile voice migration handoff |

## Notes

- Historical does not mean unimportant. It means the document should not be
  treated as the current implementation queue or operator source of truth.
- When a doc's live status changes, update this index in the same change.
