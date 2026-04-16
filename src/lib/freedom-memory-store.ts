import 'server-only';

import type { FreedomMemorySnapshot, FreedomMemoryUpdateRequest } from '@/lib/freedom-memory';
import type { SelfProgrammingRequest } from '@/lib/voice-learning';
import type { VoiceLearningSignal } from '@/lib/voice-learning';
import type { VoiceTask } from '@/lib/voice-tasks';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase-admin';

type TaskRow = {
  id: string;
  topic: string;
  status: VoiceTask['status'];
  summary: string;
  created_at: string;
  updated_at: string;
};

type LearningSignalRow = {
  id: string;
  topic: string;
  summary: string;
  kind: VoiceLearningSignal['kind'];
  status: VoiceLearningSignal['status'];
  created_at: string;
  updated_at: string;
};

type ProgrammingRequestRow = {
  id: string;
  capability: string;
  reason: string;
  status: SelfProgrammingRequest['status'];
  created_at: string;
  updated_at: string;
};

function toEpoch(value: string) {
  return new Date(value).getTime();
}

function toIso(value: number) {
  return new Date(value).toISOString();
}

function mapTask(row: TaskRow): VoiceTask {
  return {
    id:        row.id,
    topic:     row.topic,
    status:    row.status,
    summary:   row.summary,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
  };
}

function mapLearningSignal(row: LearningSignalRow): VoiceLearningSignal {
  return {
    id:        row.id,
    topic:     row.topic,
    summary:   row.summary,
    kind:      row.kind,
    status:    row.status,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
  };
}

function mapProgrammingRequest(row: ProgrammingRequestRow): SelfProgrammingRequest {
  return {
    id:         row.id,
    capability: row.capability,
    reason:     row.reason,
    status:     row.status,
    createdAt:  toEpoch(row.created_at),
    updatedAt:  toEpoch(row.updated_at),
  };
}

export async function loadFreedomMemorySnapshot(): Promise<FreedomMemorySnapshot> {
  if (!isSupabaseAdminConfigured()) {
    return {
      tasks:               [],
      learningSignals:     [],
      programmingRequests: [],
      configured:          false,
    };
  }

  const client = createSupabaseAdminClient();

  const [
    tasksResult,
    learningSignalsResult,
    programmingRequestsResult,
  ] = await Promise.all([
    client
      .from('freedom_voice_tasks')
      .select('id, topic, status, summary, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
    client
      .from('freedom_learning_signals')
      .select('id, topic, summary, kind, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
    client
      .from('freedom_programming_requests')
      .select('id, capability, reason, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
  ]);

  if (tasksResult.error) {
    throw tasksResult.error;
  }
  if (learningSignalsResult.error) {
    throw learningSignalsResult.error;
  }
  if (programmingRequestsResult.error) {
    throw programmingRequestsResult.error;
  }

  return {
    tasks:               (tasksResult.data ?? []).map(mapTask),
    learningSignals:     (learningSignalsResult.data ?? []).map(mapLearningSignal),
    programmingRequests: (programmingRequestsResult.data ?? []).map(mapProgrammingRequest),
    configured:          true,
  };
}

export async function persistFreedomMemoryUpdate(request: FreedomMemoryUpdateRequest) {
  if (!isSupabaseAdminConfigured()) {
    return { configured: false };
  }

  const client = createSupabaseAdminClient();

  if (request.channel === 'task') {
    if (request.update.type === 'created') {
      const { error } = await client.from('freedom_voice_tasks').upsert({
        id:         request.update.task.id,
        topic:      request.update.task.topic,
        status:     request.update.task.status,
        summary:    request.update.task.summary,
        created_at: toIso(request.update.task.createdAt),
        updated_at: toIso(request.update.task.updatedAt),
      });
      if (error) throw error;
      return { configured: true };
    }

    if (request.update.type === 'status') {
      const { error } = await client
        .from('freedom_voice_tasks')
        .update({
          status:     request.update.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.update.taskId);
      if (error) throw error;
      return { configured: true };
    }

    const { error } = await client
      .from('freedom_voice_tasks')
      .update({
        summary:    request.update.summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.update.taskId);
    if (error) throw error;
    return { configured: true };
  }

  if (request.channel === 'learning') {
    if (request.update.type === 'recorded') {
      const { error } = await client.from('freedom_learning_signals').upsert({
        id:         request.update.signal.id,
        topic:      request.update.signal.topic,
        summary:    request.update.signal.summary,
        kind:       request.update.signal.kind,
        status:     request.update.signal.status,
        created_at: toIso(request.update.signal.createdAt),
        updated_at: toIso(request.update.signal.updatedAt),
      });
      if (error) throw error;
      return { configured: true };
    }

    if (request.update.type === 'status') {
      const { error } = await client
        .from('freedom_learning_signals')
        .update({
          status:     request.update.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.update.signalId);
      if (error) throw error;
      return { configured: true };
    }

    const { error } = await client
      .from('freedom_learning_signals')
      .update({
        summary:    request.update.summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.update.signalId);
    if (error) throw error;
    return { configured: true };
  }

  if (request.update.type === 'created') {
    const { error } = await client.from('freedom_programming_requests').upsert({
      id:         request.update.request.id,
      capability: request.update.request.capability,
      reason:     request.update.request.reason,
      status:     request.update.request.status,
      created_at: toIso(request.update.request.createdAt),
      updated_at: toIso(request.update.request.updatedAt),
    });
    if (error) throw error;
    return { configured: true };
  }

  const { error } = await client
    .from('freedom_programming_requests')
    .update({
      status:     request.update.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.update.requestId);
  if (error) throw error;
  return { configured: true };
}
