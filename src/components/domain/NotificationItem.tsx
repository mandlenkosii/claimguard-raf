import { Bell, ClipboardList, MessageSquare, RefreshCw, UserPlus, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { Notification } from '@/features/notifications/api';
import { cn } from '@/lib/cn';
import { formatDate, formatTime } from '@/lib/format/dates';

const ICONS: Record<string, LucideIcon> = { request: ClipboardList, response: ClipboardList, message: MessageSquare, claim_update: RefreshCw, assignment: UserPlus };

/** One row on S12: an unread row has a dot and bold text, never colour alone. */
export function NotificationItem({ notification, onOpen }: { notification: Notification; onOpen: (id: string) => void }) {
  const Icon = ICONS[notification.type] ?? Bell;
  const unread = !notification.read_at;
  return (
    <Link to={notification.link} onClick={() => onOpen(notification.id)} className="flex items-center gap-3 rounded-input p-3 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <span className="flex w-2 shrink-0 justify-center">{unread ? <span data-testid="unread-dot" className="size-2 rounded-full bg-accent" /> : null}</span>
      <Icon aria-hidden className="size-icon shrink-0 text-text-secondary" />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body text-text', unread && 'font-semibold')}>{notification.title}</span>
        <span className="block text-small text-text-secondary">{notification.summary}</span>
      </span>
      <span className="shrink-0 text-small text-text-secondary">{`${formatDate(notification.created_at)}, ${formatTime(notification.created_at)}`}</span>
    </Link>
  );
}
