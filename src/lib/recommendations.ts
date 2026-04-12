import { evidenceItems, executions, ventures, weightSets, workflows } from '@/lib/seed-data';
import { rankVentures } from '@/lib/scoring';
import type { Recommendation } from '@/lib/types';

export function buildRecommendations(): Recommendation[] {
  const [activeWeights] = weightSets;
  const ranked = rankVentures(ventures, activeWeights);
  const topVenture = ranked[0]?.venture;
  const pdfWorkflow = workflows.find((workflow) => workflow.id === 'workflow-02');
  const blockedExecution = executions.find((execution) => execution.status === 'blocked');

  return [
    {
      id: 'recommendation-01',
      title: `Prioritize ${topVenture?.name ?? 'AI Consulting Build'} this week`,
      action:
        'Allocate founder time to the workflow teardown sprint and convert evidence into a repeatable offer.',
      rationale:
        'It currently leads on combined venture score and freedom impact, with the strongest near-term revenue path.',
      evidenceIds: ['evidence-01', 'evidence-02'],
      freedomGain: 'high',
      confidence: 'high',
    },
    {
      id: 'recommendation-02',
      title: `Automate next: ${pdfWorkflow?.name ?? 'PDF intake to delivery'}`,
      action:
        'Push AI classification and QA gating earlier in the PDF pipeline to cut manual triage and rework.',
      rationale:
        'The workflow has high AI suitability, measurable latency, and clear failure points backed by ops evidence.',
      evidenceIds: ['evidence-03', 'evidence-04'],
      freedomGain: 'high',
      confidence: 'high',
    },
    {
      id: 'recommendation-03',
      title: 'Keep priority changes human-gated',
      action:
        'Approve or reject the pending scoring-weight revision before allowing any portfolio reprioritization.',
      rationale:
        'A blocked execution shows the governance fabric is correctly preventing hidden priority drift.',
      evidenceIds: blockedExecution ? blockedExecution.evidenceIds : ['evidence-06'],
      freedomGain: 'medium',
      confidence: 'high',
    },
    {
      id: 'recommendation-04',
      title: 'Pause low-leverage platform expansion',
      action:
        'Limit net-new Freedom OS features to instrumentation, evidence logging, and weekly review until consulting proof improves.',
      rationale:
        'Platform leverage is high, but current value creation depends on proving the AI Consulting Build operating loop first.',
      evidenceIds: ['evidence-05', 'evidence-06'],
      freedomGain: 'medium',
      confidence: 'medium',
    },
    {
      id: 'recommendation-05',
      title: 'Route weak-signal ideas into experiments, not roadmap commitments',
      action:
        'Anything without linked evidence should be tracked as an experiment with an owner, hypothesis, and checkpoint.',
      rationale:
        'This reduces founder bias and keeps the control plane centered on measurable value instead of momentum theater.',
      evidenceIds: evidenceItems.slice(0, 2).map((item) => item.id),
      freedomGain: 'medium',
      confidence: 'medium',
    },
    {
      id: 'recommendation-06',
      title: 'Flag ADHD-path drift before it becomes roadmap debt',
      action:
        'When a request is exciting but off-plan, ask whether it advances the current north-star objective, belongs in the parking lot, or should become a scoped experiment.',
      rationale:
        'Attention is a core resource. Protecting it is part of governance, not a personal productivity side quest.',
      evidenceIds: ['evidence-05', 'evidence-07'],
      freedomGain: 'high',
      confidence: 'medium',
    },
  ];
}
