import type {
  FreedomPersonaOverlay,
  FreedomPersonaUpdate,
} from '@/lib/freedom-persona';
import type {
  FreedomConversationMemory,
  FreedomConversationMemoryUpdate,
} from '@/lib/freedom-conversation-memory';
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
  conversationMemories: FreedomConversationMemory[];
  programmingRequests: SelfProgrammingRequest[];
  personaOverlays:     FreedomPersonaOverlay[];
  configured:          boolean;
}

export type FreedomMemoryUpdateRequest =
  | { channel: 'task'; update: VoiceTaskUpdate }
  | { channel: 'learning'; update: VoiceLearningUpdate }
  | { channel: 'conversation'; update: FreedomConversationMemoryUpdate }
  | { channel: 'programming'; update: SelfProgrammingRequestUpdate }
  | { channel: 'persona'; update: FreedomPersonaUpdate };
