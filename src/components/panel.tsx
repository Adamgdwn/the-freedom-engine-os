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
      className={`panel rounded-[2rem] border border-white/60 p-6 lg:p-7 ${className ?? ''}`.trim()}
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-[color:var(--line)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--primary)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--ink)]">
            {title}
          </h2>
        </div>
        {aside ? <div className="text-sm text-[color:var(--ink-soft)]">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
