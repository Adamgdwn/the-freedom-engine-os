# ADR 0002: Native Mobile Access Architecture

## Status

Accepted

## Context

Freedom Engine needs a practical path for phone access so the owner can interact with the
workspace away from the desktop. Earlier iterations carried that phone-to-desktop bridge
as a separate companion runtime. That transport, pairing, and approved-root layer now
belongs inside this repo and should no longer live behind a parallel product identity.

## Decision

Keep phone access as a native Freedom runtime inside this monorepo.

Freedom remains the governed control plane, the mobile companion, and the
phone-to-desktop transport layer.

## Consequences

- Pairing, transport, auth checks, and approved-root controls now ship under Freedom
  ownership instead of depending on a parallel companion brand.
- The workstation must remain online and reachable for the live phone experience to work.
- Any future mobile productization should extend the native Freedom mobile/runtime stack,
  not split back out into a second identity.
