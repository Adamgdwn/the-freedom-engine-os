# Manual

## What This Project Is

This project is an internal venture operating system. It helps compare ventures
objectively, inspect workflow leverage, govern agent actions, and run a weekly review
that ties business outcomes back to freedom outcomes.

## How To Work In This Repo

1. Run `bash scripts/governance-preflight.sh`.
2. Review `project-control.yaml` and confirm that exceptions remain empty or are updated
   intentionally.
3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env` for desktop, gateway, mobile, and voice-worker runtime
   secrets. Use `.env.local` only for web-specific overrides.
5. Start the control plane with `npm run dev`.
6. When changing behavior, update the nearest matching controlled document in `docs/`.
6. Before finishing, run:
   `npm run lint`
   `npm run typecheck`
   `npm test`
   `npm run build`
7. For user-visible Android mobile changes, do not stop at source validation. Ship the APK:
   `npm run release:android-live`
   Then confirm:
   `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
   `http://pop-os.taildcb5c5.ts.net:43111/install`
   and the build-specific APK URL shown on the install page.

## Expected Outputs

- working application code
- updated governed documentation
- evidence-backed changes to venture, workflow, or governance behavior
- validation results or a clearly stated blocker

## Current Capability Reference

- Start with `docs/current-capabilities.md` when deciding whether to build a new
  Freedom feature or extend an existing one.
- Keep that document current whenever live behavior, operator workflows, or the
  modeled-vs-live boundary changes.

## Conversation To Build Lane

- Use `docs/conversation-build-lane.md` when a live conversation turns into real
  programming, systems, or product work that needs a dedicated Pop!_OS session.
- The roadmap section `From Conversations To Be Done On Pop!_OS` is the required queue
  for serious implementation candidates coming from the app conversation surface.
- The voice runtime can now persist those items directly into governed memory, and the
  mobile companion plus agent-control page can read the same live queue.
- Before substantial implementation work begins, record:
  the objective,
  business case,
  approval state,
  autonomy envelope,
  execution surface,
  reporting path,
  and next checkpoint.
- Freedom may autonomously move ideas from conversation into discovery material,
  specs, pricing analysis, technical architecture, and local implementation prep.
- Freedom must still stop for approval before spending money, making external
  commitments, broadening credentials, or taking destructive production actions.

## Operator Notes

- V1 is seeded and does not yet require Supabase credentials.
- The repo is now linked to Supabase project `basbwglynuyfxcqxfyur`, and the initial
  migration has been pushed.
- The `supabase/migrations/` directory is now the canonical schema source for remote updates.
- Persistent Freedom memory now requires `SUPABASE_SERVICE_ROLE_KEY` on the server side.
- Freedom email now lives in the web control plane at `/communications`.
- Trusted recipients are stored in Supabase and are the safety boundary for outbound mail.
- Freedom can prepare email drafts from voice, but the operator still confirms the send
  in the UI before anything leaves the system.
- The web control plane now uses a denser operator workbench shell:
  Portfolio Home acts as a launcher, deeper routes use list/detail layouts, and the
  desktop voice surface lives in the shell instead of a decorative marketing panel.
- The Android companion now treats the phone as command-and-capture:
  launch opens on a sparse Start screen, live conversation stays on a dedicated Talk
  canvas, and secondary controls live behind the hidden utility sheet.
- Local memory backup:
  run `npm run backup:freedom-memory`
- Local memory restore:
  run `npm run restore:freedom-memory -- --input=.local-data/backups/freedom-memory/latest.json`
- Desktop-host and gateway live runtime state under `.local-data/` is intentionally local-only.
  The committed `*.example.json` files in those folders are safe bootstrap fixtures for
  first run and for sharing the repo with others.
- The scoring workbench is intended for scenario testing, not for silently changing live priorities.
- Weekly Review is the preferred place to convert observations into approved next actions.
- Phone access now runs through the integrated Freedom desktop-host and gateway in this
  monorepo. If you customize `DESKTOP_APPROVED_ROOTS`, include this repo root as a
  comma-separated absolute path list before launching the desktop host and pairing
  from your phone.
