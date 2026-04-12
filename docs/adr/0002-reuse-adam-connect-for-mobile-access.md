# ADR 0002: Reuse Adam Connect For Mobile Access

## Status

Accepted

## Context

Freedom Engine needs a practical path for phone access so the owner can interact with the
workspace away from the desktop. A separate mobile channel built directly into this repo
would duplicate pairing, transport, auth checks, and approved-root controls that already
exist in Adam Connect.

## Decision

Reuse Adam Connect as the mobile companion for Freedom Engine.

Freedom Engine remains the governed control plane and web application. Adam Connect
remains the phone-to-desktop bridge and local Codex transport layer.

## Consequences

- We avoid rebuilding a second mobile transport stack.
- Phone access can start immediately by adding Freedom Engine to Adam Connect's approved roots.
- The workstation must remain online and reachable for the phone experience to work.
- Any deeper mobile productization should extend Adam Connect or integrate with it, not
  replace it casually.
