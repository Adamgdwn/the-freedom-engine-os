import { buildRecommendations } from '@/lib/recommendations';
import { executions } from '@/lib/seed-data';
import type { WeeklyReview } from '@/lib/types';

export function buildWeeklyReview(): WeeklyReview {
  const recommendations = buildRecommendations().slice(0, 3).map((item) => item.title);
  const blockedCount = executions.filter((execution) => execution.status !== 'completed').length;

  return {
    createdValue: [
      'Workflow teardown work in AI Consulting Build shortened proposal creation and improved offer clarity.',
      'PDF operations evidence exposed exactly where queue classification and QA are stealing time.',
      'Governance preflight now passes locally, giving the operating system a valid controlled baseline.',
    ],
    wastedMotion: [
      'Switching across ventures without an explicit weekly allocation rule still burns strategic time.',
      'Manual PDF exception triage remains too reactive and interrupts higher-value work.',
    ],
    freedomUp: [
      'Founder hours reclaimed increased where repeatable workflow assets replaced blank-page consulting effort.',
      'Decision latency dropped because blocked actions are surfaced directly instead of being hidden in ad hoc work.',
    ],
    freedomDown: [
      `${blockedCount} execution path still needs human approval before it can move, creating avoidable stall risk.`,
      'Platform temptation is high; adding broad features before proof could reduce financial resilience.',
    ],
    recommendations,
    humanJudgmentRequired: [
      'Approve or reject the scoring-weight change before reprioritizing the portfolio.',
      'Choose whether AI Consulting Build remains the first deep integration domain for the next sprint.',
      'Decide the acceptable exception path for PDF refunds and customer-facing edge cases.',
    ],
  };
}
