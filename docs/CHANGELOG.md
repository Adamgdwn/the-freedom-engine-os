# Changelog

## 2026-04-27 (stand-alone relay truth + hosted speech recovery)

- fixed Freedom Anywhere stand-alone mode so the slim build only advertises
  relay-backed `cloud` fallback when a real `FREEDOM_RELAY_SHARED_SECRET` is present;
  placeholder or missing relay secrets now force a truthful `notes_only` posture
- added authenticated relay-hosted fallback speech at
  `GET /api/mobile-companion/speech`, which restores spoken replies for stand-alone
  sessions when realtime voice is unavailable but the relay is reachable
- made the relay source self-contained for the current phone-hosted Termux deployment by
  removing the monorepo-only shared voice-profile import and teaching the relay to read
  `~/.freedom-relay.env` directly on startup
- regenerated the mobile runtime config against the real relay secret, rebuilt the
  Android APK, redeployed the phone install, and revalidated authenticated relay
  `/health`, `/chat`, and hosted-speech flows end to end
- bumped the Android release metadata to `versionCode 84` / `versionName 0.2.77`
  for the rebuilt standalone-fix APK

## 2026-04-26 (desktop and phone app icon refresh)

- replaced the generated Freedom desktop tray/launcher icon with the new robot owl
  brand mark
- added the same mark as the Freedom Anywhere app icon in Expo metadata, Android
  launcher mipmaps, and the iOS app icon catalog
- updated the Linux desktop launcher installer so local desktop entries reference
  the new PNG app icon asset
- bumped the Android release metadata to `versionCode 83` / `versionName 0.2.76`
  so the refreshed phone icon ships as a visibly newer APK
- fixed the Electron dev/build path so the desktop shell copies the PNG icon into
  `dist/assets` and uses it for both the window and tray icon
- replaced the legacy SVG launcher fallback with the robot owl mark and set the
  Linux desktop file name from Electron so the shell can associate the running app
  with the refreshed launcher icon
- added a new `freedom-robot-owl-icon.png` desktop asset and pointed the Linux
  launcher at that fresh filename to avoid stale icon caches

## 2026-04-26 (unified typed turns on the live Talk loop)

- unified Freedom Anywhere typed turns with the main live `Talk` conversation instead
  of treating typed sends as a separate side lane
- when `Talk` is already active, pressing the arrow now injects the typed text into the
  active Freedom voice session as a real turn and persists it in the canonical
  conversation history
- when the operator types first and presses the arrow before starting `Talk`, Freedom
  now starts the talk loop automatically and then routes that typed turn into it
- added a new realtime `text_turn` command on the Freedom voice worker so typed turns
  can be handled by the same LiveKit/OpenAI voice session instead of being rerouted
  through an unrelated text-only or fallback speech path
- clarified the mobile `Talk` composer copy and docs so the phone now describes the
  intended process directly: type, press the arrow, and Freedom continues the same
  live conversation

## 2026-04-26 (contacts registry + governed communications split)

- added a first canonical Supabase-backed contacts registry with contact cards and
  trusted email channels so desktop manual entry and retrieval now have one durable
  home instead of relying on a flat recipient list
- added a dedicated desktop `Contacts` control-plane page with an expandable
  instructions panel so the operator workflow is explicit: file people there, then
  use `Communications` for governed send review and delivery audit
- rewired the web/control-plane email path to prefer trusted email channels from the
  canonical contact registry while keeping the older recipient table as a compatibility
  lane during transition
- added a first-pass Freedom Anywhere typed contact-capture path so clear contact-style
  text entries can be recognized and saved into the canonical registry through the
  gateway without forcing a separate manual re-entry step
- positioned that new typed-capture lane as the start of a broader Freedom Anywhere
  training loop: the phone can read operator-supplied information, make a bounded
  judgment about what it likely is, and route it into governed storage while the
  conversation continues
- added a Supabase migration that backfills legacy trusted email recipients into the
  new contacts plus channels model so existing outbound-email data can move forward
  without a manual re-entry pass
- clarified the docs so `Contacts` is now the manual filing surface and
  `Communications` is the governed external-send surface
- kept the Android release lane aligned with the live runtime fixes from this branch:
  debug and release installs now stay distinct, the relay again defaults to `43311`,
  and the mobile runtime config points at the stable Tailscale hostname instead of a
  stale relay IP

## 2026-04-25 (durable local memory fallback + mobile processing indicator)

- fixed a core long-term-memory gap by making the desktop gateway keep a durable
  local cache of learning signals and conversation memories, so Freedom memory
  capture and recall no longer depend entirely on live Supabase availability
- taught the gateway memory digest and server-side runtime memory snapshot to
  merge that local durable cache with the remote memory store, which makes the
  rich long-term memory path materially more resilient during backend drift or
  partial local development setups
- seeded Freedom's operating-principle memory through the real memory sync path
  so rich long-term memory and self-improvement expectations are part of the
  live durable record instead of only existing as prompt wording
- added a small centered light-blue biohazard spinner to the Freedom Anywhere
  Start and Talk voice surfaces while Freedom is in the existing `processing`
  state, so the phone has a cleaner visual cue when Freedom is thinking or
  searching without inventing a second overlapping activity indicator

## 2026-04-25 (governed A3 operator-loop foundation)

- added a first canonical `A3` operator-run contract and ledger so Freedom can
  carry one governed run identity from request through consequence review,
  approval, desktop execution, evidence, and learning outcome instead of
  spreading that state across parallel queues
- wired the desktop gateway to persist and guard operator runs with allowed
  status transitions plus a real consequence-review gate before reviewed work
  can move into queued or running execution
- taught Freedom voice and governed build/self-programming entry points to
  create or continue operator runs early, preserve the same run id through the
  desktop lane, and stop at the review gate instead of silently bypassing it
- surfaced the live operator ledger in Agent Control and in connected Freedom
  Anywhere so the phone can see review gaps, approval posture, and recent runs
  from the same canonical source of truth
- added connected mobile consequence-review authoring plus governed continue,
  hold, and interrupt controls against the same desktop-backed run identity
