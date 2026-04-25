export type ConversationMemoryCategory =
  | 'identity'
  | 'preference'
  | 'project'
  | 'relationship'
  | 'context';

export type ConversationMemoryStatus = 'observed' | 'confirmed' | 'active';

export interface FreedomConversationMemory {
  id: string;
  topic: string;
  summary: string;
  category: ConversationMemoryCategory;
  confidence: number;
  status: ConversationMemoryStatus;
  sourceSessionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type FreedomConversationMemoryUpdate =
  | { type: 'recorded'; memory: FreedomConversationMemory }
  | { type: 'status'; memoryId: string; status: ConversationMemoryStatus }
  | { type: 'summary'; memoryId: string; summary: string };

function sortByUpdatedAt<T extends { updatedAt: number }>(items: T[]) {
  return [...items].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function applyConversationMemoryUpdate(
  memories: FreedomConversationMemory[],
  update: FreedomConversationMemoryUpdate,
): FreedomConversationMemory[] {
  if (update.type === 'recorded') {
    const remaining = memories.filter((memory) => memory.id !== update.memory.id);
    return sortByUpdatedAt([update.memory, ...remaining]);
  }

  return sortByUpdatedAt(memories.map((memory) => {
    if (memory.id !== update.memoryId) {
      return memory;
    }

    if (update.type === 'status') {
      return {
        ...memory,
        status: update.status,
        updatedAt: Date.now(),
      };
    }

    return {
      ...memory,
      summary: update.summary,
      updatedAt: Date.now(),
    };
  }));
}
