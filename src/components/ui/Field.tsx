import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Shared label, helper and error parts for every form control (TextField, Select, PasswordField). */

export const controlClasses =
  'w-full rounded-input border bg-surface px-3 text-body text-text placeholder:text-text-secondary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted';

export function controlStateClasses(error?: string): string {
  return error ? 'border-error' : 'border-border';
}

export function FieldLabel({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1 text-body font-medium text-text">
      {children}
      {required ? (
        <span aria-hidden className="text-error">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldHelp({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-small text-text-secondary">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className={cn('mt-1 flex items-start gap-1 text-small text-error')}>
      <CircleAlert aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
      <span id={id}>{children}</span>
    </p>
  );
}

/** Builds aria-describedby from the ids that are present. */
export function describedBy(...ids: Array<string | false | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}
