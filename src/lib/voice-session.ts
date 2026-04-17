import type { AudioCaptureOptions } from 'livekit-client';
import type { FreedomEmailDraftUpdate } from '@/lib/freedom-email';
import type { FreedomPersonaUpdate } from '@/lib/freedom-persona';
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
  personaUpdate:      'persona_update',
  emailDraftUpdate:   'email_draft_update',
} as const;

export type VoiceDataMessage =
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.interrupt }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.state; state: VoiceRuntimeState }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.taskUpdate; payload: VoiceTaskUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.learningUpdate; payload: VoiceLearningUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.selfProgrammingUpdate; payload: SelfProgrammingRequestUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.personaUpdate; payload: FreedomPersonaUpdate }
  | { type: typeof VOICE_DATA_MESSAGE_TYPES.emailDraftUpdate; payload: FreedomEmailDraftUpdate }
  | {
      type: typeof VOICE_DATA_MESSAGE_TYPES.transcript;
      text: string;
      source?: 'assistant' | 'user';
      final?: boolean;
    };
