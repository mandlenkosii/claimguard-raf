import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { StateChip } from '@/components/domain/StateChip';
import { SegmentedControl } from '@/components/ui/Choice';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { getOutstandingWork, type WorkItem } from '@/features/dashboards/api';
import { SOURCE_LABELS, workItemPath } from '@/features/dashboards/work';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { isOverdue } from '@rules/requests';

const COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'in_progress', title: 'In progress' },
  { id: 'waiting', title: 'Waiting on client' },
] as const;

const dueText = (item: WorkItem) => (item.due_date ? formatDate(item.due_date) : 'No due date');

function WorkStatus({ item }: { item: WorkItem }) {
  return item.kind === 'issue' ? <StateChip kind="issue" state={item.status} /> : <StateChip kind="request" state={isOverdue(item) ? 'overdue' : item.status} />;
}

const TABLE: DataTableColumn<WorkItem>[] = [
  {
    key: 'task',
    header: 'Task',
    render: (item) => (
      <Link to={workItemPath(item)} className="font-medium text-accent hover:underline">
        {item.title}
      </Link>
    ),
  },
  { key: 'source', header: 'Source', render: (item) => SOURCE_LABELS[item.kind] },
  { key: 'claim', header: 'Claim', render: (item) => <span className="font-mono text-mono text-primary">{item.claim_reference}</span> },
  { key: 'claimant', header: 'Claimant', render: (item) => item.claimant_name },
  { key: 'due', header: 'Due', render: dueText },
  { key: 'status', header: 'Status', render: (item) => <WorkStatus item={item} /> },
];

/** S29: built from open requests and unresolved issues (Section 18 #16). */
export function LawyerTasksPage() {
  const work = useQuery({ queryKey: ['outstanding-work', 'lawyer'], queryFn: () => getOutstandingWork('lawyer') });
  const [view, setView] = useState('list');
  const items = work.data ?? [];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-primary">Tasks</h1>
        <SegmentedControl label="View" value={view} onChange={setView} options={[{ value: 'list', label: 'List' }, { value: 'board', label: 'Board' }]} />
      </div>
      {view === 'list' ? (
        <DataTable
          caption="Tasks"
          columns={TABLE}
          rows={items}
          getRowId={(item) => `${item.kind}-${item.id}`}
          getRowLabel={(item) => item.title}
          status={work.isPending ? 'loading' : work.isError ? 'error' : 'ready'}
          onRetry={() => void work.refetch()}
          empty={<EmptyState icon={ListChecks} message={TXT[58]} />}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const cards = items.filter((item) => item.column === column.id);
            return (
              <section key={column.id} data-testid={`column-${column.id}`} className="rounded-card bg-surface-muted p-3">
                <h2 className="flex items-center justify-between text-h3 text-primary">
                  <span>{column.title}</span>
                  <span className="text-small text-text-secondary">{cards.length}</span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {cards.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="rounded-input border border-border bg-surface p-3">
                      <p className="text-small text-text-secondary">{SOURCE_LABELS[item.kind]}</p>
                      <Link to={workItemPath(item)} className="text-body font-medium text-accent hover:underline">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-small text-text-secondary">{`${item.claim_reference} · ${item.claimant_name}`}</p>
                      <p className="mt-1 text-small text-text-secondary">{dueText(item)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
