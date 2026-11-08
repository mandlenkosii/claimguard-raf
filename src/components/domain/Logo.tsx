import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

type LogoProps = {
  /** Icon only (collapsed sidebar rail); the wordmark stays for screen readers. */
  compact?: boolean;
  /** Light text for the navy sidebar. */
  tone?: 'dark' | 'light';
};

/** Shield-with-checkmark + "ClaimGuard RAF" wordmark. Never the official RAF logo or crest. */
export function Logo({ compact = false, tone = 'dark' }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        data-logo-shield
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-card',
          tone === 'dark' ? 'bg-primary text-text-on-dark' : 'bg-accent text-text-on-dark',
        )}
      >
        <ShieldCheck aria-hidden className="size-icon" />
      </span>
      <span className={cn('whitespace-nowrap text-h3', tone === 'dark' ? 'text-primary' : 'text-text-on-dark', compact && 'sr-only')}>
        ClaimGuard RAF
      </span>
    </span>
  );
}
