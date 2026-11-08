import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Small uppercase label above a heading, as in the S02–S04 designs. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-label uppercase text-accent', className)}>{children}</p>;
}

/** Pill chip used in the public page headers. */
export function Chip({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-small text-text-secondary">
      {icon}
      {children}
    </span>
  );
}

type SectionProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title?: string;
  intro?: string;
  headingId?: string;
};

/** A centred public-page section with optional eyebrow, h2 and intro. */
export function PublicSection({ eyebrow, title, intro, headingId, className, children, ...rest }: SectionProps) {
  return (
    <section aria-labelledby={title ? headingId : undefined} className={cn('mx-auto max-w-content px-6 py-10', className)} {...rest}>
      {title ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <h2 id={headingId} className="mt-1 text-h2 text-primary">
              {title}
            </h2>
          </div>
          {intro ? <p className="max-w-md text-body text-text-secondary">{intro}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Dark navy callout band (S02 governance principle, S03 human oversight). */
export function DarkCallout({ eyebrow, icon, children }: { eyebrow: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-card bg-primary p-6 text-text-on-dark md:p-8">
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-card bg-primary-deep text-accent-tint">
        {icon}
      </span>
      <div>
        <p className="text-label uppercase text-accent-tint">{eyebrow}</p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
