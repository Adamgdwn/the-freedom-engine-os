# ADR 0003: Freedom Anywhere Recovery

## Status

Accepted - 2026-04-22

## Context

The phone experience drifted away from the intended product truth.

We accumulated:

- mixed mobile naming and legacy `Freedom Mobile` install identity
- duplicate connection vocabularies across gateway, mobile store, and mobile UI
- premium voice and fallback voice presented too much like peer paths
- offline behavior described like a second product instead of a graceful, execution-aware posture

That drift made the phone feel split-brained and increased the risk of more cleanup work landing on top of the wrong model.

## Decision

The repo adopts **Freedom Anywhere** as the visible phone product identity.

The phone product truth is now:

- desktop-connected is the preferred posture when available
- premium realtime voice is the primary voice path
- stand-alone behavior preserves useful work without pretending the phone is a separate product
- the assistant and session identity remain `Freedom`

The first recovery pass must:

- add canonical shared enums for connection, voice, and deferred execution
- make the gateway publish canonical connection and voice truth
- migrate mobile UI copy and launcher display names to `Freedom Anywhere`
- keep Android and iOS package or bundle identifiers unchanged for now
- keep legacy `mobile-companion` routes, files, and env vars only as compatibility seams
- keep reconnecting behavior visually connected-to-Freedom instead of presenting it like a full disconnect

## Recovery Rules

- `desktop_linked`, `reconnecting`, and `stand_alone` are the only approved connection states for the phone surface.
- `voice_primary_*`, `voice_fallback_only`, and `voice_unavailable` are the only approved phone voice states.
- `availability`, `repairState`, `offlineMode`, and screen-local labels are compatibility fields only while callers migrate.
- The phone app must not present fallback voice or stand-alone posture as a peer default when the desktop-linked premium path is available.
- The phone app must treat `reconnecting` as a quiet, still-connected grace posture for compact status indicators and connected/disconnected affordances.
- New user-facing copy must use `Freedom Anywhere` for the phone product and `Freedom` for the assistant.

## Compatibility Notes

- Android package id remains `com.freedommobile` in this recovery pass.
- iOS bundle identifier remains `com.freedommobile` in this recovery pass.
- Internal `mobile-companion` filenames, routes, and env vars remain temporarily for compatibility and migration safety.

## Inventory In Scope

- Shared mobile state contracts under `packages/shared/src/`
- Gateway host-status production and install copy under `apps/gateway/src/`
- Mobile store and mobile UI under `apps/mobile/src/`
- Mobile-facing docs and recovery guidance under `docs/`

## Consequences

- The older cleanup plan remains valid as a follow-on track, but it is no longer the primary sequence until this recovery lands.
- Future cleanup or refactor work should reuse the canonical shared state model instead of introducing new labels or fallback-first branches.
