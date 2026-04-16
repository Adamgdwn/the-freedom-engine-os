export type TaskStatus = 'active' | 'parked' | 'ready' | 'done';

export interface VoiceTask {
  id:        string;
  topic:     string;
  status:    TaskStatus;
  summary:   string;
  createdAt: number;
  updatedAt: number;
}

export type VoiceTaskUpdate =
  | { type: 'created'; task: VoiceTask }
  | { type: 'status'; taskId: string; status: TaskStatus }
  | { type: 'summary'; taskId: string; summary: string };

function sortByUpdatedAt(tasks: VoiceTask[]) {
  return [...tasks].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function applyVoiceTaskUpdate(
  tasks: VoiceTask[],
  update: VoiceTaskUpdate,
): VoiceTask[] {
  if (update.type === 'created') {
    const remaining = tasks.filter((task) => task.id !== update.task.id);
    return sortByUpdatedAt([update.task, ...remaining]);
  }

  const updated = tasks.map((task) => {
    if (task.id !== update.taskId) {
      return task;
    }

    if (update.type === 'status') {
      return {
        ...task,
        status:    update.status,
        updatedAt: Date.now(),
      };
    }

    return {
      ...task,
      summary:   update.summary,
      updatedAt: Date.now(),
    };
  });

  return sortByUpdatedAt(updated);
}
