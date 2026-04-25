# Freedom Anywhere — Implementation Plan

Document status: active design

Status: in progress  
Depends on: [freedom-anywhere-first-principles-spec.md](./freedom-anywhere-first-principles-spec.md)

This plan replaces ad hoc mobile recovery work as the primary phone cleanup sequence.
Do this before revisiting the archived broader cleanup plan in
`docs/archive/cleanup-plan-v1.md`.

## Goal

Align the phone product to three top-level postures only:

1. `desktop_linked`
2. `reconnecting`
3. `stand_alone`

Everything else becomes either:

- a capability flag
- compatibility glue
- or deleted state vocabulary

## Phase 1 — Canonical State Reset

Status:

- completed on shared schema, gateway status production, and mobile store selectors
- compatibility fields still exist in some code paths and tests

Scope:

- `packages/shared/src/`
- `apps/gateway/src/store.ts`
- `apps/mobile/src/store/appStore.ts`

Work:

1. Replace the current top-level phone connection model with:
   - `desktop_linked`
   - `reconnecting`
   - `stand_alone`
2. Move voice and execution quality into capability flags, not parallel connection modes.
3. Mark `blocked`, `offline_safe`, `availability`, `repairState`, and `offlineMode` as compatibility-only.
4. Update ADR and shared schema names to match the spec.

Acceptance:

- One canonical phone posture model exists in shared code.
- Gateway and mobile both consume the same top-level posture names.

## Phase 2 — Gateway Truth Simplification

Status:

- partially completed
- gateway now publishes `desktop_linked`, `reconnecting`, and `stand_alone`
- further cleanup remains for older compatibility seams and legacy naming

Scope:

- `apps/gateway/src/store.ts`
- `apps/desktop-host/src/host/tailscale.ts`

Work:

1. Stop treating reachable-but-imperfect transport as a fake disconnect.
2. A reachable desktop should stay `desktop_linked` unless the reconnect grace window has failed.
3. Keep transport/trust concerns as capability or warning signals, not primary posture.
4. Keep premium voice readiness separate from connection posture.

Acceptance:

- Reachable desktop + degraded transport still reports `desktop_linked`.
- Only real unavailability reports `stand_alone`.

## Phase 3 — Mobile Store And UI Simplification

Status:

- in progress
- main surfaces now derive from the canonical posture model
- the settings connection mark now treats `desktop_linked` and `reconnecting` as connected-to-Freedom, with `×` reserved for true `stand_alone`

Scope:

- `apps/mobile/src/store/appStore.ts`
- `apps/mobile/src/app/AppShell.tsx`
- `apps/mobile/src/app/screens.tsx`
- `packages/shared/src/mobileExperience.ts`

Work:

1. Drive UI from the three canonical postures first.
2. Show capability degradation as secondary labels only.
3. Remove wording that makes degraded connected behavior feel disconnected.
4. Keep voice-first default on the main surface in both `desktop_linked` and `reconnecting`.
5. Reserve `stand_alone` copy for true desktop absence.

Acceptance:

- Connected desktop renders connected-first copy.
- Brief drops render reconnecting copy.
- Only real absence renders stand-alone copy.

## Phase 4 — Notification And Dev-Noise Cleanup

Status:

- partially completed
- debug Metro / Fast Refresh overlays were removed from release evaluation by replacing the installed debug APK with a release APK
- further runtime notification reduction still needs a deliberate cleanup pass

Scope:

- mobile release/debug evaluation path
- mobile banners / notices
- gateway notification triggers

Work:

1. Separate product notifications from debug-runtime overlays during evaluation.
2. Reduce banners for transient reconnects.
3. Only surface product notifications for:
   - true switch into `stand_alone`
   - real operator action required
   - requested task completion/failure
   - genuine approval prompts

Acceptance:

- Debug overlays are not treated as product regressions.
- Reconnect turbulence does not spam the operator.

## Phase 5 — Voice-First Acceptance Pass

Status:

- release APK was rebuilt, installed, and spot-checked on device
- full live spoken end-to-end acceptance is still outstanding

Scope:

- desktop voice
- Freedom Anywhere on phone

Work:

1. Test connected voice session on desktop and phone.
2. Test brief drop and quiet recovery.
3. Test true desktop absence and stand-alone behavior.
4. Test transcript continuity and interrupt behavior.

Acceptance:

- Connected-first voice works on both surfaces.
- Reconnecting stays quiet and temporary.
- Stand-alone remains useful for capture, planning, brainstorming, and notes.

## Immediate Next Steps

Do these before any further cleanup, refactor, or terminology sweep.

### 1. Resolve the connected-but-degraded voice mismatch

Goal:

- when the phone is connected to Freedom and premium desktop voice is actually available,
  the UI must stop showing `Backup voice only`

Check:

1. Inspect the live `/host/status` payload from the running gateway during a real phone session.
2. Record the exact values for:
   - `connectionState`
   - `voiceState`
   - `voiceDetail`
   - `deferredExecutionState`
3. Confirm whether the wrong banner is coming from:
   - gateway truth
   - mobile effective-state derivation
   - stale cached host status on the phone

Files:

- `apps/gateway/src/store.ts`
- `apps/mobile/src/store/appStore.ts`
- `apps/mobile/src/app/screens.tsx`
- `packages/shared/src/mobileExperience.ts`

Acceptance:

- connected phone + premium voice available => no `Backup voice only` banner
- connected phone + premium voice unavailable => banner is truthful and intentionally worded

### 2. Tighten premium voice truth

Goal:

- the gateway must not infer premium voice readiness from env presence alone if that does
  not match real runtime availability

Check:

1. Audit how premium voice readiness is derived now.
2. Decide whether `voice_primary_ready` should require:
   - env only
   - managed worker running
   - successful voice endpoint health check
3. Prefer the smallest truthful check that matches operator-visible behavior.

Files:

- `apps/gateway/src/store.ts`
- desktop-host voice worker supervision files if needed

Acceptance:

- `voice_primary_ready` means the operator can actually start the premium voice lane
- `voice_fallback_only` only appears when the premium lane is truly unavailable

### 3. Reduce secondary status noise on the main voice surface

Goal:

- connected-first should feel calm, with capability warnings only when they are truly actionable

Check:

1. Review every status chip and banner currently visible on `Start` and `Talk`.
2. Remove or soften any chip that repeats non-actionable state.
3. Keep the main surface voice-first, not diagnostics-first.

Files:

- `apps/mobile/src/app/screens.tsx`
- `apps/mobile/src/app/AppShell.tsx`

Acceptance:

- normal connected operation shows a calm main surface
- reconnecting stays visible but quiet
- only real degradation or operator action requirements stay prominent

### 4. Run one complete truth-table pass

Goal:

- verify the UI matches the spec across the real combinations that matter

Test matrix:

1. `desktop_linked` + `voice_primary_ready`
2. `desktop_linked` + `voice_fallback_only`
3. `reconnecting` + `voice_primary_recovering`
4. `stand_alone` + `voice_fallback_only`

For each case, capture:

- main screen
- settings sheet
- visible chips/banners
- expected operator interpretation

Acceptance:

- no case presents connected behavior like a disconnect
- no case presents stand-alone like a healthy desktop-backed session

### 5. Only then continue the broader recovery plan

After the above is clean:

1. finish remaining compatibility cleanup in gateway/mobile
2. continue notification simplification
3. do the full phone + desktop spoken acceptance pass
4. resume broader cleanup only after voice-first behavior is stable

## Cleanup After Alignment

Only after the above is stable:

1. Remove compatibility-only state vocabulary where no longer needed.
2. Revisit `docs/archive/cleanup-plan-v1.md` only if the remaining cleanup gaps
   still apply after checking `docs/known-deficiencies-2026-04-25.md`.
3. Keep monolith splits deferred until the simplified model is actually stable.