- added stand-alone deferred operator-run drafts on the phone so offline capture
  can later import into the canonical ledger as `awaiting-approval` work rather
  than pretending to execute locally
- added structured operator-run learning outcomes and internalization
  recommendations so completed runs can retain evidence-backed lessons without
  claiming autonomous self-rewrite
- added gateway/mobile tests and a real-device validation runbook for the new
  desktop-plus-phone governed operator loop

## 2026-04-25 (ChatGPT memory triage loop)

- added a first-class ChatGPT memory-triage layer in the gateway so Freedom can
  evaluate completed text turns, connected voice turns, and offline-import
  sessions for what is actually worth durable learning instead of relying only
  on heuristics
- taught that triage layer to write governed `learning signals` and
  `conversation memories` into the existing canonical Freedom memory channels,
  keeping the base of the pyramid integrated instead of creating a second mobile
  or gateway-only learning model
- added a new pending `Open memory questions` lane in gateway state and memory
  digest output so Freedom can carry forward clarifying questions when evidence
  is incomplete instead of overcommitting weak memories
- fixed the connected voice bootstrap so the Python realtime worker now receives
  runtime memory context as well as recent thread messages, which closes the gap
  where Freedom could claim code access correctly but still answer the memory
  question from an under-hydrated prompt
- fixed derived conversation continuity so fallback memory extraction only uses
  user-stated context rather than accidentally memorizing Freedom's own earlier
  mistaken claims

## 2026-04-25 (canonical conversation memory lane)

- added a first-class conversation-memory lane to Freedom's durable memory
  model so reusable relationship, preference, project, and context carry-forward
  no longer depends only on staying inside one chat thread
- extended the mobile shared contract and gateway sync path so stand-alone
  Freedom Anywhere can queue conversation memories offline and merge them back
  into canonical Freedom memory on reconnect
- promoted completed gateway text turns, voice transcript turns, and offline
  import summaries into the same canonical conversation-memory store used by the
  runtime context and memory digest
- taught the gateway memory digest to surface conversation memory explicitly and
  to derive a continuity fallback from persisted session history when Supabase
  memory is still sparse or unconfigured

## 2026-04-25 (hybrid live control-plane snapshot overlay)

- added an async control-plane snapshot loader that prefers Supabase-backed
  ventures, workflows, workflow steps, experiments, approvals, and executions
  when configured, while preserving seeded fallback behavior for incomplete or
  local environments
- switched the main control-plane pages onto that async snapshot path so the web
  UI can inspect live venture and governance state instead of relying only on
  seed data
- updated recommendations and weekly-review derivation so they can operate on
  the live-overlaid snapshot instead of only the original seed arrays

## 2026-04-25 (live control-plane runtime summary bridge)

- added a shared Supabase-backed control-plane runtime summary loader in
  `@freedom/shared` so the gateway and the web control plane can read the same
  live top-venture, pending-approval, and weekly execution summary path
- added `GET /control-plane/runtime-summary` on the desktop gateway for
  loopback-only voice/runtime access to that live summary
- replaced the Freedom voice agent's `top_venture_status`,
  `pending_approvals`, and `weekly_metrics` stub strings with gateway-backed
  runtime reads that fall back safely when live Supabase data is unavailable
- updated Portfolio Home and Governance to show the live runtime summary when it
  exists, while preserving seeded fallback behavior for unconfigured or empty
  environments

## 2026-04-25 (stand-alone learning sync foundation + relay continuity bootstrap)

- extended the shared mobile voice-session contract so Freedom Anywhere can send
  recent completed thread turns into a new realtime voice session bootstrap,
  keeping desktop and relay voice continuity on one shared contract instead of
  splitting into transport-specific memory behavior
- fixed the relay voice bootstrap path so stand-alone realtime sessions can
  restore recent thread context the same way the desktop gateway path already did,
  rather than starting each new relay-backed room with only generic runtime context
- documented the architectural posture explicitly: desktop gateway, relay, and
  Freedom Anywhere are one Freedom runtime with shared continuity rules, not
  separate assistants with separate memory models
- added a first canonical write-back path for Freedom Anywhere stand-alone
  learning signals through the paired gateway, so mobile can queue durable
  learning candidates offline and sync them into Freedom's real persistent
  learning store after reconnect instead of keeping a second learning system on-device
- added a bounded offline learning-extraction pass during import-summary review,
  with conservative JSON extraction and explicit limits so only durable
  `learning` candidates are queued; self-programming and persona changes remain
  out of scope for stand-alone auto-sync in this phase

## 2026-04-22 (Freedom Anywhere recovery pass, release install cleanup, and reconnecting indicator fix)

- established the first-principles Freedom Anywhere recovery docs and implementation
  plan around the three canonical phone postures: `desktop_linked`, `reconnecting`,
  and `stand_alone`
- aligned shared mobile state contracts, gateway host-status production, and mobile UI
  copy around that simpler posture model
- cleaned up the connected Android device so only the current `com.freedommobile`
  install remained, then replaced the debug build with a release APK to remove Metro /
  Fast Refresh overlays from product evaluation
- moved the main connection banner off the voice canvas and into the settings sheet as a
  compact status mark beside `FREEDOM ANYWHERE SETTINGS`
- fixed that compact status mark so `reconnecting` still reads as connected to Freedom
  and only true `stand_alone` shows the disconnected mark

## 2026-04-22 (mobile Freedom voice precedence + connected posture hardening)

- changed mobile spoken-reply routing so Freedom-hosted speech now wins over any stale
  saved Android TTS choice instead of letting the old robotic phone voice silently
  hijack normal playback
- migrated legacy saved phone-native voice selections away on boot so new Freedom voice
  presets stay consistent across paired realtime sessions and non-realtime spoken replies
- fixed realtime reconnect handling on the phone so transient socket drops no longer flip
  a paired session into a false offline-safe `Saved for later` posture before the desktop is
  actually confirmed unreachable
