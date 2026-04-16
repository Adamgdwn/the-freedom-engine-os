import type { PropsWithChildren, ReactNode } from 'react';

type PanelProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
}>;

export function Panel({ title, eyebrow, aside, className, children }: PanelProps) {
  return (
    <section
      className={`panel rounded-xl border border-white/60 p-4 lg:p-5 ${className ?? ''}`.trim()}
    >
      <div className="mb-4 flex flex-col gap-2 border-b border-[color:var(--line)] pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--primary)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--ink)]">
            {title}
          </h2>
        </div>
        {aside ? <div className="text-sm text-[color:var(--ink-soft)]">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
