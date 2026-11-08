import { CircleAlert, WifiOff, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TRY_AGAIN, TXT } from '@/lib/format/messages';
import { Button } from './Button';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  action?: { label: string; onClick: () => void };
};

/** Empty state: an icon, one line of guidance and an optional action (S44). */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-secondary">
        <Icon aria-hidden className="size-icon" />
      </span>
      <p className="text-body font-medium text-text">{message}</p>
      {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}

/** Skeleton placeholders for tables and cards (S44). */
export function Skeleton({ variant, rows = 4 }: { variant: 'table' | 'card'; rows?: number }) {
  if (variant === 'card') {
    return (
      <div data-testid="skeleton-card" aria-busy="true" className="animate-pulse rounded-card border border-border bg-surface p-5">
        <div className="h-3 w-1/3 rounded-full bg-surface-sunken" />
        <div className="mt-4 h-6 w-1/2 rounded-full bg-surface-sunken" />
        <div className="mt-3 h-3 w-2/3 rounded-full bg-surface-sunken" />
      </div>
    );
  }
  return (
    <div data-testid="skeleton-table" aria-busy="true" className="animate-pulse space-y-3 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-4">
          <div className="h-4 flex-1 rounded-full bg-surface-sunken" />
          <div className="h-4 flex-[2] rounded-full bg-surface-sunken" />
          <div className="h-4 flex-1 rounded-full bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Error state with TXT-3 and "Try again" (S44). */
export function ErrorState({ message = TXT[3], onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-error-tint text-error">
        <CircleAlert aria-hidden className="size-icon" />
      </span>
      <p className="text-body font-medium text-text">{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {TRY_AGAIN}
        </Button>
      ) : null}
    </div>
  );
}

/** Tracks the browser's connection state. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Offline / connection-lost banner with TXT-1 (S44). Renders nothing while online. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-tint px-4 py-2 text-small font-medium text-warning">
      <WifiOff aria-hidden className="size-icon-sm" />
      {TXT[1]}
    </div>
  );
}
