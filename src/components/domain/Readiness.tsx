import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The overall score (S18), or the small version in the claim header. */
export function ReadinessRing({ value, size }: { value: number; size: 'large' | 'mini' }) {
  const large = size === 'large';
  return (
    <div role="img" aria-label={`Readiness ${value}%`} data-size={size} className={cn('relative shrink-0', large ? 'size-32' : 'size-12')}>
      <svg viewBox="0 0 36 36" aria-hidden className="size-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" className="stroke-surface-sunken" />
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${value} 100`} className="stroke-accent" />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center font-semibold text-primary', large ? 'text-h1' : 'text-small')}>{`${value}%`}</span>
    </div>
  );
}

type CategoryBarProps = { label: string; value: number; weight: number; children?: ReactNode };

/** One weighted readiness category (S14, S18). */
export function CategoryBar({ label, value, weight, children }: CategoryBarProps) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="category-bar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-text">{label}</span>
          <span className="rounded-chip bg-surface-muted px-2 text-small text-text-secondary">{`Weight ${weight}%`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-primary">{`${value}%`}</span>
          {children ? (
            <button
              type="button"
              aria-label={`${open ? 'Hide' : 'Show'} details for ${label}`}
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className="rounded-input p-1 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronDown aria-hidden className={cn('size-icon-sm transition-transform', open && 'rotate-180')} />
            </button>
          ) : null}
        </div>
      </div>
      <progress aria-label={label} value={value} max={100} aria-valuenow={value} className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-accent" />
      {open ? <div className="mt-2 text-small text-text-secondary">{children}</div> : null}
    </div>
  );
}