- rebuilt and reinstalled Android `0.2.74 (81)` and verified the live UI now shows
  `Connected to desktop` on the start surface and `Premium voice ready` / `Listening` after tapping
  `Talk`

## 2026-04-21 (desktop launcher drift + env precedence hardening)

- fixed the Linux `Freedom Desktop` launcher installer path so the installed desktop entry
  is rewritten against this repo and no longer reopens the retired absorbed shell after
  a click or reboot
- hardened the desktop launcher script so it no longer sources broad shell startup files
  before launch, which had been re-injecting unrelated exported secrets and stale
  developer state into the gateway and desktop-host processes
- changed repo env loading for the gateway, desktop-host, wake relay, and the main repo
  utility scripts so repo `.env` values now override inherited shell variables instead of
  losing to stale exported values from the login environment
- removed the stale machine-level exported `OPENAI_API_KEY` override from the user shell
  startup path so live Freedom services stop drifting back to the wrong key after restarts

## 2026-04-21 (disconnected web companion default + mobile talk layout + release 0.2.74)

- fixed the slim Android runtime config so a configured `MOBILE_DEFAULT_BASE_URL` now
  automatically enables the disconnected web companion path instead of silently compiling
  the app back to `notes_only`
- fixed disconnected web companion fallback so the phone now tries the current paired
  host first and then falls back to the configured install/web companion host, instead of
  getting stuck on one unreachable URL
- tightened the mobile `Talk` canvas headline sizing and transcript panel behavior on
  narrow phones so long states like `Reconnecting` and `Disconnected companion` no longer
  break awkwardly or hide too much transcript content at once
- published Android `0.2.74 (81)` to the live install surface

## 2026-04-21 (desktop voice worker lock + durable logs)

- hardened the desktop-host voice worker supervisor with a persisted lock under
  `DESKTOP_DATA_DIR/voice-worker/worker.lock.json` so multiple desktop-host launches do
  not silently stack duplicate LiveKit/OpenAI workers
- taught the supervisor to recover stale locks from dead desktop-host processes and
  terminate orphaned managed workers before relaunching a clean replacement
- added a durable worker log at `DESKTOP_DATA_DIR/voice-worker/worker.log` so premium
  mobile voice failures can be debugged after the fact instead of depending on a live
  terminal session
- stopped resolving the worker shell and `agents/freedom_agent` directory from brittle
  hardcoded paths, so desktop-host autostart now uses the active shell path and the
  supervisor module location instead of depending on a specific `/bin/bash` layout or
  launch cwd

## 2026-04-21 (slim Android release path, disconnected web companion path, and releases 0.2.71-0.2.73)

- changed the default Android release path back to a slim APK by disabling the bundled
  GGUF model unless `MOBILE_BUNDLED_OFFLINE_ENABLED=true` is explicitly requested
- added separate offline release scripts so the heavy on-device model build is still
  available intentionally instead of silently inflating every install
- added a server-side `/api/mobile-companion` route on the live gateway plus mobile runtime
  config hooks so disconnected turns can use the same `43111` install host instead of
  requiring a second web server, while the slim default build still falls back to cached
  chats plus saved ideas when that route is not configured
- fixed the disconnected companion client so it now uses the phone's active paired host
  URL first instead of always calling the baked-in fallback URL, which could stall
  replies on LAN-only sessions
- added explicit request timeouts to the mobile web companion path so stalled upstream
  calls fail with a real error instead of leaving the phone waiting forever
- added a realtime voice responder watchdog so `Talk` now surfaces a clear error if the
  phone joins a LiveKit room but no desktop voice worker answers
- published Android `0.2.73 (80)` to the live install surface

## 2026-04-21 (install surface URL fix and release 0.2.69)

- changed the install surface so it now prefers the exact host URL it was opened with
  for pairing instructions, QR targets, and APK links, instead of always steering the
  phone back to the Tailscale hostname even during same-LAN setup
- kept the Tailscale URL visible as an explicit recovery path when it differs from the
  active install-page URL, so local setup stays easy without losing the remote path
- updated the Android pairing copy to say the desktop URL can be a local-network URL or
  a Tailscale URL, as long as the phone can actually reach it
- published Android `0.2.69 (76)` to the live install surface

## 2026-04-21 (offline mobile companion, voice recovery, and release 0.2.68)

- expanded the live Freedom voice agent so it can inspect governed repo control files
  and tool manifests directly from approved roots, including `project-control.yaml`,
  `docs/tool-permission-matrix.md`, `AI_BOOTSTRAP.md`, and registered `freedom.tool.yaml`
  files, instead of bluffing when asked what rules or tools govern it
- added live voice wrappers for dispatcher registry review, manifest inspection, registry
  reload, and approval-gated dispatcher autonomy changes so the runtime prompt and the
  callable tool surface are back in sync
- added an approval-gated bridge from the live voice runtime into the desktop
  programming lane, so Freedom can queue real repo work through the governed desktop
  shell after explicit operator confirmation instead of stopping only at a programming request
- added an Android offline companion path that keeps cached chats available when the
  paired desktop is unreachable, runs a bundled on-device GGUF ideation model, and
  stores offline work as local-only transcripts plus reviewable import drafts instead of
  pretending the phone can execute desktop work by itself
- added a safe gateway `offline-import` path that writes imported offline summaries and
  draft turns into canonical history as non-executing `system` notes, with explicit
  `Continue with Freedom` drafting instead of automatic replay into live desktop tasks
- hardened mobile voice handling across the fallback and realtime lanes: partial
  transcript fallback commit, duplicate voice-turn suppression, better stale-busy thread
  avoidance, safer direct TTS fallback, and Android speech null-guard handling
- taught the desktop host to autostart and supervise the Python LiveKit/OpenAI voice
  worker whenever the required `LIVEKIT_*` and `OPENAI_API_KEY` env is present, so
  premium mobile `Talk` no longer depends on a second manually started process
- added host-restart recovery for orphaned queued/running tasks and a fresh-thread retry
  path when reused Codex threads stall without output
- fixed the double-voice interrupt regression by suppressing phone-local auto-read during
  active realtime voice sessions, clearing local speech spillover when realtime starts,
  and stopping local playback immediately when the user interrupts
