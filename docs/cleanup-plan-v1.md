# Freedom Engine OS — Cleanup & Integration Plan v1

Coding-team handoff. Work top-to-bottom. Each phase is self-contained; do not skip ahead. Open one PR per phase (or per numbered step in Phase 4). Update docs in the same PR as the change.

## Read this before starting any phase

- **Stay on the listed step.** Do not refactor adjacent code, rename things, or "while I'm here" cleanups. If you see something broken outside your step, note it in the PR description under "Found in passing" — do not fix it inline.
- **Think about impact before you type.** For every change ask: does this break the voice loop? does this break pairing/session identity? does this change an API the mobile app or dispatcher relies on? If yes, stop and flag it in the PR before continuing.
- **Corrections you find as you go are expected and wanted.** If a step in this plan is wrong, outdated, or has a better alternative: stop, write a short note in the PR (what you found, what you propose, why), and wait for review. Do not silently deviate; do not push through a known-wrong step.
- **Voice-first is non-negotiable.** The phone app and desktop voice session are the product's primary surface. Every change must preserve: voice session start latency, wake-word/pairing flow, the self-mute-during-TTS fix in [src/components/voice-interface/voice-context.tsx](../src/components/voice-interface/voice-context.tsx), the mobile offline ideation posture, and the voice agent's ability to call tools mid-turn. If a change risks any of these, stop and flag it.
- **Test on voice before marking a phase done.** A green `npm run build` is necessary but not sufficient. Start a voice session, confirm Freedom still listens, speaks, and can call at least one tool end-to-end. Phase 1/1b/2 especially: confirm on both desktop voice and the mobile companion.

## Context in one paragraph

The repo has two tool systems that don't talk: the voice agent hardcodes ~30 `@function_tool`s at startup ([agents/freedom_agent/agent.py](../agents/freedom_agent/agent.py), [agents/freedom_agent/tools.py](../agents/freedom_agent/tools.py)), and the Freedom Dispatcher auto-discovers `freedom.tool.yaml` manifests under `~/code/**` ([agents/freedom-dispatcher/](../agents/freedom-dispatcher/)) but only holds 3 meta-manifests. Goal of this cleanup: one manifest-driven tool surface, one persistence story, fewer monoliths, fewer duplicated docs — **without regressing the voice-first phone+desktop experience**. **Phase 1 is the load-bearing change** — everything else is supporting cleanup.

## Phase 0 — Deletions & doc consolidation (1 PR)

No behavior change. Pure reduction.

1. Delete `packages/provider-adapters/`. Grep confirmed zero external consumers.
2. Fold `packages/core/` into `packages/shared/`:
   - Move `commands/lifecycle.ts`, `pairing/pairing.ts`, `security/paths.ts` under `packages/shared/src/` (keep subpaths).
   - Update `packages/shared/src/index.ts` exports.
   - Update every import of `@freedom/core` to `@freedom/shared`. Delete `packages/core/`.
   - Remove `@freedom/core` from root `package.json` workspaces entry (if listed) and from any dependent `package.json`.
3. Delete these paths:
   - `archive/`
   - `.codex` (repo-root file/dir)
   - `INITIAL_SCOPE.md`
   - `docs/runbook.md` (keep `docs/runbooks/`)
4. Merge `AGENTS.md` into `AI_BOOTSTRAP.md`:
   - Copy any rule from `AGENTS.md` that is not already in `AI_BOOTSTRAP.md` into the latter.
   - Delete `AGENTS.md`.
   - Leave `CLAUDE.md` as-is (already points to `AI_BOOTSTRAP.md`).
5. Trim `docs/architecture.md` Components list to infrastructure-level bullets only. Move feature detail to the existing per-feature files under `docs/specs/`. Link out, don't duplicate.
6. Confirm `.next/` and `node_modules/` are gitignored; remove from tree if tracked.

