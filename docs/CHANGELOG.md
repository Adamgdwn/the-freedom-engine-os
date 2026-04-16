# Changelog

## 2026-04-15 (APK build identity + gateway download naming)

- updated the gateway install surface so Android downloads expose a visible build identifier
  based on `versionName`, `versionCode`, and build timestamp
- switched the install page and desktop dashboard to link to a unique APK filename per build
  instead of only a generic `latest.apk` / `freedom.apk` pairing, which reduces stale-download
  confusion on phones and browsers
- kept `/downloads/android/latest.apk` as a compatibility alias while making the primary
  download path build-specific and easier to verify by eye

## 2026-04-15 (operator workspace + mobile shell refresh)

- refit the Next.js control plane into a denser operator workbench:
  desktop now uses an activity rail, compact top bar, launcher-style Portfolio Home tabs,
  list/detail workbench layouts on the heavier routes, and a stronger mobile voice action
- refreshed the Freedom Android companion shell to better match the voice-first operator
  posture:
  navigation now lives behind a menu sheet, voice actions are anchored in a persistent
  bottom dock, and the chat stage no longer duplicates the primary talk control
- kept existing voice/session behavior intact while changing presentation only:
  the LiveKit web lane, mobile voice loop, task threading, Supabase memory, and API/runtime
  contracts were preserved
- bumped the Android app release metadata to `versionCode 22` / `versionName 0.2.15`
  and rebuilt the release APK from the updated monorepo state

## 2026-04-15 (control-plane email bridge pass)

- added a first-class Freedom email bridge in the current Next.js control plane:
  trusted recipients now live in Supabase, recent deliveries are audited, and the
  new `/communications` page manages recipient policy and delivery visibility
- added a server-side Freedom email API backed by the existing Resend env vars so
  the newer web/voice stack can send external mail without depending on the older
  gateway-local recipient store
- extended the voice/runtime contract with confirmation-gated email drafts so the
  Python Freedom worker can prepare an email in response to a voice request, while
  keeping the final send action in the UI behind explicit user confirmation
- added the `freedom_email_recipients` and `freedom_email_deliveries` Supabase
  tables and pushed the new migration to the linked remote database
- added `docs/current-capabilities.md` as the running reference for what Freedom
  can do live today versus what remains modeled or planned

## 2026-04-15 (persistent memory + local backup pass)

- added server-only Supabase-backed persistence for Freedom voice tasks, learning signals,
  and approval-gated self-programming requests, with the browser bootstrapping prior
  memory from `/api/freedom-memory`
- added a Python worker memory-hydration step so recent durable memory is folded back
  into the live voice session prompt at startup
- added local backup and restore scripts for Freedom memory:
  `npm run backup:freedom-memory` and
  `npm run restore:freedom-memory -- --input=...`
- added the `freedom_voice_tasks`, `freedom_learning_signals`, and
  `freedom_programming_requests` Supabase tables plus governed documentation for backup,
  restore, and service-role requirements

## 2026-04-15 (voice interrupt + task-thread pass)

- upgraded the web voice session provider to publish explicit LiveKit `interrupt` data
  messages, accept worker-driven `state_update` and `task_update` events, and keep
  in-memory parked task threads visible in the sidebar voice panel
- aligned the Freedom voice prompt across TypeScript and Python so interruption,
  topic-shift parking, concise decision support, and incomplete-data behavior are
  consistent between UI and worker
- extended the Python LiveKit worker to react to interrupt data messages, emit transcript
  and state updates back to the browser, and expose `park_task` / `update_task_status`
  coordination tools for UI-visible parallel thread handling
- updated architecture, roadmap, prompt register, model registry, and voice architecture
  notes to reflect the active LiveKit/OpenAI Realtime voice path and its new task-aware
  interrupt behavior

## 2026-04-15 (conversation learning + approved self-programming pass)

- extended the Freedom voice runtime to capture in-session learning signals and approval-
  gated self-programming requests, while keeping all actual runtime/code changes behind
  explicit approval
- updated the Freedom partner prompt to prioritize on-task guidance, durable pattern
  capture, and clear approval boundaries around self-programming
- added modeled control-plane entries for conversation learning and approval-gated
  self-programming so Learning Registry and Agent Control reflect the new posture

