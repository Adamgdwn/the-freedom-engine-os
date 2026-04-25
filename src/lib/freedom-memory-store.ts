import 'server-only';

import type { FreedomConversationMemory } from '@/lib/freedom-conversation-memory';
import type { FreedomPersonaOverlay } from '@/lib/freedom-persona';
import type { FreedomMemorySnapshot, FreedomMemoryUpdateRequest } from '@/lib/freedom-memory';
import type { SelfProgrammingRequest } from '@/lib/voice-learning';
import type { VoiceLearningSignal } from '@/lib/voice-learning';
import type { VoiceTask } from '@/lib/voice-tasks';
import {
  parseProgrammingRequestReason,
  serializeProgrammingRequestReason,
  type ConversationBuildLaneDraft,
} from '@freedom/shared';
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

type ConversationMemoryRow = {
  id: string;
  topic: string;
  summary: string;
  category: FreedomConversationMemory['category'];
  confidence: number | null;
  status: FreedomConversationMemory['status'];
  source_session_id: string | null;
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

type PersonaOverlayRow = {
  id: string;
  title: string;
  instruction: string;
  rationale: string;
  source: FreedomPersonaOverlay['source'];
  status: FreedomPersonaOverlay['status'];
  change_type: FreedomPersonaOverlay['changeType'];
  target_overlay_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseResult<T> = {
  data: T[] | null;
  error: { code?: string } | null;
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

function mapConversationMemory(row: ConversationMemoryRow): FreedomConversationMemory {
  return {
    id: row.id,
    topic: row.topic,
    summary: row.summary,
    category: row.category,
    confidence: typeof row.confidence === 'number' ? row.confidence : 0.5,
    status: row.status,
    sourceSessionId: row.source_session_id,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
  };
}

function mapProgrammingRequest(row: ProgrammingRequestRow): SelfProgrammingRequest {
  const parsedReason = parseProgrammingRequestReason(row.reason, {
    id: row.id,
    title: row.capability,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  return {
    id:         row.id,
    capability: row.capability,
    reason:     parsedReason.summary,
    buildLane:  parsedReason.buildLane,
    status:     row.status,
    createdAt:  toEpoch(row.created_at),
    updatedAt:  toEpoch(row.updated_at),
  };
}

function toBuildLaneDraft(request: SelfProgrammingRequest): ConversationBuildLaneDraft | null {
  if (!request.buildLane) {
    return null;
  }

  return {
    summary: request.buildLane.summary,
    objective: request.buildLane.objective,
    businessCase: request.buildLane.businessCase,
    operator: request.buildLane.operator,
    approvalState: request.buildLane.approvalState,
    autonomyEnvelope: request.buildLane.autonomyEnvelope,
    executionSurface: request.buildLane.executionSurface,
    reportingPath: request.buildLane.reportingPath,
    nextCheckpoint: request.buildLane.nextCheckpoint,
    requestedBy: request.buildLane.requestedBy,
    requestedFrom: request.buildLane.requestedFrom,
    pricingModel: request.buildLane.pricingModel,
    scalePotential: request.buildLane.scalePotential,
    hostId: request.buildLane.hostId,
  };
}

function mapPersonaOverlay(row: PersonaOverlayRow): FreedomPersonaOverlay {
  return {
    id: row.id,
    title: row.title,
    instruction: row.instruction,
    rationale: row.rationale,
    source: row.source,
    status: row.status,
    changeType: row.change_type,
    targetOverlayId: row.target_overlay_id,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
  };
}

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205';
}

function dataOrEmpty<T>(result: SupabaseResult<T>): T[] {
  return isMissingTableError(result.error) ? [] : (result.data ?? []);
}

export async function loadFreedomMemorySnapshot(): Promise<FreedomMemorySnapshot> {
  if (!isSupabaseAdminConfigured()) {
    return {
      tasks:               [],
      learningSignals:     [],
      conversationMemories: [],
      programmingRequests: [],
      personaOverlays:     [],
      configured:          false,
    };
  }

  const client = createSupabaseAdminClient();

  const [
    tasksResult,
    learningSignalsResult,
    conversationMemoriesResult,
    programmingRequestsResult,
    personaOverlaysResult,
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
      .from('freedom_conversation_memories')
      .select('id, topic, summary, category, confidence, status, source_session_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
    client
      .from('freedom_programming_requests')
      .select('id, capability, reason, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
    client
      .from('freedom_persona_overlays')
      .select('id, title, instruction, rationale, source, status, change_type, target_overlay_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
  ]);

  if (tasksResult.error && !isMissingTableError(tasksResult.error)) {
    throw tasksResult.error;
  }
  if (learningSignalsResult.error && !isMissingTableError(learningSignalsResult.error)) {
    throw learningSignalsResult.error;
  }
  if (conversationMemoriesResult.error && !isMissingTableError(conversationMemoriesResult.error)) {
    throw conversationMemoriesResult.error;
  }
  if (programmingRequestsResult.error && !isMissingTableError(programmingRequestsResult.error)) {
    throw programmingRequestsResult.error;
  }
  if (personaOverlaysResult.error && !isMissingTableError(personaOverlaysResult.error)) {
    throw personaOverlaysResult.error;
  }

  return {
    tasks:               dataOrEmpty(tasksResult).map(mapTask),
    learningSignals:     dataOrEmpty(learningSignalsResult).map(mapLearningSignal),
    conversationMemories: dataOrEmpty(conversationMemoriesResult).map(mapConversationMemory),
    programmingRequests: dataOrEmpty(programmingRequestsResult).map(mapProgrammingRequest),
    personaOverlays:     dataOrEmpty(personaOverlaysResult).map(mapPersonaOverlay),
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

  if (request.channel === 'conversation') {
    if (request.update.type === 'recorded') {
      const { error } = await client.from('freedom_conversation_memories').upsert({
        id: request.update.memory.id,
        topic: request.update.memory.topic,
        summary: request.update.memory.summary,
        category: request.update.memory.category,
        confidence: request.update.memory.confidence,
        status: request.update.memory.status,
        source_session_id: request.update.memory.sourceSessionId,
        created_at: toIso(request.update.memory.createdAt),
        updated_at: toIso(request.update.memory.updatedAt),
      });
      if (error) throw error;
      return { configured: true };
    }

    if (request.update.type === 'status') {
      const { error } = await client
        .from('freedom_conversation_memories')
        .update({
          status: request.update.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.update.memoryId);
      if (error) throw error;
      return { configured: true };
    }

    const { error } = await client
      .from('freedom_conversation_memories')
      .update({
        summary: request.update.summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.update.memoryId);
    if (error) throw error;
    return { configured: true };
  }

  if (request.channel === 'persona') {
    if (request.update.type === 'recorded') {
      const { error } = await client.from('freedom_persona_overlays').upsert({
        id:                request.update.overlay.id,
        title:             request.update.overlay.title,
        instruction:       request.update.overlay.instruction,
        rationale:         request.update.overlay.rationale,
        source:            request.update.overlay.source,
        status:            request.update.overlay.status,
        change_type:       request.update.overlay.changeType,
        target_overlay_id: request.update.overlay.targetOverlayId,
        created_at:        toIso(request.update.overlay.createdAt),
        updated_at:        toIso(request.update.overlay.updatedAt),
      });
      if (error) throw error;
      return { configured: true };
    }

    if (request.update.type === 'status') {
      const targetOverlayResult = await client
        .from('freedom_persona_overlays')
        .select('change_type, target_overlay_id')
        .eq('id', request.update.overlayId)
        .maybeSingle();
      if (targetOverlayResult.error) throw targetOverlayResult.error;

      const targetOverlay = targetOverlayResult.data as {
        change_type: FreedomPersonaOverlay['changeType'];
        target_overlay_id: string | null;
      } | null;

      const updatedAt = new Date().toISOString();
      const { error } = await client
        .from('freedom_persona_overlays')
        .update({
          status:     request.update.status,
          updated_at: updatedAt,
        })
        .eq('id', request.update.overlayId);
      if (error) throw error;

      if (
        request.update.status === 'approved'
        && targetOverlay?.target_overlay_id
        && targetOverlay.change_type !== 'new'
      ) {
        const { error: retireTargetError } = await client
          .from('freedom_persona_overlays')
          .update({
            status:     'retired',
            updated_at: updatedAt,
          })
          .eq('id', targetOverlay.target_overlay_id);
        if (retireTargetError) throw retireTargetError;
      }

      return { configured: true };
    }

    const { error } = await client
      .from('freedom_persona_overlays')
      .update({
        instruction: request.update.instruction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.update.overlayId);
    if (error) throw error;
    return { configured: true };
  }

  if (request.update.type === 'created') {
    const { error } = await client.from('freedom_programming_requests').upsert({
      id:         request.update.request.id,
      capability: request.update.request.capability,
      reason:     serializeProgrammingRequestReason(request.update.request.reason, toBuildLaneDraft(request.update.request)),
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
