import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { loadControlPlaneSnapshot } from '@/lib/control-plane';

export default async function WeeklyReviewPage() {
  const snapshot = await loadControlPlaneSnapshot();

  return (
    <AppShell title="Weekly Review">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Created value" eyebrow="What mattered">
          <ul className="space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
            {snapshot.weeklyReview.createdValue.map((item) => (
              <li key={item} className="rounded-[1.4rem] bg-white/70 p-4">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Time without leverage" eyebrow="What to stop">
          <ul className="space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
            {snapshot.weeklyReview.wastedMotion.map((item) => (
              <li key={item} className="rounded-[1.4rem] bg-white/70 p-4">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Freedom gained and lost" eyebrow="Capacity impact">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[color:var(--surface-strong)] p-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">Increased freedom</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {snapshot.weeklyReview.freedomUp.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-[color:var(--surface-strong)] p-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">Reduced freedom</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {snapshot.weeklyReview.freedomDown.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel title="Next and human judgment" eyebrow="Where authority stays human">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] bg-white/72 p-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">System recommendations</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {snapshot.weeklyReview.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.5rem] bg-white/72 p-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">Human judgment required</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                {snapshot.weeklyReview.humanJudgmentRequired.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
