import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PROTOTYPE_NOTICE, PROTOTYPE_NOTICE_SHORT } from '@/lib/format/messages';

type Variant = 'public' | 'app';

const variants: Record<Variant, string> = {
  public: 'bg-notice-public-bg text-notice-public-fg',
  app: 'border-b border-notice-app-border bg-notice-app-bg text-notice-app-fg',
};

/** BR32: shown at the very top of every page. Short text on mobile (S45). */
export function PrototypeNotice({ variant = 'public' }: { variant?: Variant }) {
  return (
    <div
      role="note"
      data-variant={variant}
      data-testid="prototype-notice"
      className={cn('flex min-h-notice w-full items-center justify-center gap-1 px-4 py-1 text-center text-small font-semibold', variants[variant])}
    >
      <TriangleAlert aria-hidden className="size-icon-sm shrink-0" />
      <span className="hidden sm:inline">{PROTOTYPE_NOTICE}</span>
      <span className="sm:hidden">{PROTOTYPE_NOTICE_SHORT}</span>
    </div>
  );
}