- published Android `0.2.68 (75)` to the live install surface

## 2026-04-20 (realtime conversation continuity fix)

- fixed the premium mobile realtime voice lane so new voice sessions now bootstrap from
  the recent thread instead of acting like each reconnect starts with no conversational context
- added transcript persistence for realtime user and assistant turns into the gateway's
  threaded session history, so Freedom can actually carry forward recent conversation
  instead of only retaining separate task/learning memory channels

## 2026-04-20 (realtime voice choices cleanup + release 0.2.50)

- replaced the misleading mobile settings voice list with Freedom's real live realtime
  voice presets, so the quick picker now shows Marin and the other actual voice options
  instead of odd phone TTS voices that do not match live conversation
- moved the device-only spoken-reply fallback voices back behind Homebase, where they
  stay available for backup playback without competing with the primary Freedom voice lane
- published Android `0.2.50 (57)` to the live install surface

## 2026-04-20 (remove stray chat back control + release 0.2.49)

- removed the leftover back-arrow control from the mobile voice chat header so the talk
  surface now matches the clean start header layout again: hamburger on the left, title
  centered, three dots on the right
- published Android `0.2.49 (56)` to the live install surface

## 2026-04-20 (voice worker env precedence fix)

- changed the Python LiveKit/OpenAI voice worker to prefer repo-root `.env` values over
  stale shell-exported secrets, so local restarts use the same `OPENAI_API_KEY` as the
  paired desktop runtime instead of silently picking up an older invalid key from `.bashrc`

## 2026-04-20 (split mobile actions from settings + release 0.2.48)

- removed the `From Conversations To Build` card from the main start voice surface so
  the talk-first canvas stays visually lighter
- moved that governed build-lane queue into the pull-down utility sheet, where Freedom
  can surface it intentionally when a thread should graduate into real build work
- split the mobile header menus so the three-line pull-down now holds actions and
  capabilities, while the three dots hold genuine settings like voice choices, reply
  behavior, build/runtime details, and system adjustments
- published Android `0.2.48 (55)` to the live install surface

## 2026-04-20 (transcript collapse visibility + settings scroll fix + release 0.2.47)

- moved the `Recent thread` transcript into its own bounded scroll area on the mobile
  voice canvas so long histories no longer push the `Collapse` action offscreen
- changed the utility/settings sheet to use a separate backdrop overlay and inner
  scroll view, which improves scroll reliability on Android when the sheet is long
- published Android `0.2.47 (54)` to the live install surface

## 2026-04-20 (single recent-thread control + release 0.2.46)

- removed the duplicate recent-thread trigger from the center `Freedom` stage on the
  mobile voice canvas so the lower `Recent thread` card is now the only transcript entry point
- changed the transcript close affordance to `Collapse` and kept that action inside the
  opened thread panel so the history surface has one obvious escape path
- published Android `0.2.46 (53)` to the live install surface

## 2026-04-20 (Perplexity default search runtime)

- added a live runtime-status tool so Freedom can report the published mobile build,
  live Freedom voice profile, desktop voice runtime provider/model, and web-search readiness in conversation
- added Perplexity-backed `search_web` and `check_weather` tools to the LiveKit/OpenAI
  voice worker so current public lookups no longer fall back to "no web search access"
- updated the runtime policy, env template, and capability docs so Perplexity is the
  default configured search lane whenever `PERPLEXITY_API_KEY` is present in repo-root `.env`

## 2026-04-20 (compact text control + release 0.2.45)

- shrank the idle typed-entry control on the mobile voice canvas down to the same compact footprint as `Mute` and relabeled it `Text` now that the raised composer behavior is clearer
- kept explicit new project threads in the `Build` view while leaving the default voice thread optimized for conversational continuity rather than endless project sprawl
- published Android `0.2.45 (52)` to the live install surface

## 2026-04-20 (reversible recent-thread toggle + release 0.2.44)

- made the center Freedom dialogue on the mobile voice canvas act as a real toggle for recent-thread history, so the same surface that opens the transcript can also close it
- renamed the transcript panel action from `Hide` to `Close` and added a visible center hint so the escape path is clearer during phone use
- published Android `0.2.44 (51)` to the live install surface

## 2026-04-20 (raised mobile message composer + release 0.2.43)

- changed the mobile voice canvas so the footer `Message` control opens a dedicated typed-turn panel above the bottom action row instead of only swapping the footer into a subtle inline field
- added a top-right collapse affordance to that composer and clarified the transcript preview as a `Recent thread` surface so typed input and conversation history no longer feel like the same control
- published Android `0.2.43 (50)` to the live install surface

## 2026-04-20 (android text encoder startup fix + release 0.2.42)

- added an early mobile runtime `TextEncoder` and `TextDecoder` polyfill alongside the existing `DOMException` patch so Hermes no longer aborts during startup when the voice stack references text encoding globals
- published Android `0.2.42 (49)` to the live install surface

## 2026-04-20 (android voice recognizer compatibility fix + release 0.2.41)

- replaced the Expo speech-recognition runtime path with the existing `@react-native-voice/voice` adapter in the mobile companion to stop the native `SpeechRecognitionOptions` registration error on startup under the current Expo/RN stack
- kept the live voice loop behavior in place with restart handling, partial/final transcript promotion, and clearer Android recognizer readiness errors
- published Android `0.2.41 (48)` to the live install surface

## 2026-04-20 (mobile voice surface polish + release 0.2.40)

- replaced the footer `+` action on the mobile voice surfaces with an explicit mute/unmute control for the live microphone lane
- changed the inline chat composer so it expands upward when focused, giving typed side-channel turns more room without breaking the voice-first layout
- repurposed the mobile three-dots utility sheet around first-pass email/contact capture and retrieval instead of a generic destination list

## 2026-04-20 (conversation build lane runtime + release 0.2.39)

- Freedom voice runtime can now route substantial conversation-born build ideas into
  governed `freedom_programming_requests` records with structured Pop!_OS build-lane
  metadata instead of leaving the process documentation-only