## 2026-04-15 (runtime cutover)

- merged `monorepo-merge` → `main`; Freedom Engine OS is now the single canonical repo
- fixed Android Gradle paths for npm workspaces: `settings.gradle` updated to resolve
  `@react-native/gradle-plugin` from repo root (`../../../node_modules`); `app/build.gradle`
  explicitly sets `reactNativeDir`, `codegenDir`, and `cliFile` to repo-root paths so Gradle
  finds the hoisted packages
- APK built from Freedom Engine OS: `npm run build:android-release` → 68 MB release APK at
  `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- gateway, desktop-host, and Electron shell now running from `the-freedom-engine-os`; old
  `codex_adam_connect` desktop process retired; install page at
  `pop-os.taildcb5c5.ts.net:43111/install` serves the new APK
- `.env` seeded in `the-freedom-engine-os` with gateway, Supabase, and outbound-email config

## 2026-04-15

- absorbed `codex_adam_connect` as native monorepo — `apps/mobile`, `apps/gateway`,
  `apps/desktop`, `apps/desktop-host`, `apps/wake-relay`, `packages/shared`,
  `packages/core`, `packages/provider-adapters` all live inside Freedom Engine OS
- package scope renamed `@adam-connect/*` → `@freedom/*` throughout
- npm workspaces configured at repo root; `tsconfig.workspace.json` and
  `tsconfig.base.json` added for composite node package builds
- `.npmrc` added (`legacy-peer-deps=true`) for React Native Firebase peer dep
- `scripts/` merged from both repos; `build-android-release.sh`, `launch-adam-connect.mjs`,
  `write-mobile-runtime-config.mjs`, and others are now runnable from Freedom root
- `.env.example` extended with gateway, desktop-host, mobile, and wake-relay vars
- docs from Adam Connect merged in: `outbound-email-setup`, `voice-realtime-architecture`,
  `wake-relay-deployment`, `SECURITY_ASSUMPTIONS`
- added Phase 2 Freedom Core type contracts: capability layer, agent-build contracts,
  model routing types, and `CommunicationChannel`
- added Learning Registry and Model Router control-plane surfaces (`/learning-registry`,
  `/model-router`) with seed data for capabilities, escalation requests and decisions
- build validated: lint ✓ typecheck ✓ build:packages ✓ Next.js build ✓ (11 routes)

## 2026-04-14

- documented the current Freedom companion operator loop, including the native
  Freedom Desktop shell path, continuous phone voice loop, and richer spoken-reply
  voice metadata in [docs/mobile-access.md](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/mobile-access.md)
- clarified that parallel skills and self-evolving functions are now modeled in the
  control plane, while live multi-lane runtime execution is the next integration step

## 2026-04-13

- added first-class parallel skill and self-evolving function registry data so Freedom can
  model governed branch fan-out as part of capability-building rather than only as chat
  interruption behavior
- surfaced parallel-capable skills, self-evolving functions, and branch-aware build routing
  in Portfolio Home and Agent Control
- added Freedom Connect domain types, seeded session activity, and governed builder
  routing data to the control plane
- surfaced desktop-shell and phone-companion activity directly in Portfolio Home, Agent
  Control, and Governance Console
- added Supabase schema support for connect sessions, connect events, outbound policy,
  and agent build requests
- updated mobile-access and architecture docs to make `Freedom` the product identity and
  Connect the runtime bridge underneath it

## 2026-04-12

- added repository-local governance automation so preflight passes in-repo
- scaffolded a Next.js 16, TypeScript, Tailwind 4 control-plane application
- implemented seeded venture registry, scoring engine, workflow intelligence,
  governance console, agent control, evidence room, and weekly review views
- added a Supabase-ready V1 schema for ventures, workflows, governance, evidence,
  approvals, executions, and recommendations
- replaced placeholder controlled docs with project-specific operating guidance
- initialized local git, created the private GitHub repository, and pushed the first main branch
- provisioned Supabase project `basbwglynuyfxcqxfyur`, linked the repo, and applied the
  initial migration
- documented Adam Connect reuse as the phone-access path for Freedom Engine
- added a focus-guardrail policy and prompt so the system can flag off-roadmap drift
