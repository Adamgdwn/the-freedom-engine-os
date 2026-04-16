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
  configured:          boolean;
}

export type FreedomMemoryUpdateRequest =
  | { channel: 'task'; update: VoiceTaskUpdate }
  | { channel: 'learning'; update: VoiceLearningUpdate }
  | { channel: 'programming'; update: SelfProgrammingRequestUpdate };
