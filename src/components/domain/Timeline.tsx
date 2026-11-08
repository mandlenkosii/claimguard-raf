import { Ban, Circle } from 'lucide-react';
import type { TimelineEvent } from '@/features/claims/api';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { cn } from '@/lib/cn';
import { dateKey, formatDate, formatTime } from '@/lib/format/dates';

function groupByDate(events: TimelineEvent[]) {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const key = dateKey(event.created_at);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()];
}

/** Chronological claim activity grouped by date; blocked actions are shown in grey (S23). */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-6">
      {groupByDate(events).map(([key, group]) => (
        <section key={key} data-testid="timeline-group">
          <h3 className="text-label uppercase text-text-secondary">{formatDate(group[0]!.created_at)}</h3>
          <ol className="mt-3 space-y-3">
            {group.map((event) => {
              const blocked = event.event_type === 'status_change_blocked';
              return (
                <li key={event.id} data-event data-blocked={blocked} className={cn('flex gap-3 rounded-card border border-border p-4', blocked ? 'bg-surface-muted text-text-secondary' : 'bg-surface')}>
                  {blocked ? <Ban aria-hidden className="mt-1 size-icon-sm shrink-0" /> : <Circle aria-hidden className="mt-1 size-icon-sm shrink-0 text-accent" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={cn('text-body font-semibold', !blocked && 'text-primary')}>{event.summary}</p>
                      <time className="font-mono text-small text-text-secondary">{formatTime(event.created_at)}</time>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-small text-text-secondary">
                      <span>{event.actor_name ?? 'System'}</span>
                      {event.actor_role ? <span className="rounded-chip bg-surface-sunken px-2 font-semibold text-primary">{ROLE_LABELS[event.actor_role as RoleKey] ?? event.actor_role}</span> : null}
                    </p>
                    {event.reason ? <p className="mt-1 text-small">{event.reason}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
