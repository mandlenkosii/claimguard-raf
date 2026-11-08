import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, controlStateClasses, describedBy, FieldError, FieldHelp, FieldLabel } from './Field';

/** The three parts of TXT-7: "Use at least 8 characters, including a letter and a number." */
export const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'A letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
] as const;

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helperText?: string;
  error?: string;
  /** Shows the strength meter and requirement checklist (S06, S07). */
  showRequirements?: boolean;
  autoComplete?: string;
};

export function PasswordField({
  label,
  name,
  value,
  onChange,
  required,
  helperText,
  error,
  showRequirements,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const listId = `${id}-requirements`;
  const [visible, setVisible] = useState(false);
  const results = PASSWORD_REQUIREMENTS.map((requirement) => ({ label: requirement.label, met: requirement.test(value) }));
  const metCount = results.filter((result) => result.met).length;

  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helperText && helpId, error && errorId, showRequirements && listId)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(controlClasses, controlStateClasses(error), 'h-button pr-12')}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-input text-text-secondary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {visible ? <EyeOff aria-hidden className="size-icon-sm" /> : <Eye aria-hidden className="size-icon-sm" />}
        </button>
      </div>
      {helperText ? <FieldHelp id={helpId}>{helperText}</FieldHelp> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      {showRequirements ? (
        <div className="mt-2">
          <div
            role="meter"
            aria-label="Password requirements met"
            aria-valuemin={0}
            aria-valuemax={PASSWORD_REQUIREMENTS.length}
            aria-valuenow={metCount}
            className="flex gap-1"
          >
            {PASSWORD_REQUIREMENTS.map((requirement, index) => (
              <span
                key={requirement.label}
                aria-hidden
                className={cn('h-1 flex-1 rounded-full', index < metCount ? 'bg-accent' : 'bg-border')}
              />
            ))}
          </div>
          <ul id={listId} className="mt-2 space-y-1">
            {results.map((result) => (
              <li
                key={result.label}
                data-met={String(result.met)}
                className={cn('flex items-center gap-1 text-small', result.met ? 'text-success' : 'text-text-secondary')}
              >
                {result.met ? <Check aria-hidden className="size-icon-sm" /> : <X aria-hidden className="size-icon-sm" />}
                {result.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
