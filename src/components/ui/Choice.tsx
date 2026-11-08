import { useId, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { FieldError } from './Field';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  name?: string;
};

export function Checkbox({ label, checked, onChange, disabled, error, name }: CheckboxProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={cn('flex items-start gap-2 text-body text-text', disabled && 'opacity-60')}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className={cn('mt-0.5 size-4 rounded accent-accent', focusRing, error && 'outline outline-1 outline-error')}
        />
        <span>{label}</span>
      </label>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

type Option = { value: string; label: string };

type RadioGroupProps = {
  legend: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
};

export function RadioGroup({ legend, name, value, options, onChange, disabled, error }: RadioGroupProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-1 text-body font-medium text-text">{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label key={option.value} className={cn('flex items-center gap-2 text-body text-text', disabled && 'opacity-60')}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className={cn('size-4 accent-accent', focusRing)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-2', disabled && 'opacity-60')}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed',
          checked ? 'bg-accent' : 'bg-border',
          focusRing,
        )}
      >
        <span
          aria-hidden
          className={cn('inline-block size-5 rounded-full bg-surface shadow-card transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')}
        />
      </button>
      <label htmlFor={id} className="text-body text-text">
        {label}
      </label>
    </div>
  );
}

type SegmentedControlProps = {
  label: string;
  /** Each segment takes an equal share of the full width (S06). */
  fullWidth?: boolean;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function SegmentedControl({ label, fullWidth, value, options, onChange, disabled }: SegmentedControlProps) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (next) onChange(next.value);
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('rounded-input border border-border bg-surface-muted p-0.5', fullWidth ? 'flex w-full' : 'inline-flex')}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'rounded-chip px-3 py-1 text-small font-semibold',
              fullWidth && 'flex-1',
              selected ? 'bg-primary text-text-on-dark' : 'text-text-secondary hover:text-text',
              focusRing,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
