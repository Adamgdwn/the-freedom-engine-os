import 'server-only';

import { loadFreedomMemorySnapshot } from '@/lib/freedom-memory-store';
import { isActivePersonaOverlay } from '@/lib/freedom-persona';
import type { FreedomMemorySnapshot } from '@/lib/freedom-memory';
import type { SelfProgrammingRequest } from '@/lib/voice-learning';

export type RuntimeContextMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type FreedomRuntimeContextOptions = {
  messages?: RuntimeContextMessage[];
  messageLimit?: number;
};

function formatRecentConversationSection(
  messages: RuntimeContextMessage[],
  limit: number,
): string {
  const recent = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-limit);

  if (!recent.length) {
    return '';
  }

  const lines = recent
    .map((message) => {
      const label = message.role === 'user' ? 'User' : 'Freedom';
      return `- ${label}: ${message.content.trim()}`;
    })
    .filter((line) => !line.endsWith(':'));

  return lines.length ? `Recent conversation:\n${lines.join('\n')}` : '';
}

function formatOpenTaskSection(snapshot: FreedomMemorySnapshot): string {
  const activeTasks = snapshot.tasks
    .filter((task) => task.status === 'active' || task.status === 'parked' || task.status === 'ready')
    .slice(0, 6);

  if (!activeTasks.length) {
    return '';
  }

  return [
    'Open task memory:',
    ...activeTasks.map((task) => `- ${task.topic}: ${task.summary} (${task.status})`),
  ].join('\n');
}

function formatLearningSection(snapshot: FreedomMemorySnapshot): string {
  const learningSignals = snapshot.learningSignals.slice(0, 6);
  if (!learningSignals.length) {
    return '';
  }

  return [
    'Recent durable memory:',
    ...learningSignals.map((signal) => (
      `- ${signal.topic}: ${signal.summary} (${signal.kind}, ${signal.status})`
    )),
  ].join('\n');
}

function formatConversationMemorySection(snapshot: FreedomMemorySnapshot): string {
  const memories = snapshot.conversationMemories.slice(0, 8);
  if (!memories.length) {
    return '';
  }

  return [
    'Relationship memory:',
    ...memories.map((memory) => (
      `- ${memory.topic}: ${memory.summary} (${memory.category}, ${memory.status})`
    )),
  ].join('\n');
}

function formatPendingProgrammingSection(snapshot: FreedomMemorySnapshot): string {
  const pendingRequests = snapshot.programmingRequests
    .filter((request) => request.status === 'pending' && !request.buildLane)
    .slice(0, 4);

  if (!pendingRequests.length) {
    return '';
  }

  return [
    'Pending self-programming requests requiring approval:',
    ...pendingRequests.map((request) => `- ${request.capability}: ${request.reason}`),
  ].join('\n');
}

function isBuildLaneRequest(request: SelfProgrammingRequest): boolean {
  return Boolean(request.buildLane);
}

function formatBuildLaneSection(snapshot: FreedomMemorySnapshot): string {
  const buildLaneRequests = snapshot.programmingRequests
    .filter(isBuildLaneRequest)
    .slice(0, 6);

  if (!buildLaneRequests.length) {
    return '';
  }

  return [
    'Conversation build lane:',
    ...buildLaneRequests.map((request) => (
      `- ${request.capability} [${request.buildLane?.approvalState ?? 'needs-approval'}]: ${request.reason}`
    )),
  ].join('\n');
}

function formatPersonaSection(snapshot: FreedomMemorySnapshot): string {
  const activeOverlays = snapshot.personaOverlays
    .filter(isActivePersonaOverlay)
    .slice(0, 6);

  if (!activeOverlays.length) {
    return '';
  }

  return [
    'Approved persona overlays:',
    ...activeOverlays.map((overlay) => `- ${overlay.title}: ${overlay.instruction}`),
  ].join('\n');
}

export async function loadFreedomRuntimeContext(
  options: FreedomRuntimeContextOptions = {},
): Promise<string> {
  const snapshot = await loadFreedomMemorySnapshot();
  const sections = [
    formatRecentConversationSection(options.messages ?? [], options.messageLimit ?? 6),
    formatConversationMemorySection(snapshot),
    formatOpenTaskSection(snapshot),
    formatLearningSection(snapshot),
    formatPendingProgrammingSection(snapshot),
    formatBuildLaneSection(snapshot),
    formatPersonaSection(snapshot),
  ].filter(Boolean);

  return sections.join('\n\n').trim();
}
