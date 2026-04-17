import {
  describeModelRouterStatus,
  getEscalationChoices,
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
      operatorSelectableProviders: getEscalationChoices('day-to-day', config),
      hardCap: false,
    },
    {
      id: 'budget-02',
      taskId: 'build-request-01',
      maxLocalAttempts: 1,
      escalationAllowed: true,
      preferredProvider: config.heavyCodeProvider,
      operatorSelectableProviders: getEscalationChoices('heavy-code', config),
      hardCap: false,
    },
    {
      id: 'budget-03',
      taskId: 'self-evolving-platform-plan',
      maxLocalAttempts: 1,
      escalationAllowed: true,
      preferredProvider: config.broadSynthesisProvider,
      operatorSelectableProviders: getEscalationChoices('broad-synthesis', config),
      hardCap: false,
    },
  ];
}
