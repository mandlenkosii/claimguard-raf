import { cn } from '@/lib/cn';

export const CLAIM_STATUSES: Record<string, string> = {
  draft: 'Draft',
  documents_needed: 'Documents Needed',
  validation: 'Validation',
  ready: 'Ready',
  submitted: 'Submitted',
  raf_review: 'RAF Review',
  information_required: 'Information Required',
  assessment: 'Assessment',
  negotiation: 'Negotiation',
  settlement: 'Settlement',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
  escalated: 'Escalated',
};

const STYLES: Record<string, string> = {
  draft: 'bg-severity-low-bg text-severity-low-fg',
  documents_needed: 'bg-warning-tint text-warning',
  validation: 'bg-info-tint text-info',
  ready: 'bg-success-tint text-success',
  submitted: 'bg-info-tint text-info',
  raf_review: 'bg-info-tint text-info',
  information_required: 'bg-severity-high-bg text-severity-high-fg',
  assessment: 'bg-info-tint text-info',
  negotiation: 'bg-warning-tint text-warning',
  settlement: 'bg-accent-tint text-primary',
  closed: 'bg-surface-sunken text-text-secondary',
  withdrawn: 'border border-border bg-surface text-text-secondary',
  rejected: 'bg-error-tint text-error',
  escalated: 'bg-severity-high-bg text-severity-high-fg',
};

/** Claim workflow status: always shown as text as well as colour (PRD 10.5). */
export function StatusChip({ status }: { status: string }) {
  return (
    <span data-status={status} className={cn('inline-flex h-chip items-center whitespace-nowrap rounded-chip px-2 text-small font-semibold', STYLES[status])}>
      {CLAIM_STATUSES[status] ?? status}
    </span>
  );
}
