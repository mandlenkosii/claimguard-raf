import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex h-button items-center justify-center gap-2 whitespace-nowrap rounded-input px-4 text-body font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-text-on-dark hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-primary hover:bg-surface-muted',
  ghost: 'bg-transparent text-primary hover:bg-surface-muted',
  danger: 'border border-error bg-surface text-error hover:bg-error-tint',
};

export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(base, variants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={buttonClasses(variant, className)}
      {...rest}
    >
      {loading ? <LoaderCircle data-spinner aria-hidden className="size-icon-sm animate-spin" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; icon?: ReactNode };

/** A router link styled as a button. */
export function ButtonLink({ variant = 'primary', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link data-variant={variant} className={buttonClasses(variant, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
