# ADR 0001: Shared Control Plane V1

## Status

Accepted

## Context

The Freedom Engine OS needs to act as an internal operating system across multiple
ventures, not as a generic chatbot or a set of disconnected mini-apps. The repository
had governance scaffolding and controlled docs but no functioning application yet.

## Decision

Build V1 as a single Next.js control plane with:

- a seeded typed data layer for fast internal iteration
- a shared entity model covering ventures, workflows, governance, evidence, and execution
- a recommendation layer that is traceable to evidence
- a Supabase-ready SQL schema mirroring the seeded model for future persistence
- human-gated authority for reprioritization, spending, policy changes, and irreversible actions

## Consequences

- We get a working governed internal product slice quickly.
- The current app is demonstrable without waiting on database plumbing.
- Persistence and live integrations are the next required step before treating the system
  as an authoritative operating record.
