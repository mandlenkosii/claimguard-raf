import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DEMONSTRATION_DATA_LABEL } from '@/lib/format/messages';

type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  actions?: ReactNode;
};

export function Card({ title, actions, className, children, ...rest }: CardProps) {
  return (
    <section className={cn('rounded-card border border-border bg-surface p-6 shadow-card', className)} {...rest}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title ? <h2 className="text-h3 text-primary">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  trend?: { direction: 'up' | 'down'; label: string };
  /** Shows the "Demonstration data" label (BR31). */
  demo?: boolean;
  className?: string;
};

export function KpiCard({ label, value, trend, demo, className }: KpiCardProps) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5 shadow-card', className)}>
      <p className="text-label uppercase text-text-secondary">{label}</p>
      <p className="mt-2 text-h1 text-primary">{value}</p>
      {trend ? (
        <p data-trend={trend.direction} className="mt-1 flex items-center gap-1 text-small text-text-secondary">
          <TrendIcon aria-hidden className="size-icon-sm" />
          {trend.label}
        </p>
      ) : null}
      {demo ? (
        <p className="mt-2 inline-flex rounded-chip bg-surface-muted px-2 py-0.5 text-small text-text-secondary">
          {DEMONSTRATION_DATA_LABEL}
        </p>
      ) : null}
    </div>
  );
}
