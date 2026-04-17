import type {
  FreedomPersonaOverlay,
  FreedomPersonaUpdate,
} from '@/lib/freedom-persona';
import type {
  SelfProgrammingRequest,
  SelfProgrammingRequestUpdate,
  VoiceLearningSignal,
  VoiceLearningUpdate,
} from '@/lib/voice-learning';
import type { VoiceTask, VoiceTaskUpdate } from '@/lib/voice-tasks';

export interface FreedomMemorySnapshot {
  tasks:               VoiceTask[];
  learningSignals:     VoiceLearningSignal[];
  programmingRequests: SelfProgrammingRequest[];
  personaOverlays:     FreedomPersonaOverlay[];
  configured:          boolean;
}

export type FreedomMemoryUpdateRequest =
  | { channel: 'task'; update: VoiceTaskUpdate }
  | { channel: 'learning'; update: VoiceLearningUpdate }
  | { channel: 'programming'; update: SelfProgrammingRequestUpdate }
  | { channel: 'persona'; update: FreedomPersonaUpdate };
