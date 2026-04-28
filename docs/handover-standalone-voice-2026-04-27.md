# Stand-Alone Voice Handover (2026-04-27)

Document status: handover note

## Scope

This handover covers the latest Freedom Anywhere stand-alone voice regression pass on
the connected OnePlus phone, including:

- the local-capture plus hosted-speech fallback lane
- the Termux-hosted relay on `127.0.0.1:43311`
- the current Android release APK and installed phone build
- the remaining live-validation gaps after the shipped fixes

## What shipped in code

The current working tree now includes these stand-alone voice changes:

- stand-alone `cloud` mode no longer tries the slower realtime/LiveKit path first;
  it uses the device STT plus hosted Freedom speech lane directly
- Android recognizer startup now performs a clean prepare/reset before each new session
  instead of relying on a delayed cancel that could kill the next session
- recognizer state now tracks whether Android is actually running recognition, not just
  whether the JS session is nominally active
- device-fallback reconnect behavior no longer surfaces as a desktop reconnect UI event
- hosted stand-alone support now probes `GET /health` on the local relay and tracks
  whether the relay is actually reachable before advertising hosted support as ready
- the `Talk` canvas no longer shows the old `Recent thread` card while stand-alone voice
  is active
- the centered spinner now stays visible while a voice turn is in `processing` or while
  `sendingMessage` is already in flight
- queued voice auto-send is now re-attempted if the recognizer restarts before the
  offline send handoff completes
- relay-backed stand-alone chat timeout was reduced from `20s` to `7s` so a dead
  localhost relay fails faster and more honestly

## Files changed in this pass

- [appStore.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/store/appStore.ts:1)
- [voiceService.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/voice/voiceService.ts:1)
- [relayCompanion.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/offline/relayCompanion.ts:1)
- [screens.tsx](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/app/screens.tsx:1)
- [server.js](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/relay/src/server.js:1)
- [voiceService.test.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/__tests__/voiceService.test.ts:1)

## Live phone observations

What was directly observed on the connected phone during this pass:

- the app could capture speech but sometimes slipped from a queued voice turn back to
  `Listening` instead of staying in `processing`
- the spinner could disappear even though the captured turn had not yet moved cleanly
  into the stand-alone send path
- the phone-local relay genuinely went down during live testing and the app showed
  `Freedom relay unreachable at http://127.0.0.1:43311. Network request failed`
- the relay outage was not just a UI bug: local port checks showed `127.0.0.1:43311`
  refusing connections until the Termux relay was started again
- once the Termux relay was manually restarted, `GET /health` returned a healthy payload
  and the local port became reachable again

## Relay operations note

The current stand-alone hosted lane depends on the Termux relay staying up on the phone.

Validated local checks after restart:

- `GET http://127.0.0.1:43311/health`
- local port open on `43311`
- relay health reported all expected secrets configured

Observed failure mode:

- `node ~/freedom-relay/src/server.js` in the live Termux shell had previously been
  terminated
- when that happened, stand-alone hosted text and hosted speech both became unavailable

Practical operator takeaway:

- if stand-alone suddenly loses voice and starts showing relay-unreachable errors again,
  treat the Termux relay as the first suspect before debugging mobile UI state

## APK verification

Current release artifact:

- path:
  [app-release.apk](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/android/app/build/outputs/apk/release/app-release.apk)
- version:
  `0.2.77 (84)`
- SHA-256:
  `ffb5334179a40f979307f6b432a908c1d6f8797ca105ff9c15dad128cf642f81`

Verified on device:

- installed package: `com.freedommobile`
- `dumpsys package` reports `versionName=0.2.77`
- `dumpsys package` reports `versionCode=84`

Release metadata source:

- [output-metadata.json](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/android/app/build/outputs/apk/release/output-metadata.json:1)

## Checks run

- `npm test --workspace @freedom/mobile -- --runInBand voiceService.test.ts assistantSpeechRuntime.test.ts appShellRefresh.test.tsx standaloneMode.test.ts ttsService.test.ts`
- `npm run typecheck --workspace @freedom/mobile`
- `npm run build:android-release`
- `adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- `adb shell dumpsys package com.freedommobile | rg "versionName|versionCode"`
- `adb shell 'toybox nc -z 127.0.0.1 43311; echo relay_port:$?'`

## What still needs live validation

The repo now reflects the latest state-machine and relay-honesty fixes, but one critical
behavior still needs explicit live confirmation:

- after a spoken stand-alone turn is captured, the phone should remain visibly in
  `processing`, send the turn through the relay-backed fallback lane, and then produce a
  hosted Freedom voice reply without silently snapping back to `Listening`

The logs suggested the prior failure was in that handoff boundary, which is why the
latest patch keeps queued voice auto-send in `processing` and re-attempts the send after
recognizer restarts.

## Recommended next step

Run one fresh end-to-end stand-alone voice turn on the current APK while watching:

- UI headline changes to `Working` / `processing`
- spinner appears and stays visible during the handoff
- no `relay unreachable` error appears
- hosted Freedom voice reply plays back
- after playback, the loop returns to listening again
