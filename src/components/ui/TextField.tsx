import { Lock } from 'lucide-react';
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, controlStateClasses, describedBy, FieldError, FieldHelp, FieldLabel } from './Field';

type BaseProps = {
  label: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  helperText?: string;
  error?: string;
};

type TextFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'name'> & {
    /** Tooltip shown on the lock icon of a read-only field. */
    readOnlyReason?: string;
  };

export function TextField({
  label,
  name,
  value,
  onChange,
  required,
  helperText,
  error,
  readOnly,
  readOnlyReason,
  type = 'text',
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          required={required}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helperText && helpId, error && errorId)}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(controlClasses, controlStateClasses(error), 'h-button', readOnly && 'pr-10')}
          {...rest}
        />
        {readOnly ? (
          <span title={readOnlyReason} className="absolute inset-y-0 right-3 flex items-center text-text-secondary">
            <Lock aria-hidden className="size-icon-sm" />
          </span>
        ) : null}
      </div>
      {helperText ? <FieldHelp id={helpId}>{helperText}</FieldHelp> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

type TextareaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'name'>;

export function Textarea({
  label,
  name,
  value,
  onChange,
  required,
  helperText,
  error,
  maxLength,
  rows = 4,
  className,
  ...rest
}: TextareaProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(helperText && helpId, error && errorId, maxLength !== undefined && counterId)}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(controlClasses, controlStateClasses(error), 'py-2')}
        {...rest}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          {helperText ? <FieldHelp id={helpId}>{helperText}</FieldHelp> : null}
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
        </div>
        {maxLength !== undefined ? (
          <p id={counterId} className="mt-1 text-small text-text-secondary">
            {`${value.length}/${maxLength}`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
