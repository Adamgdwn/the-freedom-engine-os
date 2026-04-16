export type LearningSignalKind = 'preference' | 'focus' | 'workflow' | 'capability';
export type LearningSignalStatus = 'observed' | 'tracking' | 'internalized';

export interface VoiceLearningSignal {
  id:        string;
  topic:     string;
  summary:   string;
  kind:      LearningSignalKind;
  status:    LearningSignalStatus;
  createdAt: number;
  updatedAt: number;
}

export type VoiceLearningUpdate =
  | { type: 'recorded'; signal: VoiceLearningSignal }
  | { type: 'status'; signalId: string; status: LearningSignalStatus }
  | { type: 'summary'; signalId: string; summary: string };

export type SelfProgrammingRequestStatus = 'pending' | 'approved' | 'denied';

export interface SelfProgrammingRequest {
  id:         string;
  capability: string;
  reason:     string;
  status:     SelfProgrammingRequestStatus;
  createdAt:  number;
  updatedAt:  number;
}

export type SelfProgrammingRequestUpdate =
  | { type: 'created'; request: SelfProgrammingRequest }
  | { type: 'status'; requestId: string; status: SelfProgrammingRequestStatus };

function sortByUpdatedAt<T extends { updatedAt: number }>(items: T[]) {
  return [...items].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function applyVoiceLearningUpdate(
  signals: VoiceLearningSignal[],
  update: VoiceLearningUpdate,
): VoiceLearningSignal[] {
  if (update.type === 'recorded') {
    const remaining = signals.filter((signal) => signal.id !== update.signal.id);
    return sortByUpdatedAt([update.signal, ...remaining]);
  }

  const nextSignals = signals.map((signal) => {
    if (signal.id !== update.signalId) {
      return signal;
    }

    if (update.type === 'status') {
      return {
        ...signal,
        status:    update.status,
        updatedAt: Date.now(),
      };
    }

    return {
      ...signal,
      summary:   update.summary,
      updatedAt: Date.now(),
    };
  });

  return sortByUpdatedAt(nextSignals);
}

export function applySelfProgrammingRequestUpdate(
  requests: SelfProgrammingRequest[],
  update: SelfProgrammingRequestUpdate,
): SelfProgrammingRequest[] {
  if (update.type === 'created') {
    const remaining = requests.filter((request) => request.id !== update.request.id);
    return sortByUpdatedAt([update.request, ...remaining]);
  }

  const nextRequests = requests.map((request) => {
    if (request.id !== update.requestId) {
      return request;
    }

    return {
      ...request,
      status:    update.status,
      updatedAt: Date.now(),
    };
  });

  return sortByUpdatedAt(nextRequests);
}
