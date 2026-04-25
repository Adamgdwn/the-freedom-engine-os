# Freedom Anywhere Operator Validation

Document status: live reference

## Purpose

Run one focused real-device acceptance pass for the governed `A3` operator loop
 across:

- base-station Freedom on desktop
- Freedom Anywhere in `desktop_linked`
- Freedom Anywhere in `stand_alone`

The goal is to verify that the phone stays truthful about what it can and cannot
do, that the operator ledger stays canonical, and that consequence review remains
an execution gate instead of a suggestion.

## Preconditions

- Desktop launched from this repo with `npm run launch`
- Freedom Desktop shell and gateway reachable
- Phone paired to the same desktop host
- Repo-root `.env` configured for the current desktop runtime
- A reachable approved root in `DESKTOP_APPROVED_ROOTS`
- Latest Android build installed on the phone
- Desktop host and gateway already passing normal local validation

Optional but recommended:

- Keep Agent Control open on desktop
- Keep the gateway log visible
- Keep the desktop-host log visible

## Validation Pass

### 1. Connected Ledger Visibility

1. Start with the desktop healthy so the phone reports `desktop_linked`.
2. Create or surface one governed operator run from Freedom on desktop.
3. Open Homebase on the phone and confirm:
   - the run appears on the phone
   - approval class is visible
   - missing consequence review is visible when applicable
   - the phone does not imply it already executed the work

Expected result:

- Desktop and phone show the same run identity and same review posture.

### 2. Connected Consequence Gate

1. Create or reuse a governed run that is missing consequence review.
2. Confirm the phone shows `Add Consequence Review`.
3. Confirm the phone does not show `Continue Run` for that run.
4. Record the review from the phone.
5. Confirm the run updates on desktop and on the phone.
6. Confirm `Continue Run` only appears after the review is present.

Expected result:

- Review-gap runs cannot be continued from the phone.
- Recording the review from the phone updates the same canonical operator run.

### 3. Connected Continue, Hold, Interrupt

1. Use the phone to continue a reviewed run.
2. Confirm the desktop lane receives the same run id.
3. While the run is active, use the phone to hold or interrupt it.
4. Confirm the run status changes on both surfaces.
5. Confirm the next checkpoint mentions reviewing changed blast radius or partial work when interrupted.

Expected result:

- Mobile controls act on the same governed run rather than creating a second one.
- Interrupt and hold stay audit-visible.

### 4. Connected Learning Outcome

1. Complete a governed run with real validation evidence.
2. Refresh Agent Control or inspect the operator ledger.
3. Confirm the completed run now includes:
   - completion evidence
   - a `learningOutcome`
   - an internalization recommendation such as `observe`, `invest`, or `internalize`

Expected result:

- Completed runs produce structured learning without claiming autonomous self-rewrite.

### 5. Stand-Alone Deferred Work

1. Make the desktop genuinely unavailable long enough for the phone to enter `stand_alone`.
2. Open a phone-only or cached chat.
3. Add offline notes.
4. Add at least one deferred operator run from the offline import review sheet.
5. Confirm the phone copy stays explicit:
   - no desktop execution claims
   - no live run controls
   - deferred work clearly marked as local until import

Expected result:

- Stand-alone mode remains helpful for planning and capture, but never pretends to run desktop work.

### 6. Stand-Alone Import

1. Restore the desktop link.
2. Import the offline notes and deferred operator runs.
3. Confirm:
   - offline notes import as non-executing system notes
   - deferred operator runs land in the canonical ledger as `awaiting-approval`
   - imported deferred runs keep stable ids
   - repeated import with the same client import id does not duplicate the notes

Expected result:

- Import is review-first and idempotent.
- Stand-alone drafts become governed desktop-backed work only after import.

## Failure Conditions

Treat the pass as failed if any of the following happen:

- The phone shows `Continue Run` before consequence review exists.
- The phone implies a stand-alone draft already executed on desktop.
- Import duplicates offline note messages for the same client import id.
- Connected mobile controls fork a second operator run instead of updating the first.
- A completed run does not retain evidence or loses its consequence review.
- Learning outcome claims a capability was internalized without evidence-backed completion history.

## Log Targets

- Gateway log:
  watch operator-run creation, updates, and offline import behavior.
- Desktop-host log:
  watch actual execution lifecycle changes when the phone continues or interrupts a run.
- Agent Control:
  verify live review gaps, approval posture, and recent run state.

## When The Phone Is Required

Phone hardware is required for:

- connected consequence-review authoring
- connected continue, hold, and interrupt controls
- true `stand_alone` posture validation
- offline import and reconnect behavior

Phone hardware is not required for:

- workspace typecheck
- gateway integration tests
- mobile component tests
- Python tool syntax validation

## Follow-Up

After the live pass:

1. Record what succeeded and failed.
2. Note any second-order consequence the pass exposed.
3. Note any third-order consequence that would affect future autonomy, trust, or maintenance.
4. If failures are product-truthfulness failures, fix those before adding new capability.
