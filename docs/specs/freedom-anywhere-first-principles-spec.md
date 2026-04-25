# Freedom Anywhere — First Principles Product Spec

Document status: active design

Status: draft for review  
Last updated: 2026-04-22

## Purpose

This document resets the phone product to its simplest intended truth before more
cleanup or refactor work lands on top of the wrong model.

It is intentionally blunt.

If code, copy, or state logic disagree with this document, this document wins until
replaced by a reviewed decision.

## Product In One Sentence

Freedom Anywhere is the phone doorway into Freedom:

- when the desktop agent is available, the phone is a voice-first live connection to it
- when the desktop agent is truly unavailable, the phone stays useful as a high-level
  assistant for capture, planning, brainstorming, and notes until the desktop returns

It is not a second product.
It is not a dashboard.
It is not a parallel assistant identity.

## Non-Negotiable Truth

1. There is one assistant identity: `Freedom`.
2. There is one phone product identity: `Freedom Anywhere`.
3. The default posture is connected-first, not fallback-first.
4. Voice is the primary interaction surface on the phone.
5. Offline behavior exists to preserve usefulness, not to present a separate product.
6. A degraded capability is not the same thing as a disconnected desktop.

## Core User Promise

From the operator's point of view, the phone should behave like this:

- If the desktop is there, Freedom on the phone should feel like a live extension of the
  desktop agent.
- If the desktop blips or refreshes, the phone should try to reconnect quietly before it
  starts talking about fallback or offline behavior.
- If the desktop is actually gone, the phone should keep helping with voice capture,
  planning, brainstorming, and note-taking without pretending it can still execute desktop
  work.

## Allowed Top-Level Phone States

The phone should expose only three primary postures:

1. `desktop_linked`
2. `reconnecting`
3. `stand_alone`

These are product postures, not implementation details.

### `desktop_linked`

Use this when the desktop is reachable enough to remain the primary agent surface.

What the operator should feel:

- Freedom is connected.
- Talking to Freedom should route to the desktop-first experience.
- Shared thread continuity is active.
- Desktop-backed execution is the normal path.

### `reconnecting`

Use this only as a transient grace posture after a recent drop.

What the operator should feel:

- Freedom is still trying to restore the live desktop path.
- The phone has not given up on the desktop yet.
- This is a short-lived transition, not a second mode.
- Connected-to-Freedom indicators should still read as connected during this grace posture.

### `stand_alone`

Use this only when the desktop is actually unavailable enough that connected behavior
should stop.

What the operator should feel:

- Freedom can still help me think, plan, capture, summarize, and preserve intent.
- Desktop execution is deferred until later.
- The phone is helping safely, not pretending the desktop is still live.

## States That Must Not Be Top-Level Product Postures

These may exist internally if needed, but they must not become competing product modes:

- `blocked`
- `voice_fallback_only`
- `failed_needs_review`
- `availability`
- `repairState`
- `offlineMode`
- any copy equivalent to "companion", "disconnected companion", or "notes only" as a
  primary phone identity

These are implementation details or capability flags, not the main thing the operator
should see.

## Capability Model

Top-level phone posture and capability posture must stay separate.

The phone should have a small set of capability flags layered on top of the main
connection posture:

- `desktop_execution_available`
- `premium_voice_available`
- `desktop_sync_available`

Examples:

- Reachable desktop + voice worker unavailable:
  still `desktop_linked`, but premium voice is degraded
- Reachable desktop + transport/trust warning:
  still `desktop_linked`, but execution may be limited or require repair
- Truly unreachable desktop:
  move to `stand_alone`

The operator should not experience a desktop-trust warning as a fake disconnect.

## Voice Rules

### In `desktop_linked`

- The primary `Talk` action should target the desktop-backed Freedom experience.
- Premium realtime voice should be preferred when available.
- If premium voice is unavailable but a secondary desktop-backed path still works, Freedom
  should remain connected-first instead of acting "offline".

### In `reconnecting`

- The UI should preserve continuity and indicate recovery, not abandonment.
- Short reconnect windows should not produce loud warnings or a fallback-first tone.

### In `stand_alone`

- Voice remains useful for capture, planning, brainstorming, and note preservation.
- The phone should not imply that governed desktop execution is still happening.

## Notification Rules

Notifications and banners should be sparse, actionable, and product-owned.

The operator should not see noisy warnings for:

- developer runtime overlays
- transient Metro / Fast Refresh events
- short reconnect windows
- low-level transport details that do not change the operator's next decision

The operator may see product notifications for:

- a true switch into `stand_alone`
- an actionable desktop repair that blocks the next meaningful step
- completion or failure of an explicitly requested governed task
- approval requests that genuinely need operator action

Transient reconnect behavior should stay quiet enough that it does not visually read as a full disconnect.

That includes compact connected/disconnected indicators:

- `desktop_linked` should read as connected
- `reconnecting` should still read as connected to Freedom
- only `stand_alone` should read as disconnected

## Copy Rules

The phone should sound like one calm system.

Preferred language:

- `Connected to desktop`
- `Reconnecting to desktop`
- `Working on this phone`
- `Desktop action will resume later`
- `Premium voice ready`
- `Voice temporarily degraded`

Avoid language that implies a split-brain product:

- `companion`
- `disconnected companion`
- `notes only`
- `cloud mode`
- `offline mode` as the primary headline unless the desktop is truly unavailable

## What Counts As "Actually Disconnected"

The phone should enter `stand_alone` only when the desktop is unavailable enough that the
live desktop-backed experience is no longer a truthful default.

Examples that should usually remain `desktop_linked` or `reconnecting`:

- desktop reachable but premium voice unavailable
- desktop reachable but some trust or transport warning exists
- short websocket drop
- short heartbeat lapse
- local dev runtime turbulence

Examples that may justify `stand_alone`:

- desktop cannot be reached after the reconnect grace window
- desktop is offline long enough that live sync is not truthful anymore
- operator explicitly chooses a phone-only capture posture

## What This Means For The Current System

This spec implies the following corrections to current product logic:

- A reachable desktop must not be presented like a disconnected desktop just because a
  lower-level transport field is not ideal.
- Premium voice degradation must not automatically read as "not connected".
- Deferred execution review state must not become the phone's primary connection label.
- Product UI should derive from the primary posture first, then capability flags second.

## Acceptance Criteria

The phone product is aligned with this spec when all of the following are true:

1. A healthy desktop-backed session presents as connected-first with no fallback framing.
2. A brief drop presents as reconnecting, not offline.
3. A reachable desktop with a degraded capability still presents as connected-first.
4. Only a truly unavailable desktop moves the phone into `stand_alone`.
5. In `stand_alone`, Freedom remains helpful for planning, brainstorming, capture, and notes.
6. Voice remains the primary interaction on the phone in both connected and
   `stand_alone` postures.
7. Debug-runtime overlays are excluded from product evaluation and release judgment.

## Immediate Design Consequence

Before more cleanup work proceeds, the gateway, shared mobile contract, and mobile UI
should be judged against this simpler model:

- one primary connected posture
- one transient reconnecting posture
- one true unavailable posture
- separate capability flags for execution and voice quality

Anything beyond that needs a stronger justification than "the code already has a field
for it."
