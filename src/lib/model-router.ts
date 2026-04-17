import {
  describeModelRouterStatus,
  getModelRouterConfig,
} from '@freedom/shared';
import type { ExecutionBudget } from '@/lib/types';

export { describeModelRouterStatus as describeVoiceRuntimeStatus, getModelRouterConfig };

export function getExecutionBudgetDefaults(): ExecutionBudget[] {
  const config = getModelRouterConfig();

  return [
    {
      id: 'budget-01',
      taskId: 'daily-ops-review',
      maxLocalAttempts: 3,
      escalationAllowed: true,
      preferredProvider: config.dayToDayProvider,
      hardCap: false,
    },
    {
      id: 'budget-02',
      taskId: 'build-request-01',
      maxLocalAttempts: 1,
      escalationAllowed: true,
      preferredProvider: config.heavyCodeProvider,
      hardCap: false,
    },
    {
      id: 'budget-03',
      taskId: 'self-evolving-platform-plan',
      maxLocalAttempts: 1,
      escalationAllowed: true,
      preferredProvider: config.broadSynthesisProvider,
      hardCap: false,
    },
  ];
}
