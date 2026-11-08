import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  neutral: 'bg-severity-low-bg text-severity-low-fg',
  info: 'bg-info-tint text-info',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  error: 'bg-error-tint text-error',
};
type Tone = keyof typeof TONES;
type Definition = [label: string, tone: Tone];

const STATES = {
  document: { uploaded: ['Uploaded', 'neutral'], processing: ['Processing', 'info'], processed: ['Processed', 'success'], failed: ['Failed', 'error'], review_required: ['Review required', 'warning'] },
  issue: { open: ['Open', 'warning'], under_review: ['Under review', 'info'], resolved: ['Resolved', 'success'], dismissed: ['Dismissed', 'neutral'] },
  alert: { OPEN: ['Open', 'warning'], UNDER_REVIEW: ['Under review', 'info'], ESCALATED: ['Escalated', 'error'], RESOLVED: ['Resolved', 'success'], DISMISSED: ['Dismissed', 'neutral'] },
  request: { pending: ['Pending', 'warning'], responded: ['Responded', 'info'], under_review: ['Under review', 'info'], closed: ['Closed', 'neutral'], overdue: ['Overdue', 'error'] },
  confidence: { high: ['High', 'success'], medium: ['Medium', 'warning'], low: ['Low', 'error'] },
  account: { active: ['Active', 'success'], invited: ['Invited', 'info'], suspended: ['Suspended', 'warning'], disabled: ['Disabled', 'error'] },
} as const satisfies Record<string, Record<string, Definition>>;

export type StateKind = keyof typeof STATES;

/** Every non-claim state in the app, always shown as text as well as colour (PRD 10.5). */
export function StateChip({ kind, state }: { kind: StateKind; state: string }) {
  const [label, tone] = (STATES[kind] as Record<string, Definition>)[state] ?? ([state, 'neutral'] as Definition);
  return (
    <span data-state={state} className={cn('inline-flex h-chip items-center gap-1 whitespace-nowrap rounded-chip px-2 text-small font-semibold', TONES[tone])}>
      {kind === 'document' && state === 'processing' ? <LoaderCircle data-spinner aria-hidden className="size-icon-sm animate-spin" /> : null}
      <span>{label}</span>
    </span>
  );
}
