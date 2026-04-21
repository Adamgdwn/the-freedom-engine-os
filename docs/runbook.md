# Runbook

## Purpose

Operate the Freedom Engine OS safely as a governed internal decision system.

## Alerts And Failures

- Governance preflight fails:
  restore missing required files or fix `project-control.yaml` before making further
  substantial changes.
- UI route fails to render:
  run `npm run typecheck` and `npm run build` to isolate compile-time issues.
- Recommendation quality degrades:
  inspect evidence freshness, blocked approvals, and score-weight drift.
- Workflow or execution state looks wrong:
  review the seed data or future persistence source before changing priorities.
- Phone access fails through Freedom Desktop:
  verify Codex login, Tailscale reachability, and that Freedom Engine's repo root is
  present in `DESKTOP_APPROVED_ROOTS`.
- Premium mobile voice connects but does not answer:
  verify repo-root `.env` contains `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, and `OPENAI_API_KEY`, then confirm the desktop-host log shows
  `[voice-worker] starting ...` and later worker room-join output. The desktop host now
  autostarts this worker; if those log lines are missing, check
  `DESKTOP_VOICE_WORKER_AUTOSTART` and `DESKTOP_VOICE_WORKER_COMMAND` before changing
  the phone build.
- Premium mobile voice hears you but stays stuck on `Listening`:
  treat this as a desktop-side worker/runtime issue first, not a phone UI problem. Check
  that the LiveKit worker actually joined the room, then start a fresh `Talk` session.
- Two voices answer after an interrupt:
  verify the phone is on Android `0.2.68 (75)` or later. That build suppresses the
  phone-local auto-read path during active realtime sessions and clears any local speech
  queue when realtime starts or is interrupted.
- Offline mobile ideation is available but import looks unsafe:
  verify the app is in `Offline / On-device`, confirm the session shows an offline
  import draft, and use the review/import flow. The phone should import summary notes and
  draft turns as non-executing `system` messages only; it must not batch replay offline
  turns into live desktop execution.
- Freedom says it cannot read its own governing YAML, tool manifests, or approval rules:
  use the live voice governance tools first. `Talk` should now be able to inspect
  `project-control.yaml`, `docs/tool-permission-matrix.md`, `AI_BOOTSTRAP.md`, and
  registered `freedom.tool.yaml` manifests from approved roots. If it still cannot, verify
  the Python voice worker was restarted after the integration patch.
- Freedom can review rules but cannot start approved repo work:
  verify the voice runtime is using the new desktop-bridge tool. After explicit approval,
  it should queue the programming task into the desktop shell/Codex lane instead of only
  recording a self-programming request.
- Freedom memory looks missing or stale:
  verify `SUPABASE_SERVICE_ROLE_KEY`, confirm the latest memory migration is applied, and
  restore from the latest local backup if needed.
- Conversation ideas are piling up but not turning into real implementation:
  review `docs/roadmap.md` under `From Conversations To Be Done On Pop!_OS`, make sure
  each serious item has an approval state and next checkpoint, and move vague ideas back
  into business framing before opening a build session.

## Dependencies

- Node.js and npm for local runtime
- Next.js toolchain for build and routing
- Supabase migration files for future database setup
- Supabase service-role access for durable Freedom memory persistence and restore
- GitHub workflow access for future code-control integration
- Freedom desktop-host and gateway for paired mobile access to the local workstation
- LiveKit/OpenAI voice-worker runtime under `agents/freedom_agent` for premium mobile
  realtime `Talk`

## Recovery

1. Re-run `bash scripts/governance-preflight.sh`.
2. Re-run validation commands.
3. If the issue is limited to seeded data, restore the last known-good data snapshot from
   version control.
4. If Freedom memory is at risk, run `npm run backup:freedom-memory` immediately if the
   project is still reachable. If Supabase memory is lost, restore with
   `npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json`.
5. If the issue is architectural, document the change in `docs/architecture.md` and add
   or update an ADR before re-releasing.
6. If phone access breaks, fall back to direct desktop use of the web app and recover the
   Freedom desktop-host and gateway separately.
7. If premium mobile voice still stalls after reconnecting, inspect the desktop-host logs
   first. The host should supervise the worker automatically. If needed, restart the host
   so it can relaunch the worker cleanly, or run the custom worker command from
   `DESKTOP_VOICE_WORKER_COMMAND` manually from `agents/freedom_agent` to isolate env or
   dependency problems.
8. If a desktop-host restart leaves queued or streaming turns in a bad state, refresh the
   host registration and let the gateway recover orphaned tasks before creating more
   duplicate turns from the phone.
9. If the phone must continue while the desktop is unreachable, keep the conversation in
   offline mode and import the notes later instead of trying to replay old offline turns
   directly into a live session.
10. If the live voice agent seems out of sync with the dispatcher registry, use the
    dispatcher reload path and then start a fresh voice session so the current tool
    surface is rehydrated into the worker.
11. If Freedom has been left to work between sessions, require a morning report that states:
   what moved in the Pop!_OS build lane,
   what was done autonomously,
   what approvals were assumed or used,
   what remains blocked,
   and the next recommended decision.

## Escalation

- Owner:
  Adam Goodwin for priority changes, policy decisions, and external commitments
- Technical lead:
  hybrid session for architecture, validation, and deployment readiness
- Build-lane governance:
  use `docs/conversation-build-lane.md` for the required intake, approval, and reporting
  path when conversation-driven work becomes a real Pop!_OS programming session
