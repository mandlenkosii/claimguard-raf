import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StepStatus = 'complete' | 'current' | 'upcoming';

export type Step = {
  id: string;
  label: string;
  status: StepStatus;
  description?: string;
  timestamp?: string;
};

type StepperProps = {
  label: string;
  /** tracker = horizontal workflow; wizard = vertical numbered; history = vertical status history. */
  variant: 'tracker' | 'wizard' | 'history';
  steps: Step[];
};

const markerClasses: Record<StepStatus, string> = {
  complete: 'bg-accent text-text-on-dark border-accent',
  current: 'bg-warning-tint text-warning border-warning',
  upcoming: 'bg-surface text-text-secondary border-border',
};

export function Stepper({ label, variant, steps }: StepperProps) {
  const horizontal = variant === 'tracker';
  return (
    <ol
      aria-label={label}
      data-orientation={horizontal ? 'horizontal' : 'vertical'}
      className={cn(horizontal ? 'flex items-start gap-2 overflow-x-auto' : 'flex flex-col gap-4')}
    >
      {steps.map((step, index) => (
        <li
          key={step.id}
          data-status={step.status}
          aria-current={step.status === 'current' ? 'step' : undefined}
          className={cn('flex gap-3', horizontal ? 'min-w-28 flex-1 flex-col items-center text-center' : 'items-start')}
        >
          <span
            aria-hidden
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-small font-semibold', markerClasses[step.status])}
          >
            {step.status === 'complete' && variant !== 'wizard' ? <Check className="size-icon-sm" /> : index + 1}
          </span>
          <div>
            <p className={cn('text-body font-medium', step.status === 'upcoming' ? 'text-text-secondary' : 'text-text')}>
              {step.label}
            </p>
            {step.description ? <p className="text-small text-text-secondary">{step.description}</p> : null}
            {step.timestamp ? <p className="font-mono text-small text-text-secondary">{step.timestamp}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