- Premium mobile voice now expects the paired desktop to have `LIVEKIT_URL`,
  `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `OPENAI_API_KEY` configured. If those are
  absent, the Android companion falls back to the older device STT/TTS voice path.
- Those premium voice runtime secrets are read from repo-root `.env`. Keep `.env.example`
  as placeholders only so template commits never leak working credentials.
- Freedom's default live web-research lane is now Perplexity when `PERPLEXITY_API_KEY`
  is present in repo-root `.env`. The optional knobs are `FREEDOM_WEB_SEARCH_PROVIDER`
  and `FREEDOM_WEB_SEARCH_MODEL`, but the intended default is `perplexity` + `sonar`.
- That Perplexity lane now powers current web lookups and weather checks from the live
  voice runtime. If the key is missing, Freedom should say web research is not configured
  instead of bluffing.
- The shared realtime voice defaults are now `gpt-realtime-mini` with supported voice
  fallback to `marin`, even if an older env value still says `nova`.
- The live Freedom voice can now be tuned in conversation. Ask for changes to voice,
  gender presentation, accent hints, tone, pace, warmth, or similar traits, and the
  agent will save a host-level voice profile.
- The mobile settings sheet now treats `Freedom voice` as the primary live voice picker.
  It shows Marin and the other real realtime presets instead of the device TTS list.
- Realtime preset voice changes take effect on the next voice session after restart.
  The phone's local spoken-reply fallback voices still live in Homebase and only control
  the backup TTS lane, not Freedom's live conversation voice.
- Premium mobile realtime voice sessions now restore recent thread context from the
  gateway-backed chat history at session start, and the worker persists final user and
  assistant transcripts back into that same thread so continuity survives session ends.
- Freedom can now review its own runtime posture in conversation:
  published mobile build version/code, current live Freedom voice profile, desktop voice
  runtime provider/model, and whether Perplexity web search is configured. The one thing
  it still cannot inspect directly is the phone's current local Homebase fallback voice.
- The Android companion now keeps the conversation-originated build lane inside the
  pull-down utility sheet instead of the main voice canvas, so Freedom can surface the
  governed queue when needed without crowding the primary talk surface.
- The mobile header is now intentionally split:
  the three-line pull-down is for actions and capabilities such as retrieval, current
  thread access, live controls, and the conversation-to-build queue, while the three dots
  are for genuine settings like voice choices, reply behavior, runtime info, and system adjustments.
- The `Talk` header now matches that same structure cleanly, without the old stray back
  arrow artifact: hamburger on the left, `Freedom Voice` centered, and settings on the right.
- The mobile voice footer now uses the left action for live mute/unmute instead of a
  generic `+`, and the `Message` control opens a dedicated typed-turn panel above the
  footer with a collapse affordance so text entry is visibly separate from the voice
  controls.
- The compact conversation preview on the voice canvas is now the only `Recent
  thread` entry point. Treat it as the transcript/history peek, not the typed-entry area.
- The center Freedom dialogue on the voice canvas is now just the voice stage again.
  Open thread history from the lower `Recent thread` card, then use its `Collapse`
  control to close it. Long threads now scroll inside that transcript panel so the
  collapse action stays visible instead of being pushed offscreen.
- The idle typed-entry control on that same footer is intentionally compact now: look
  for the small `Text` button beside `Mute`, then use the `Build` view's `Launch build
  chat` flow when you want a truly separate new work thread.
- The three-dots utility sheet is now oriented toward email/contact capture and
  retrieval. Treat it as the first pass toward a more robust contact-memory skill.
- The utility sheet now uses a dedicated overlay backdrop plus an inner scroll view, so
  longer settings/status sections should scroll more reliably on Android.
- Android speech recognition now runs through the React Native voice adapter instead
  of the incompatible Expo speech-recognition module, which removes the startup native
  module error seen on the current Expo 56 / RN 0.84 stack.
- The Android companion also installs `TextEncoder` / `TextDecoder` polyfills at
  startup so Hermes-compatible builds do not abort before the voice runtime is ready.
- The intended operating direction is a mostly autonomous business partner:
  Freedom should identify what deserves a real build session, develop the business and
  technical case, execute approved Pop!_OS work, and report clearly on what changed,
  what approvals were used, and what still needs Adam.
- The operating rule for focus is simple:
  if a task is interesting but off-plan, the system should challenge it, park it, or turn
  it into a bounded experiment instead of silently expanding scope.
