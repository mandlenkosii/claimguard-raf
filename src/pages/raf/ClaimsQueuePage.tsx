import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { StatusChip } from '@/components/domain/StatusChip';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import * as api from '@/features/claims/api';
import { cn } from '@/lib/cn';
import { TXT } from '@/lib/format/messages';

const PAGE_SIZE = 20;
type QueueTab = 'assigned' | 'team' | 'unassigned';

function ageBand(days: number): 'normal' | 'amber' | 'red' {
  if (days > 30) return 'red';
  return days > 14 ? 'amber' : 'normal';
}

const AGE_STYLES = { normal: 'text-text', amber: 'bg-warning-tint text-warning', red: 'bg-error-tint text-error' };

/** S31 (filters come in Phase 12). */
export function ClaimsQueuePage() {
  const [tab, setTab] = useState<QueueTab>('assigned');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({ queryKey: ['claims-queue', tab, page], queryFn: () => api.getClaimsQueue(tab, page, PAGE_SIZE) });

  const columns: DataTableColumn<api.QueueRow>[] = [
    { key: 'reference', header: 'Claim reference', render: (row) => <Link to={`/raf/claims/${row.id}`} className="font-mono text-mono text-accent hover:underline">{row.reference}</Link> },
    { key: 'claimant', header: 'Claimant', render: (row) => row.claimant_name },
    { key: 'representative', header: 'Legal representative', render: (row) => row.legal_representative ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
    { key: 'readiness', header: 'Readiness', render: (row) => (row.readiness_score === null ? '—' : `${row.readiness_score}%`) },
    { key: 'blocking', header: 'Blocking issues', render: (row) => row.blocking_count ?? 0 },
    { key: 'risk', header: 'Risk', render: (row) => row.risk_flag ?? '—' },
    { key: 'requests', header: 'Open requests', render: (row) => row.open_request_count },
    {
      key: 'days',
      header: 'Days in stage',
      render: (row) => (
        <span data-age={ageBand(row.days_in_stage)} className={cn('rounded-chip px-2 font-semibold', AGE_STYLES[ageBand(row.days_in_stage)])}>
          {row.days_in_stage}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <h1 className="text-h1 text-primary">Claims queue</h1>
      <Tabs
        label="Claims queue"
        idPrefix="queue"
        tabs={[
          { id: 'assigned', label: 'Assigned to me' },
          { id: 'team', label: 'Team queue' },
          { id: 'unassigned', label: 'Unassigned' },
        ]}
        activeId={tab}
        onChange={(next) => {
          setTab(next as QueueTab);
          setPage(1);
          setSelected([]);
        }}
      />
      <div role="tabpanel" id={`queue-panel-${tab}`} aria-labelledby={`queue-tab-${tab}`} className="space-y-4">
        <DataTable
          caption="Claims queue"
          columns={columns}
          rows={query.data?.rows ?? []}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.reference}
          status={query.isPending ? 'loading' : query.isError ? 'error' : 'ready'}
          onRetry={() => void query.refetch()}
          empty={<EmptyState icon={Inbox} message={TXT[59]} />}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
        {query.data && query.data.total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
      </div>
    </div>
  );
}
