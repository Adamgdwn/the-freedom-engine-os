# Roadmap

## Done (as of 2026-04-15)

- V1 control plane: venture registry, scoring, workflow lab, governance, evidence room,
  weekly review, recommendation engine
- Supabase schema and migrations applied; persistence boundary in place
- Freedom Connect surfaces: desktop shell + mobile companion session identity, connect
  events, governed builder routing, outbound approval policy
- Voice Layer Phase 1: LiveKit WebRTC + OpenAI Realtime, mic-mute self-interruption fix,
  voice orb, panel, FAB, Python agent scaffold
- Freedom Core Phase 2 type contracts: capability layer, agent-build contracts,
  model routing, `CommunicationChannel`
- Learning Registry surface: capability internalization status, validation records,
  builder dependencies, safety notes, learning history
- Model Router surface: tier policy, escalation request queue, provider preference order,
  resolved decision audit trail
- Monorepo consolidation: `codex_adam_connect` absorbed into `the-freedom-engine-os`;
  `@freedom/*` packages native to this repo; `monorepo-merge` merged to `main`
- Android Gradle build fixed for npm workspaces; APK (68 MB) built and verified from
  `npm run build:android-release`
- Full runtime cutover: gateway, desktop-host, and Electron shell now running from
  `the-freedom-engine-os`; install page at `pop-os.taildcb5c5.ts.net:43111/install`
  serves the Freedom Engine OS APK; `codex_adam_connect` retired
- Mobile voice stabilization + orchestration pass: STT pauses during TTS, Android
  restart timing tightened, hot voice switching added, Freedom Voice mobile surface
  refreshed, interrupt classification added, and gateway/desktop-host now schedule
  bounded parallel task work instead of a single blocking run

## Now

- verify APK sideload on device and confirm voice + gateway pairing work end-to-end
- run real-device Android acceptance for start voice, assistant playback, interrupt,
  mute/unmute, post-TTS resume, voice switching, and safe multi-task handling
- wire live Supabase persistence to replace seeded data (ventures, approvals, executions)
- connect AI Consulting Build metrics and workflow exceptions into the evidence room
- activate voice agent tools (`top_venture_status`, `pending_approvals`, `weekly_metrics`)
  against live Supabase data instead of stubs

## Next

- Learning Registry: promote seed data to live capability tracking backed by Supabase
- Model Router: wire escalation request + decision flow so Freedom can surface live
  approval requests in the UI
- Authenticated access and role-aware approval flows
- Persist score-weight versions, approvals, overrides, and weekly reviews
- Connect PDF Flow metrics directly into evidence room
- Expand recommendation quality with evidence freshness and experiment outcomes

## Later

- Voice Layer Phase 2: memory loops, autonomy hooks, deeper resource-aware concurrency,
  Supabase-backed tool implementations
- Self-evolving function runtime: live branch fan-out with governed convergence
- Multi-tenant internal venture studio support
- Governed external-facing surfaces after internal operating confidence is high
