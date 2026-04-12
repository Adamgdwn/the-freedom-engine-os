import { AppShell } from '@/components/app-shell';
import { Panel } from '@/components/panel';
import { getControlPlaneSnapshot } from '@/lib/control-plane';

export default function EvidenceRoomPage() {
  const snapshot = getControlPlaneSnapshot();

  return (
    <AppShell
      title="Evidence Room"
      summary="Recommendations live or die by evidence. This room traces decisions back to metrics, workflow logs, customer signal, financial observations, and governance events."
    >
      <Panel title="Evidence registry" eyebrow="Traceable inputs">
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.evidenceItems.map((item) => (
            <div
              key={item.id}
              className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/78 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-[color:var(--ink)]">{item.title}</h3>
                <span className="rounded-full bg-[color:var(--accent)]/12 px-3 py-1 text-sm text-[color:var(--accent)]">
                  {item.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{item.source}</p>
              <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)]">{item.summary}</p>
              <p className="mt-4 text-sm text-[color:var(--ink)]">Linked entity: {item.relatedEntity}</p>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
