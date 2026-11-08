import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, controlStateClasses, describedBy, FieldError, FieldHelp, FieldLabel } from './Field';

export type SelectOption = { value: string; label: string };

type CommonProps = {
  label: string;
  name: string;
  options: SelectOption[];
  required?: boolean;
  helperText?: string;
  error?: string;
  /** Hides the visible label (the accessible name stays). */
  hideLabel?: boolean;
};

type SelectProps = CommonProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'name' | 'multiple'> & {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };

export function Select({
  label,
  name,
  options,
  value,
  onChange,
  required,
  helperText,
  error,
  placeholder,
  hideLabel,
  className,
  ...rest
}: SelectProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helperText && helpId, error && errorId)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(controlClasses, controlStateClasses(error), 'h-button appearance-none pr-10')}
          {...rest}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-icon-sm -translate-y-1/2 text-text-secondary" />
      </div>
      {helperText ? <FieldHelp id={helpId}>{helperText}</FieldHelp> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

type MultiSelectProps = CommonProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'name' | 'multiple'> & {
    value: string[];
    onChange: (value: string[]) => void;
  };

export function MultiSelect({
  label,
  name,
  options,
  value,
  onChange,
  required,
  helperText,
  error,
  className,
  ...rest
}: MultiSelectProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <select
        id={id}
        name={name}
        multiple
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(helperText && helpId, error && errorId)}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
        className={cn(controlClasses, controlStateClasses(error), 'py-2')}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <FieldHelp id={helpId}>{helperText}</FieldHelp> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
