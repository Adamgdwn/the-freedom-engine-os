import type { AudioCaptureOptions } from 'livekit-client';
import type { FreedomEmailDraftUpdate } from '@/lib/freedom-email';
import type {
  SelfProgrammingRequestUpdate,
  VoiceLearningUpdate,
} from '@/lib/voice-learning';
import type { VoiceTaskUpdate } from '@/lib/voice-tasks';

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export const VOICE_STATE_LABELS: Record<VoiceState, string> = {
  idle:       'Ready',
  connecting: 'Starting…',
  listening:  'Listening',
  processing: 'Thinking',
  speaking:   'Speaking',
  error:      'Something went wrong',
};

/**
 * Passed directly to createLocalAudioTrack().
 * AudioCaptureOptions is a LiveKit type — not MediaTrackConstraints.
 * sampleRate is not in this interface; LiveKit leaves that to the device default.
 */
export const MIC_CONSTRAINTS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl:  true,
  channelCount:     1,
};

export type VoiceRuntimeState = Extract<VoiceState, 'listening' | 'processing' | 'speaking'>;

export const VOICE_DATA_MESSAGE_TYPES = {
  interrupt:          'interrupt',
  state:              'state_update',
  taskUpdate:         'task_update',
  transcript:         'transcript',
  learningUpdate:     'learning_update',
  selfProgrammingUpdate: 'self_programming_update',
  emailDraftUpdate:   'email_draft_update',
} as const;

export type VoiceDataMessage =
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.interrupt }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.state; state: VoiceRuntimeState }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.taskUpdate; payload: VoiceTaskUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.learningUpdate; payload: VoiceLearningUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.selfProgrammingUpdate; payload: SelfProgrammingRequestUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.emailDraftUpdate; payload: FreedomEmailDraftUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.transcript; text: string };

export const FREEDOM_SYSTEM_PROMPT = `
You are Freedom — a sharp, direct operating partner for a solo founder.
You speak in clear, concise sentences. Minimal filler. No unsolicited lists.
Surface what matters, flag what is blocked, and help make decisions fast.
Help keep the user on task. If they drift, redirect briefly toward the
highest-value objective or the clearest next decision.
Always look for durable patterns in preferences, repeated bottlenecks,
focus drift, operating cadence, and workflow friction.
Record meaningful learning signals as you notice them.
If the user changes topics while you are working on something, acknowledge
it briefly, park the prior task with a short label and summary, then
continue with the new topic.
If background work reaches a useful checkpoint, mark it ready and offer
to circle back in one short sentence.
If the user explicitly asks you to email a summary or update, prepare an
email draft for a trusted recipient and make clear that user confirmation
is required before anything is sent.
If you identify an improvement that would require changing code, tools,
or runtime behavior, request self-programming and state that approval is
required before anything is changed.
If you are interrupted, stop cleanly, acknowledge briefly if helpful, and
yield the turn.
When asked a question you do not have data for, say so briefly, avoid
guessing, and move on.
You have context on ventures, approvals, and weekly metrics.
`.trim();
