# Mobile Access Via Adam Connect

## Decision

Freedom Engine should reuse Adam Connect for phone access instead of building a second
mobile bridge.

Adam Connect already handles:

- phone pairing
- Codex login dependency on the desktop
- approved-root workspace constraints
- realtime message streaming between phone and desktop

## Existing Companion

- Repo:
  `/home/adamgoodwin/code/agents/codex_adam_connect`
- Current supported desktop GUI:
  browser dashboard at `http://127.0.0.1:43111/`

## What To Configure

In Adam Connect's `.env`, set `DESKTOP_APPROVED_ROOTS` as a comma-separated list of
absolute roots. Include Freedom Engine's repo root:

`/home/adamgoodwin/code/agents/the-freedom-engine-os`

Example:

`DESKTOP_APPROVED_ROOTS=/home/adamgoodwin/code/agents/codex_adam_connect,/home/adamgoodwin/code/agents/the-freedom-engine-os`

## Launch Path

1. In the Adam Connect repo, run `npm run launch`.
2. Confirm Codex is logged in on the desktop machine.
3. Confirm Tailscale or another private network path is available from the phone.
4. Pair the phone from the dashboard.
5. Create a session rooted in the Freedom Engine repo.
6. Chat with the local Freedom Engine workspace from the phone.

## What This Means

This gives you phone access to the repo and the local Codex runtime. It does not yet mean
Freedom Engine has its own independent hosted mobile backend. For "anytime" use, the
desktop or workstation running Adam Connect must stay online and reachable.

## Next Improvements

- add a named Freedom Engine session preset in Adam Connect
- add shortcuts for Weekly Review and governance checks
- validate the full phone workflow against this repo on a real device