- the desktop agent-control surface now prefers live build-lane records over seeded
  mock requests, so queued work reflects what conversation actually created
- the Android companion now reads and displays the live `From Conversations To Build`
  queue so approval-needed work remains visible from the voice-first surface
- gateway and shared contracts now expose a live build-lane summary endpoint, and the
  voice worker prompt/tooling now explicitly distinguishes loose ideas from governed
  build-session candidates

## 2026-04-19 (conversation-to-build governance lane)

- added a dedicated `From Conversations To Be Done On Pop!_OS` section to the roadmap
  so serious ideas from the app conversation surface have an explicit path into real
  desktop build sessions
- added `docs/conversation-build-lane.md` to define the intended operating loop:
  conversation intake, business framing, approval posture, Pop!_OS execution, and
  report-back expectations for a mostly autonomous business-partner posture
- updated architecture, manual, runbook, current-capabilities, risk, and tool-access
  docs so Freedom's programming direction now emphasizes governed execution, external
  connector posture, and executive-level business-case thinking rather than generic
  voice-assistant behavior

## 2026-04-19 (conversational voice profile + release 0.2.38)

- added a host-level realtime voice profile so Freedom can save conversational requests
  for voice, gender presentation, accent hints, tone, warmth, and pace instead of
  relying on one global env voice
- wired the LiveKit/OpenAI voice agent to review and update that profile through tools,
  and to load the saved preset plus delivery hints at the start of a new voice session
- surfaced the live Freedom voice profile in the Android companion so it is clear that
  the realtime voice is separate from the phone&apos;s local `Spoken Reply Voice` fallback
- bumped Android release metadata to `versionCode 45` / `versionName 0.2.38`

## 2026-04-19 (runtime cleanup hardening + release 0.2.37)

- tightened gateway voice-session minting so mobile realtime voice can only bind to a
  chat session owned by the paired device instead of trusting any arbitrary session id
- hardened the mobile realtime room service against stale disconnect and data callbacks
  from old LiveKit rooms, which reduces wrong-session state flips after reconnects or
  rapid restarts
- taught the gateway install and Android download routes to answer normal `HEAD`
  probes cleanly, so health checks and release verification no longer misread the live
  install surface as missing when the browser path is actually healthy
- configured the voice worker to delete its LiveKit room on close and removed the live
  host/device state JSON files from source control so the repo keeps only the sanitized
  bootstrap examples under `.local-data`
- bumped the Android release metadata to `versionCode 44` / `versionName 0.2.37` so this
  cleanup pass ships as a distinct installable build

## 2026-04-19 (mobile voice runtime recovery + release 0.2.36)

- fixed the Android fallback recognizer picker so the phone no longer treats the
  Google text-to-speech package as a valid speech-recognition service, which was
  leaving some installs stuck on silent or non-starting voice capture
- configured the LiveKit OpenAI Realtime worker to enable explicit input transcription,
  semantic turn detection, and supported realtime voice normalization so spoken mobile
  turns promote into real assistant responses instead of hanging after the room connects
- scrubbed `.env.example` back to template placeholders and aligned its voice defaults
  with the live runtime: repo-root `.env` for real secrets, `gpt-realtime-mini`, and
  `marin`
- bumped the Android release metadata to `versionCode 43` / `versionName 0.2.36` so this
  voice-recovery pass ships as a distinct installable build

## 2026-04-19 (android startup DOMException fix + release 0.2.35)

- added a mobile startup `DOMException` polyfill before app bootstrap so the Android
  companion no longer aborts during bundle load on devices where Hermes does not expose
  that web global by default
- kept the fix at the earliest mobile entrypoint so runtime libraries that assume a web-like
  `DOMException` can initialize without crashing the app before the React error boundary mounts
- bumped the Android release metadata to `versionCode 42` / `versionName 0.2.35` so this
  startup-fix pass ships as a distinct installable build

## 2026-04-17 (mobile realtime voice runtime slice + Android release 0.2.34)

- added a first shared mobile realtime voice path so the Android companion can request a
  LiveKit voice session from the paired gateway and connect directly to the existing
  OpenAI Realtime agent instead of always forcing voice through device STT, gateway text,
  desktop execution, and device TTS
- added gateway-side LiveKit token minting for authenticated paired devices through
  `POST /voice/runtime/session`, using explicit mobile voice-session ids and the shared
  voice-runtime binding contract
- added a dedicated mobile `RealtimeVoiceService`, LiveKit React Native bootstrap, and
  runtime metadata in the utility sheet so the APK can prefer the premium voice path and
  degrade back to the older device STT/TTS loop only when realtime credentials are not
  configured on the desktop
- bumped the Android release metadata to `versionCode 41` / `versionName 0.2.34` so this
  realtime-mobile migration ships as a distinct installable build

## 2026-04-17 (android interrupt gating fix + release 0.2.33)

- tightened Android voice barge-in detection so speech is only treated as an interrupt
  while Freedom is actually speaking, instead of while a stale assistant draft exists or
  the backend session is merely still busy
- clear the mobile assistant-draft state when spoken playback ends or errors so a normal
  follow-up turn is not misclassified as another barge-in
- bumped the Android release metadata to `versionCode 40` / `versionName 0.2.33` so this
  interrupt-fix pass ships as a distinct installable build

## 2026-04-17 (Codex-first day-to-day routing default)

- changed the shared model-router default so day-to-day operating work now prefers
  `Codex` instead of the old local-first default posture
- changed the example environment config to `FREEDOM_DAY_TO_DAY_PROVIDER=codex` so new
  setups match the intended premium conversational behavior out of the box
- updated the capability reference, control-plane router copy, and platform spec so the
  documented policy now matches the shipped runtime default: `Codex` first, local as an
  explicit optional cheaper lane

## 2026-04-17 (reference-driven voice migration groundwork)

- added a shared voice-runtime contract in `packages/shared/src/contracts/voiceRuntime.ts`
  so web, mobile, gateway, and desktop can converge on one session/control model instead
  of continuing to grow separate ad hoc voice state
