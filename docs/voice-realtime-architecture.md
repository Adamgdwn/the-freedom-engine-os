# Realtime Voice Architecture Note

## Current Assessment

Before this upgrade, Adam Connect voice behaved like a one-shot transcript helper:

1. the phone started on-device speech recognition
2. the recognizer returned one final transcript
3. the transcript was dropped into the normal chat composer
4. the existing text message flow sent that turn to Codex
5. assistant text streamed back over websocket
6. optional TTS waited for the completed assistant message and then spoke the full reply

That created the wrong product shape for a voice-first operator console. The root cause was not microphone polish. The real issue was that voice had no long-lived session state, no live transcript model, no early speech output, and no interruption path that could stop a reply and immediately accept a new turn.

## Least Disruptive Upgrade Path

The codebase already had one useful realtime primitive: the mobile websocket that streams session and message updates from the gateway. The least disruptive path was therefore:

- keep the existing pairing, gateway, websocket, and desktop Codex bridge intact
- replace the mobile one-shot voice wrapper with a continuous voice session loop
- drive turn-taking from live STT events on device
- drive assistant speech from the existing streamed assistant deltas instead of waiting for full completion
- use the existing session stop path for barge-in instead of introducing a second interrupt channel

This keeps the current trust boundary the same: the phone still does not hold model credentials, and the desktop remains the Codex execution boundary.

## Implemented Session Layers

### Audio input

- `VoiceService` now supports a streaming session instead of resolving one final transcript and tearing down.
- The mobile store keeps recognition active across turns and records live transcript plus audio level.
- Recognition restarts automatically on recoverable session drops.
- Recognition now pauses while Freedom is actively speaking and resumes immediately after playback, which is the current baseline protection against self-hearing on phone hardware.

### Turn handling

- `voiceSessionMachine.ts` introduces explicit voice phases:
  `idle`, `connecting`, `listening`, `user-speaking`, `processing`, `assistant-speaking`, `interrupted`, `reconnecting`, `review`, `error`
- Short acknowledgements such as `yeah`, `okay`, and `uh huh` are treated as backchannel instead of automatic interruption.
- Substantive speech while the assistant is talking now stops local playback immediately, marks the interrupt visibly in the mobile UI, and preserves the new utterance so it can route as a fresh turn instead of disappearing behind a generic busy response.
- The system no longer assumes one blocking foreground run per session. Sessions now own multiple internal task items, and interruptions are classified into `quick_question`, `clarification`, `parallel_subtask`, `replace_task`, and `stop_task`.
- Gateway and desktop-host scheduling now allow bounded safe parallelism when tasks do not conflict on the same resource boundary.

### Assistant speech

- `AssistantSpeechRuntime` converts streaming assistant deltas into sentence-sized TTS chunks.
- The phone begins speaking once enough text is available instead of waiting for the full response.
- TTS is cancelled immediately on confirmed barge-in.
- Android spoken reply pacing is faster, and switching the selected voice now re-applies the preference without forcing a cold restart of the entire speech backend.

### UI and observability

- The chat screen now exposes a dedicated `Freedom Voice` surface with persistent phase visibility, interrupt acknowledgment, live transcript/assistant preview, audio meter, selected voice context, turn counts, interruption counts, reconnect counts, and latest round-trip timing.
- The header voice control now starts and ends a continuous session instead of acting like a one-shot mic capture.
- The spoken-reply voice picker now surfaces accent, engine, quality, and any safe style or gender hints the device actually exposes, so voice choice no longer requires pure trial and error.

## Safety Notes

- Risky or long transcripts still pause for review instead of silent auto-send.
- Realtime voice remains gated by mobile runtime config so the behavior can be tuned or disabled per build.
- The upgrade does not add new remote execution capability; it changes how quickly voice turns enter the existing approved-root Codex flow.
- Parallel task handling is intentionally conservative: tasks only run side-by-side when the scheduler believes they can do so safely, and replacement/stop interrupts still serialize aggressively.

## Web Voice Note

The control-plane web voice lane now has a separate LiveKit data-channel control path for
explicit `interrupt` and `task_update` messages. That does not replace the mobile stop
path described above; it adds a browser-native control channel so the desktop voice
console and mobile control surfaces can cancel the current model response at the agent
session and surface parked task state in the workbench shell.

The web voice lane now also persists durable partner memory through a server-only
Supabase route. Learning signals, parked tasks, and approval-gated self-programming
requests survive reloads, are re-hydrated into the next live voice session, and can be
exported locally with `npm run backup:freedom-memory` so a larger Supabase issue does not
erase Freedom's working memory.

## Reference Concepts

This implementation intentionally mirrors the architectural direction recommended in the brief:

- LiveKit agent starters: separate connection/session UI states from active conversation UI, and treat voice as a session rather than a button click
- LiveKit turn docs: use explicit turn states, endpointing delay, interruption detection, and false-interruption tolerance as the design target
- Pipecat: keep transport, speech understanding, reasoning, speech output, and UI/observability as separate layers even in a smaller in-repo implementation