Acceptance: repo builds (`npm run build` at root), `npm run dev` starts, no broken imports, **a voice session still starts and responds** (deletions here shouldn't touch it — if they do, you moved too far).

## Phase 1 — Unify the tool surface (1 PR, load-bearing)

The voice agent must discover dispatcher tools at session start and expose them as callable tools to the Realtime model. **This phase directly touches the voice loop. Be careful.** Keep the dispatcher fetch cheap and bounded (short timeout, off the hot path) so session start latency doesn't regress. If the dispatcher is slow or down, the session must still start with built-in tools only.

1. In `agents/freedom_agent/tools.py`, add:
   - `def bootstrap_dispatcher_tools() -> list`: HTTP GET `http://127.0.0.1:4317/admin/tools`, iterate manifests, for each build a LiveKit Agents `@function_tool`-compatible callable that:
     - Accepts kwargs matching the manifest `input_schema`.
     - Calls `POST /invoke` with `{ "tool": <name>, "input": <kwargs> }`.
     - Returns the tool's JSON result as a string.
     - Sets the function's `__name__`, `__doc__` (from manifest `description`), and signature from `input_schema` so the Realtime model sees proper tool metadata.
   - Handle dispatcher-unreachable: log once, return `[]`, do not crash the session.
   - Use a short connect timeout (≤500ms) and a total bootstrap timeout (≤1s). The voice session must never stall on this call.
2. In `agents/freedom_agent/agent.py` `entrypoint()`:
   - After `set_event_room(ctx.room)`, call `dispatcher_tools = bootstrap_dispatcher_tools()`.
   - Concat into the `tools=[...]` list passed to `Agent(...)`.
3. Remove these stubbed functions from `tools.py` and from the registered `tools=[...]` list — they will be re-implemented as manifests in Phase 1b:
   - `top_venture_status`
   - `pending_approvals`
   - `weekly_metrics`
   - Any other function whose body is a TODO returning a hardcoded string. Grep `tools.py` for `TODO` and remove each flagged function.
4. Keep these built-in `@function_tool`s (they need tight Realtime integration or touch session-local state):
   - All `review_*` runtime/governance inspection tools.
   - The 4 dispatcher proxies (`review_dispatcher_tool_status`, `review_dispatcher_tool_manifest`, `reload_dispatcher_registry`, `update_dispatcher_tool_autonomy`).
   - Memory primitives: `park_task`, `update_task_status`, `record_learning_signal`, `request_self_programming`, `route_conversation_to_build_lane`, `request_persona_*`, `set_voice_profile_preferences`, `prepare_email_draft`, `persist_voice_runtime_transcript`, `delegate_approved_programming_task`, `scaffold_new_project`.

### Phase 1b — Replace deleted stubs with real manifests

For each of `top_venture_status`, `pending_approvals`, `weekly_metrics`:

1. Create a folder under `agents/tools/<tool-name>/` containing:
   - `freedom.tool.yaml` — schema v1 manifest. Name matches folder. `autonomy: A0` (read-only, no confirm).
   - `run.py` (or `run.ts`) — reads JSON from stdin, calls the existing Next.js API route for that entity (add one if missing, pointing at Supabase or current seed-data via `getControlPlaneSnapshot()`), writes result JSON as the last stdout line.
2. Add a Next.js route under `src/app/api/freedom/<name>/route.ts` that returns the same data the deleted stub claimed to return. Read from `getControlPlaneSnapshot()` for now — do not block on Phase 3.
3. Verify dispatcher picks up the manifest within 20s (or call `reload_dispatcher_registry`) and the voice agent sees the tool on next session start.

Acceptance:
- Voice session start logs show N dispatched tools registered.
- Asking Freedom "what's the top venture" calls the new manifest tool and returns live control-plane data, not a hardcoded string.
- `grep -r "TODO" agents/freedom_agent/tools.py` returns nothing in removed areas.
- **Voice-first check:** on both desktop and the mobile companion, a voice session starts in the same time it did before (no visible latency regression), Freedom responds to speech, and interrupts still work. If any of these regress, the PR is not ready.

## Phase 2 — scaffold_new_project closes the loop (1 PR)

Today `scaffold_new_project` creates a folder. Extend it so tool-type scaffolds are immediately usable.

1. In `scaffold_new_project` (in `tools.py`), add a `kind` parameter (`app` | `agent` | `tool`). Default to `app` for backward compat.
2. When `kind == "tool"`:
   - Write `freedom.tool.yaml` with `autonomy: A1`, placeholder `input_schema`/`output_schema`, and the folder's `run.py` as the command.
   - Write a `run.py` stub that reads stdin JSON, echoes `{"status": "stub", "received": <input>}`.
   - Write a one-line `README.md` with the tool's purpose from the operator's description.
3. Dry-run (no `confirmed=True`) must read the full manifest aloud verbatim before creation — reuse the existing plan protocol.
4. After creation, state: exact folder path, the manifest path, and "dispatcher will pick this up within 20 seconds; say 'reload tools' to force it."
5. Update `docs/specs/` with a new `scaffold-tool-flow.md` showing the conversation → manifest → next-session-sees-it path.

Acceptance: operator can say "scaffold a weather-check tool", confirm, and within one minute call that tool in the same session after a reload. **Voice-first check:** the full flow (ask → plan-aloud → confirm → scaffold → reload → call) works entirely by voice on the phone app, not just on the desktop.

## Phase 3 — Persistence unification (1 PR, larger)

Move the control-plane entities currently in `src/lib/seed-data.ts` to Supabase, so the voice agent and the UI read from the same store.

1. Add Supabase migrations under `supabase/migrations/` for ventures, workflows, governance, execution-log tables. Mirror types from `src/lib/types.ts`.
2. Seed the tables from current `seed-data.ts` via a one-shot script at `scripts/seed-supabase.mjs`.
3. Change `getControlPlaneSnapshot()` in `src/lib/control-plane.ts` to read from Supabase (server-only, reuse the admin client pattern from `src/lib/freedom-memory-store.ts`).
4. Keep `src/lib/seed-data.ts` as fixtures for local-dev empty-db bootstrap only. Mark the file header accordingly.
5. Repoint Phase 1b manifests at their own dedicated API routes (still fine — routes now read live Supabase).

Acceptance: editing a venture row in Supabase shows up in the UI and in voice queries on next fetch. No UI reads from `seed-data.ts` in prod path. **Voice-first check:** voice queries like "what's active this week" answer from live data and the round-trip still feels conversational (sub-second to first tool result). If Supabase latency hurts the voice feel, add a short-lived server-side cache before shipping.

## Phase 4 — Monolith splits (separate PRs, only in this order)

Do only when actively editing the file; don't pre-split.

1. `apps/gateway/src/store.ts` (3,093 lines) → split into `store/hosts.ts`, `store/pairing.ts`, `store/sessions.ts`, `store/outbound.ts`, `store/realtime.ts`. Re-export from `store/index.ts`.
2. `agents/freedom_agent/tools.py` (post-Phase 1, ~1,400 lines) → `tools/runtime.py`, `tools/memory.py`, `tools/dispatcher.py`, `tools/__init__.py` re-exports. Update `agent.py` imports.
3. `apps/gateway/src/installPage.ts` (2,743 lines) → move HTML to `apps/gateway/templates/*.html`, read at startup, keep logic in `installPage.ts`.
4. `apps/mobile/src/store/appStore.ts` (3,367 lines) → split by slice: `session.ts`, `voice.ts`, `pairing.ts`, `buildLane.ts`, `chat.ts`. Same zustand store, combined at root.
5. `apps/mobile/src/screens.tsx` (1,445 lines) → one file per screen under `apps/mobile/src/screens/`.

Acceptance per split: no behavior change, green build, diff is move-only plus tiny re-export glue. **Voice-first check for mobile splits (4, 5):** start a voice session on the phone app, confirm mic, wake, pairing, transcript rendering, and offline ideation mode all still behave. No silent UX regressions.

## Phase 5 — Docs pass (1 PR)

After Phases 0–3 land:

1. Rewrite `docs/current-capabilities.md` to reflect unified tool surface and live persistence.
2. Add `docs/how-freedom-gets-new-tools.md` walking the full make→use loop end-to-end (Phase 2 flow).
3. Delete or update any doc under `docs/` that still describes the old split.

## Voice-first invariants (must survive every phase)

These are non-negotiable. If any change threatens one of these, stop and flag it:

- Voice session start latency on desktop and phone stays at or below today's baseline.
- The self-mute-during-TTS line in [src/components/voice-interface/voice-context.tsx](../src/components/voice-interface/voice-context.tsx) is untouched.
- Interrupt behavior (operator cuts Freedom off mid-sentence) keeps working.
- Mobile pairing, wake flow, and offline ideation posture with cached chats + on-device model keep working when the desktop is unreachable.
- Freedom can still call tools mid-turn without the conversation stalling.
- Transcript rendering on both desktop and phone stays in sync.
- Trusted-recipient email drafts still require explicit UI confirmation — no phase may weaken this gate.

## Non-goals — do not do these now

- Turborepo / Nx migration.
- Rewriting the Electron shell, VS Code extension, or wake-relay.
- Moving off Supabase or LiveKit.
- Touching `src/components/voice-interface/voice-context.tsx`. The self-mute-during-TTS line is load-bearing — leave it alone.
- Replacing the phone voice surface with a typed-only chat UX. Voice-first stays voice-first.
- Any refactor that isn't listed above.

## Ground rules for the team

- **Stay in scope.** One phase per PR (Phase 4 allows one per split). No bundling phases, no drive-by cleanups.
- **Update docs in the same PR as the behavior change — never separate.**
- **Prefer small diffs.** If a phase grows past ~600 changed lines excluding moves, stop and split.
- **No speculative generality.** Add only the abstraction the phase needs.
- **Flag, don't improvise.** If a step is wrong, unclear, or blocked: stop, add a PR comment describing what you found and what you'd propose, and wait. Do not push through a known-wrong step, and do not silently redesign it.
- **Found-in-passing log.** Issues you spot outside your step go in the PR description under a "Found in passing" heading so they aren't lost and aren't fixed out-of-scope.
- **Always voice-test before marking done.** Build green + typecheck green is the floor, not the ceiling. Start a voice session (desktop and, where relevant, phone) and confirm the acceptance check for the phase.
- **Run `npm run build` and start the dev stack before opening a PR.**