- added `docs/specs/reference-voice-migration-plan.md` to pin the migration to proven
  OpenAI Realtime, LiveKit, and realtime-agent patterns rather than further heuristic tuning
- corrected the capability reference to say the web realtime lane is the only primary-grade
  voice path today and that the current mobile device STT/TTS loop should be treated as a
  degraded path while the realtime mobile migration is underway

## 2026-04-17 (android voice latency and self-interrupt tuning + release 0.2.32)

- changed Android voice sessions to pause recognition while Freedom is speaking so the
  phone stops hearing Freedom's own spoken reply and interrupting itself
- reduced the mobile voice turn commit grace from 1400ms to 450ms so captured turns move
  into send/reply faster after the user stops speaking
- reduced Android speech end-silence thresholds and lowered the streaming TTS chunk
  threshold so replies begin sooner instead of waiting for longer pauses and longer text
- bumped the Android release metadata to `versionCode 39` / `versionName 0.2.32` so this
  latency and self-barge tuning ships as a distinct installable build

## 2026-04-17 (android single-turn capture fallback + release 0.2.31)

- changed Android live voice capture to stop using the continuous segmented recognizer mode
  and instead run one utterance at a time with immediate reconnect, because the segmented
  path was still producing dead turns and empty-result loops on the plugged-in phone
- added runtime logging around recognizer start, speech results, and end-of-turn transcript
  promotion so the live device logs now show whether a spoken turn reached partial result,
  final result, or end-of-session promotion
- bumped the Android release metadata to `versionCode 38` / `versionName 0.2.31` so this
  capture-stability fallback ships as a distinct installable build

## 2026-04-17 (android utterance commit repair + release 0.2.30)

- fixed Android live voice so a spoken turn is still committed when the recognizer ends
  without marking the last transcript as `isFinal`, which was leaving complete utterances
  stranded in the partial path and making the voice surface look hung after capture
- added a regression test covering the recognizer-end path that now promotes the latest
  transcript into a final turn before the listening loop reconnects
- bumped the Android release metadata to `versionCode 37` / `versionName 0.2.30` so this
  voice-turn commit fix ships as a distinct installable build

## 2026-04-17 (mobile voice auto-send recovery + release 0.2.29)

- fixed the mobile voice capture flow so turns that are captured while auto-send is off
  no longer stall in a misleading `processing` state; they now pause into explicit review
  with a clear notice that the turn is waiting for manual send
- added a safe settings migration for legacy installs that inherited the brief
  `autoSendVoice=false` default, so Freedom restores auto-send unless the user explicitly
  chose to turn it off
- surfaced the current `Auto-send voice turns` state directly inside the mobile utility
  sheet so the phone can show and change that behavior without sending the user hunting
  through Homebase settings
- bumped the Android release metadata to `versionCode 36` / `versionName 0.2.29` so this
  stuck-turn recovery ships as a distinct installable build

## 2026-04-17 (android on-device locale pin + release 0.2.28)

- changed Android live voice to explicitly request the installed device locale when using
  the on-device `com.google.android.as` recognizer instead of leaving the locale implicit
- enabled `requiresOnDeviceRecognition` for that on-device recognizer path so phones that
  already have the matching model installed do not fall back into the stale
  `language-not-supported` failure despite reporting the locale as available
- bumped the Android release metadata to `versionCode 35` / `versionName 0.2.28` so this
  recognizer-start fix ships as a distinct installable build

## 2026-04-17 (mobile about/build metadata + Android release 0.2.27)

- added an `About this build` section to the mobile utility menu so the phone can show
  the installed app version and Android build code directly in the UI
- wired the displayed version metadata through the generated mobile runtime config so the
  build number shown in-app tracks the APK release metadata instead of a hand-maintained label
- bumped the Android release metadata to `versionCode 34` / `versionName 0.2.27` so this
  operator-facing verification improvement ships as a distinct installable build

## 2026-04-17 (android speech recognizer repair + voice send default)

- stopped trusting Android's raw `voice_recognition_service` default when it points at
  `com.google.android.tts`, because that configuration was reproducing empty transcripts
  on the plugged-in test phone even though speech capture started and ended normally
- changed the mobile recognizer chooser to prefer a real speech recognizer such as
  `com.google.android.as` before falling back to the TTS-backed package
- stopped forcing `en-US` for Android speech recognition and now let Android use the
  device-default recognizer language, which avoids the flashed "language not yet
  downloaded" failure on the plugged-in `en-CA` phone
- stopped the voice loop from immediately auto-retrying after fatal STT errors so the
  error state stays visible instead of flashing past in a restart loop
- taught the Android recognizer chooser to check whether `com.google.android.as` actually
  has the current locale model installed before selecting it, and to fall back to the
  remaining recognizer service instead of repeatedly choosing a known-bad path
- when the phone only exposes the missing on-device model plus the TTS-backed recognizer,
  the app now opens Android's offline speech-model download flow and tells the user to
  approve it instead of dead-ending on the flashed locale-pack error banner
- restored mobile voice auto-send as the default behavior while keeping risky or unusually
  long spoken turns on the existing review path instead of silently running them
- added a mobile regression test that covers the broken `com.google.android.tts` default
  recognition-service case, the missing-locale-model fallback, the offline-model-download
  prompt path, and the fatal-STT-error reconnect loop so these failures are less likely
  to ship again

## 2026-04-17 (voice runtime hardening + latency pass)

- changed the live voice default to `gpt-realtime-mini` and aligned the shared router,
  Python worker, and capability metadata around that cheaper realtime baseline
- replaced the old shared-room browser token flow with short-lived, explicit web voice
  session ids so LiveKit rooms are no longer minted anonymously into one common room
- pinned mobile live voice loops to one chat session at a time so switching chats no
  longer silently reroutes speech capture or spoken replies across sessions
- changed mobile barge-in to request a backend stop as soon as an interrupt is detected
  instead of waiting for transcript commit to begin cancelling the current run
- switched desktop-host work pickup from a fixed one-second polling loop to gateway
  long-polling so new work and interrupts reach the desktop faster when idle
