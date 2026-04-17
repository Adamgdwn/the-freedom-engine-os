# Reference-Driven Voice Migration Plan

Last updated: 2026-04-17

This document replaces heuristic voice tuning as the primary strategy.
It records the proven architecture patterns the repo should follow and maps them
to the current codebase so implementation work can be deliberate instead of reactive.

## Why This Exists

The current mobile voice experience is still fundamentally a chained pipeline:

1. device STT
2. transcript heuristics in the mobile app
3. gateway / desktop-host text run
4. text reply
5. device TTS

That shape can be made less bad, but it will not reliably produce a ChatGPT-Voice-class
experience. The product keeps paying the complexity cost of turn heuristics, transcript
merging, barge-in guesses, and backend lag while still sounding like voice bolted onto chat.

## External Reference Patterns

### OpenAI Voice Agents

Official OpenAI guidance explicitly distinguishes between:

- speech-to-speech live audio sessions for natural, low-latency conversation
- chained STT -> agent -> TTS pipelines for predictable or approval-heavy workflows

For this repo, the conversational partner experience belongs in the first category.

Reference:
- https://developers.openai.com/api/docs/guides/voice-agents

### LiveKit Turns And Interruptions

LiveKit's current turn docs describe the features a premium voice runtime should lean on:

- adaptive interruption handling
- false interruption recovery
- minimum words / minimum duration before registering interruption
- dynamic endpointing
- explicit `session.interrupt()` support

Reference:
- https://docs.livekit.io/agents/logic/turns/

### OpenAI Realtime Agents Demo

OpenAI's reference demo keeps voice inside a realtime session with:

- one event model
- one session model
- VAD / PTT controls
- guardrails and event logs in one place

It does not rebuild interruption logic from chat transcript state in the UI store.

Reference:
- https://github.com/openai/openai-realtime-agents

### LiveKit Mobile Starter Pattern

LiveKit's mobile starter is effectively a thin client for a token server plus agent session.
That is the right model for mobile here too: mobile should be a realtime session client,
not a device-STT orchestration layer pretending to be the voice runtime.

Reference:
- https://github.com/livekit-examples/agent-starter-swift

### Vocode Conversation Mechanics

Vocode explicitly warns that interruption sensitivity can be so aggressive that any word
counts as a barge-in. That warning maps directly to the failure mode seen in this repo.

Reference:
- https://docs.vocode.dev/open-source/conversation-mechanics

## Current Repo Reality

### Web

The web control-plane voice lane is already structurally much closer to the right system:

- token route: [src/app/api/voice-token/route.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/src/app/api/voice-token/route.ts:1)
- voice session context: [src/components/voice-interface/voice-context.tsx](/home/adamgoodwin/code/agents/the-freedom-engine-os/src/components/voice-interface/voice-context.tsx:1)
- Python worker: [agents/freedom_agent/agent.py](/home/adamgoodwin/code/agents/the-freedom-engine-os/agents/freedom_agent/agent.py:1)

It already uses LiveKit plus OpenAI Realtime and should be treated as the baseline model
for the future shared voice runtime.

### Mobile

Mobile is still the wrong shape for premium voice:

- STT: [apps/mobile/src/services/voice/voiceService.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/voice/voiceService.ts:1)
- turn heuristics and session orchestration: [apps/mobile/src/store/appStore.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/store/appStore.ts:1)
- chunked TTS playback: [apps/mobile/src/services/voice/assistantSpeechRuntime.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/voice/assistantSpeechRuntime.ts:1)
- device TTS backends: [apps/mobile/src/services/voice/ttsService.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/apps/mobile/src/services/voice/ttsService.ts:1)

This path should now be treated as degraded fallback architecture, not the target design.

## Target Product Shape

### Primary Runtime

- one primary voice runtime across web and mobile
- one `voiceSessionId` bound to one chat session
- LiveKit transport for realtime audio and control
- OpenAI Realtime as the primary live conversational engine
- realtime interruption at the session/control level, not delayed transcript heuristics

### Desktop And Gateway Role

The gateway and desktop-host should remain the action lane, not the hot path for turn-taking.

They should receive structured intents after the voice runtime has already:

- captured the user turn
- decided whether it was a real interruption
- managed partial/final transcript state
- controlled playback stop/resume

### Degraded Fallback

The current device STT/TTS stack can remain only as:

- an explicit degraded fallback mode
- clearly labeled in UI and docs
- disabled by default once the realtime mobile path is ready

## Migration Rules

### Do

- reuse the web realtime voice pattern as the canonical implementation reference
- keep one shared session contract across web, mobile, gateway, and desktop
- let the realtime runtime own interruption, transcript state, and playback state
- keep approval-heavy and tool-heavy work in the downstream action lane

### Do Not

- keep adding transcript regexes as the primary interruption strategy
- keep device TTS as the main premium-reply path
- let "busy backend" imply "assistant speaking"
- ship fallback behavior without marking it degraded
- split web and mobile into two different voice products

## Shared Runtime Contract

The repo now includes a minimal shared contract in:

- [packages/shared/src/contracts/voiceRuntime.ts](/home/adamgoodwin/code/agents/the-freedom-engine-os/packages/shared/src/contracts/voiceRuntime.ts:1)

This introduces:

- `VoiceRuntimeMode`
- `VoiceTransport`
- `VoiceSessionBinding`
- `VoiceControlEvent`
- `VoiceIntentEnvelope`

These types are the first step toward replacing ad hoc mobile store state with a session-level
runtime contract that can be shared across the full stack.

## Cutover Order

1. Make the docs honest:
   web realtime is the primary architecture direction; current mobile device STT/TTS is degraded.
2. Introduce a shared runtime/session contract that both mobile and web can target.
3. Add a mobile LiveKit session client path beside the current device pipeline.
4. Route interruption through realtime control/session events instead of transcript heuristics.
5. Stream spoken output from the realtime runtime instead of device-primary TTS.
6. Demote device STT/TTS to fallback-only mode.
7. Remove old mobile heuristic branches once parity is proven.

## Definition Of “Top-Shelf” Before Retest

Do not ask the user to retest as a premium voice experience until all of these are true:

- mobile and web use the same primary realtime voice runtime
- interruption is session-level and reliable
- no ordinary follow-up speech is misclassified as barge-in
- first spoken response starts fast enough to feel conversational
- degraded fallback is clearly marked and is not the default path
- the phone is no longer relying on device-primary STT/TTS as the main UX
