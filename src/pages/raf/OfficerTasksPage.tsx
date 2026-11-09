import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { getOutstandingWork, type WorkItem } from '@/features/dashboards/api';
import { SOURCE_LABELS, workItemPath } from '@/features/dashboards/work';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { isOverdue } from '@rules/requests';

const GROUPS = ['Overdue', 'Due today', 'This week', 'Later'] as const;
type Group = (typeof GROUPS)[number];
const DAY_MS = 86_400_000;
const SAST_OFFSET_MS = 2 * 3_600_000;

function groupOf(item: WorkItem, today: string, weekEnd: string): Group {
  if (isOverdue(item)) return 'Overdue';
  if (item.due_date === today) return 'Due today';
  if (item.due_date && item.due_date > today && item.due_date <= weekEnd) return 'This week';
  return 'Later';
}

export function groupByDue(items: WorkItem[], now: Date = new Date()): Record<Group, WorkItem[]> {
  const today = new Date(now.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + SAST_OFFSET_MS + 7 * DAY_MS).toISOString().slice(0, 10);
  const groups: Record<Group, WorkItem[]> = { Overdue: [], 'Due today': [], 'This week': [], Later: [] };
  for (const item of items) groups[groupOf(item, today, weekEnd)].push(item);
  return groups;
}

const keyOf = (item: WorkItem) => `${item.kind}-${item.id}`;

/** S33: built from open requests and unresolved issues (Section 18 #16). */
export function OfficerTasksPage() {
  const work = useQuery({ queryKey: ['outstanding-work', 'raf_officer'], queryFn: () => getOutstandingWork('raf_officer') });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (work.isPending) return <Skeleton variant="card" />;
  if (work.isError) return <ErrorState onRetry={() => void work.refetch()} />;

  const items = work.data;
  const groups = groupByDue(items);
  const selected = items.find((item) => keyOf(item) === selectedKey) ?? items[0];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <h1 className="text-h1 text-primary">Tasks</h1>
      {!items.length ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState icon={ListChecks} message={TXT[58]} />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {GROUPS.filter((group) => groups[group].length).map((group) => (
              <div key={group} data-testid={`group-${group}`}>
                <Card title={group}>
                  <ul className="space-y-2">
                    {groups[group].map((item) => (
                      <li key={keyOf(item)}>
                        <button
                          type="button"
                          aria-current={selected === item || undefined}
                          onClick={() => setSelectedKey(keyOf(item))}
                          className={cn('w-full rounded-input border p-3 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', selected === item ? 'border-accent bg-surface-muted' : 'border-border')}
                        >
                          <span className="block text-body font-medium text-text">{item.title}</span>
                          <span className="block text-small text-text-secondary">{`${item.claim_reference} · ${SOURCE_LABELS[item.kind]}${item.due_date ? ` · Due ${formatDate(item.due_date)}` : ''}`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
          {selected ? (
            <section data-testid="selected-task" className="rounded-card border border-border bg-surface p-5 shadow-card">
              <p className="text-small text-text-secondary">{SOURCE_LABELS[selected.kind]}</p>
              <h2 className="mt-1 text-h3 text-primary">{selected.title}</h2>
              <p className="mt-1 text-small text-text-secondary">{`${selected.claim_reference} · ${selected.claimant_name}`}</p>
              <ButtonLink className="mt-4" to={workItemPath(selected)}>
                Open claim
              </ButtonLink>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