- changed gateway assistant streaming to defer state-file persistence instead of writing
  the full JSON store on every delta token
- turned mobile voice auto-send off by default and expanded spoken-turn review gating for
  riskier file, outbound, deployment, and system-action phrases
- refreshed the current-capabilities reference and mobile settings copy so the docs now
  describe the shipped voice behavior more honestly
- bumped the Android release metadata to `versionCode 29` / `versionName 0.2.22` so this
  runtime hardening pass ships as a distinct installable build

## 2026-04-16 (mobile voice selector refinement + Android release 0.2.21)

- replaced the mobile spoken-reply picker with a curated shortlist and clearer human-tone
  indicators so warmer, less robotic voices are easier to spot
- updated automatic spoken-reply selection to prefer richer English voices instead of
  defaulting to the first locale match
- bumped the Android release metadata to `versionCode 28` / `versionName 0.2.21` so this
  selector update ships as a distinct installable APK

## 2026-04-16 (voice footer spacing correction + Android release 0.2.20)

- fixed the actual active `Talk` canvas footer spacing by separating the bottom offset used for the voice controls from the much larger reserve used for the hidden utility sheet.
- lowered the voice control row toward the system gesture area without changing the button sizes, labels, or the sheet behavior when extra tools are shown.
- bumped the Android release metadata to `versionCode 27` / `versionName 0.2.20` so this correction ships as a clearly newer APK.

## 2026-04-16 (launch spacing trim + Android release 0.2.19)

- reduced the `Start` screen bottom reserve so the launch canvas sits lower on tall phones without changing the button sizes or control row layout.
- kept the voice controls themselves unchanged and only adjusted the safe-area padding used by the launch surface.
- bumped the Android release metadata to `versionCode 26` / `versionName 0.2.19` so this spacing-only follow-up ships as a distinct APK.

## 2026-04-16 (voice canvas follow-up + Android release 0.2.18)

- kept the main phone chat surface on a true voice canvas instead of reopening the older panel-first composer stack during active work.
- moved typed draft handling into the bottom control row so `Type` behaves more like a compact inline field and no longer expands into a large card just because draft text exists.
- suppressed the heavy global banner stack on `Start` and `Talk`, replacing it with lighter in-surface status pills so the voice screen stays visually calmer.
- changed the busy state affordance so the primary action becomes `Stop` while the current run is active, avoiding the stale "chat is busy" panel flow that made the redesign feel unchanged.
- bumped the Android release metadata to `versionCode 25` / `versionName 0.2.18` so this follow-up ships as a clearly newer APK.

## 2026-04-16 (mobile voice surface simplification + Android release 0.2.17)

- stripped the default mobile entry and talk surfaces down to a much lighter voice-first layout
  so the phone now behaves more like a focused conversational surface and less like a stacked dashboard
- moved Build and Homebase farther behind the utility layer on the default phone surface to reduce chrome
  while preserving the same underlying functionality
- rebuilt the primary phone affordances around a cleaner voice header, larger empty-state center stage,
  and a compact bottom action row inspired by modern voice-assistant patterns
- bumped the Android release metadata to `versionCode 24` / `versionName 0.2.17` so this visual pass
  publishes as a unique installable update instead of reusing the prior APK identity

## 2026-04-16 (android release publishing + live install-page hardening)

- added a repeatable Android publish script so the local Freedom mobile release can be copied
  into the currently live website-backed APK directory with backups and checksum verification
- added a one-command `npm run release:android-live` flow so building and publishing the APK
  happen together instead of relying on a manual copy step
- documented the exact publish target and verification path for the current live install
  surface to reduce the chance of serving an outdated APK again
- updated the live gateway install-page code path to expose build-specific Android filenames,
  version metadata, and direct build-aware download URLs while keeping `latest.apk` as a
  compatibility alias

## 2026-04-16 (mobile voice-first redesign + Android release 0.2.16)

- reshaped the Freedom Android companion around a calmer `Start -> Talk -> Build -> Homebase`
  flow so the phone no longer opens like a compressed dashboard
- made the dedicated Talk surface more voice-first by keeping the voice state dominant,
  collapsing the active thread by default, and only expanding transcript/manual tools
  when the user asks or the current state requires it
- demoted status-heavy controls into Homebase and the utility sheet so wake, trusted
  devices, outbound email, and connection detail stay available without polluting the
  main mobile experience
- updated the React Native UI test harness to resolve one React instance during tests and
  refreshed the shell assertions for the new mobile navigation model
- bumped the distributed Android build metadata to `versionCode 23` / `versionName 0.2.16`
  so the fresh APK can be installed as a new release

## 2026-04-16 (runtime router milestone pass)

- extracted the core Freedom persona into a dedicated prompt artifact and stopped treating
  the full business-partner identity as an inline string inside the Python worker
- added a new durable persona-overlay memory channel plus approval-gated persona-adjustment
  requests so personality refinements can persist without silently rewriting the core prompt
- wired approved persona overlays into runtime context hydration so Freedom's style can
  evolve in governed ways alongside learning and self-programming signals
- added a dedicated Personality control-plane page so pending persona adjustments can be
  approved, denied, or retired through a visible operator review surface
- added persona-overlay lineage and retirement support so Freedom can propose revisions
  to active overlays or retire stale ones, with supersession happening only after approval
- added a shared model-router module and environment-backed routing config so the intended
  local-first policy is now computed from one place instead of being implied only by docs
  and seed prose
- added `OpenAI / ChatGPT` as a first-class routed escalation option and changed the
  escalation model from “one provider chosen by Freedom” to “recommended provider plus
  operator-selectable choices and audited final selection”
- added a real desktop-host routing path for non-voice work: routine read-only turns can
  run through a configured local command bridge, while heavier code/build work routes
  through the operator-selected external lane
- changed the host so Codex login is only required for Codex-routed work instead of
  blocking every desktop turn, and relaxed gateway availability so a configured local
  lane can still count as runnable when Codex is logged out
