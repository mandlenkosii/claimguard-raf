import { AlertOctagon, AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

const STYLES: Record<string, { className: string; icon: typeof Info }> = {
  LOW: { className: 'bg-severity-low-bg text-severity-low-fg', icon: Info },
  MEDIUM: { className: 'bg-severity-medium-bg text-severity-medium-fg', icon: AlertTriangle },
  HIGH: { className: 'bg-severity-high-bg text-severity-high-fg', icon: CircleAlert },
  CRITICAL: { className: 'bg-severity-critical-bg text-severity-critical-fg', icon: AlertOctagon },
};

/** Always text, colour and icon (PRD 10.5). */
export function SeverityChip({ severity }: { severity: string }) {
  const { className, icon: Icon } = STYLES[severity] ?? STYLES.LOW!;
  return (
    <span data-severity={severity} className={cn('inline-flex h-chip items-center gap-1 whitespace-nowrap rounded-chip px-2 text-small font-semibold', className)}>
      <Icon aria-hidden className="size-icon-sm" />
      <span>{severity}</span>
    </span>
  );
}