- wired execution-budget defaults to that shared router logic and surfaced runtime-status
  messaging in the Model Router page so the gap between intended routing and the current
  live voice runtime is explicit in the control plane
- documented the exact routing posture more clearly: local for day-to-day work, Codex for
  heavier code/build tasks with approval, Claude Code for broad synthesis with approval,
  while voice still uses paid OpenAI Realtime today
- added sanitized bootstrap state fixtures for desktop-host and gateway so new clones can
  start with shareable example state while live `.local-data` remains local-only

## 2026-04-16 (typed knowledge + routing-model pass)

- implemented typed knowledge-governance contracts in the TypeScript domain layer for
  documentation decisions, knowledge artifacts, artifact placement, retrieval records,
  canonical source links, skill-acquisition decisions, and retention policy
- added seeded control-plane data for knowledge stewardship so the modeled system now has
  concrete examples of document / summarize / discard decisions and durable artifact placement
- added execution-budget examples to the Model Router surface so the intended policy is
  visible in code and UI: local for day-to-day work, Codex for heavier code/build work,
  and Claude Code for broad synthesis after approval
- clarified in the capability reference that this routing posture is modeled in the control
  plane, while the live voice runtime still uses paid OpenAI Realtime today

## 2026-04-16 (mobile voice interrupt + tts routing fix)

- kept the mobile speech recognizer live during assistant playback so spoken barge-in can
  interrupt replies instead of waiting for TTS to finish
- fixed mobile spoken-reply voice routing so an explicit voice selection can pull TTS back
  onto the matching backend after a fallback instead of silently drifting to the last
  successful engine
- replaced the mobile spoken-reply picker with a curated shortlist and clearer human-tone
  indicators so warmer, less robotic voices are easier to spot
- updated automatic spoken-reply selection to prefer richer English voices instead of
  defaulting to the first locale match

## 2026-04-16 (knowledge-governance pass)

- expanded the self-evolving platform spec with a knowledge-governance layer so Freedom is
  expected to decide when to document, summarize, archive, discard, or cross-link chats
  and artifacts rather than treating all conversation history as equally worth keeping
- added policy and contract language for skill-acquisition decisions, artifact placement,
  canonical source-of-truth tracking, and retrieval readiness
- updated the roadmap and capability reference so knowledge quality, document placement,
  and retrieval behavior are now part of the planned co-founder-grade operating model

## 2026-04-16 (outcome-model pass)

- expanded the self-evolving platform spec with an explicit outcome engine so Freedom's
  future recommendations can compare `build`, `automate`, `delegate`, `simplify`, `stop`,
  `defer`, and `redesign` rather than implicitly defaulting to build-first reasoning
- added concrete outcome score dimensions, decision outputs, contracts, and integration
  direction so the co-founder / trusted-advisor posture can eventually map into runtime code
- updated the roadmap and capability reference to show that outcome-driven orchestration is
  now specified but not yet wired into live recommendations or workforce routing

## 2026-04-16 (vision alignment pass)

- updated the self-evolving platform spec to reflect Freedom more explicitly as an
  almost-autonomous co-founder / trusted advisor that optimizes for long-term personal
  and organizational freedom outcomes
- clarified that Freedom should look for the best reachable solution, not just the best
  immediate solution within inherited assumptions
- expanded the plan to include workforce orchestration, build/automate/delegate/stop
  decision posture, and a lighter day-to-day governance feel with hard boundaries still
  preserved around the most consequential actions
- adjusted the roadmap and capability reference so the broader co-founder-grade agentic OS
  direction is visible while remaining clearly separated from what is live today

## 2026-04-16 (approval-gated autonomy loop pass)

- strengthened the Freedom Python worker prompt from a general partner posture into a more
  explicit operating policy covering topic shifts, side questions, checkpointing, durable
  learning thresholds, truthfulness about missing research capability, and approval-gated
  improvement requests
- added read/query tools so Freedom can inspect open tasks, recent learning signals,
  pending self-programming requests, and trusted email recipients instead of acting only
  from a thin write-only tool surface
- expanded startup context hydration so the live voice session now sees parked/open task
  state alongside learning, pending programming requests, and trusted recipients
- updated controlled docs to make the approval-gated autonomous partner direction explicit
  while still marking live external research as not yet operational in the current runtime

## 2026-04-16 (review follow-up)

- refreshed `docs/current-capabilities.md` so the primary live-capability reference now
  includes task-aware routing / bounded parallel voice work and build-specific Android
  APK identifiers from the latest April 15 runtime changes
- tightened the web voice memory persistence path so `/api/freedom-memory` server errors
  no longer look like successful durable writes in the browser
- fixed `npm run typecheck:workspace` so the workspace-level TypeScript validation command
  runs without the project-reference `--noEmit` build-mode conflict

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
  absorbed desktop process retired; install page at
  `pop-os.taildcb5c5.ts.net:43111/install` serves the new APK
- `.env` seeded in `the-freedom-engine-os` with gateway, Supabase, and outbound-email config

## 2026-04-15

- absorbed the legacy companion repo as native monorepo — `apps/mobile`, `apps/gateway`,
  `apps/desktop`, `apps/desktop-host`, `apps/wake-relay`, `packages/shared`,
  `packages/core`, `packages/provider-adapters` all live inside Freedom Engine OS
- legacy package scope renamed to `@freedom/*` throughout
- npm workspaces configured at repo root; `tsconfig.workspace.json` and
  `tsconfig.base.json` added for composite node package builds
- `.npmrc` added (`legacy-peer-deps=true`) for React Native Firebase peer dep
- `scripts/` merged from both repos; `build-android-release.sh`, `launch-freedom-desktop.mjs`,
  `write-mobile-runtime-config.mjs`, and others are now runnable from Freedom root
- `.env.example` extended with gateway, desktop-host, mobile, and wake-relay vars
- docs from the absorbed mobile companion merged in: `outbound-email-setup`, `voice-realtime-architecture`,
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
- documented the native phone-access architecture for Freedom Engine
- added a focus-guardrail policy and prompt so the system can flag off-roadmap drift
