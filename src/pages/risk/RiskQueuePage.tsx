import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth';
import { SeverityChip } from '@/components/domain/SeverityChip';
import { StateChip } from '@/components/domain/StateChip';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/risk/api';
import { ALERT_STATUS_LABELS, INDICATOR_LABELS } from '@/features/risk/labels';
import { TXT } from '@/lib/format/messages';

const PAGE_SIZE = 20;
const EMPTY_FILTERS: api.Filters = { severity: '', status: '', indicator: '', assignee: '', age: '' };
const TABS = [
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'all', label: 'All permitted' },
];
const SEVERITIES = [
  { key: 'CRITICAL', label: 'Critical', className: 'text-severity-critical-fg' },
  { key: 'HIGH', label: 'High', className: 'text-severity-high-fg' },
  { key: 'MEDIUM', label: 'Medium', className: 'text-severity-medium-fg' },
  { key: 'LOW', label: 'Low', className: 'text-severity-low-fg' },
] as const;
const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** S35. */
export function RiskQueuePage() {
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('assigned');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const queue = useQuery({ queryKey: ['risk-queue', tab, filters, page], queryFn: () => api.getRiskQueue(tab, filters, page, PAGE_SIZE) });
  const investigators = useQuery({ queryKey: ['investigators'], queryFn: api.getInvestigators });
  const assign = useMutation({
    mutationFn: (alertId: string) => api.updateAlert({ alertId, assignedTo: session?.userId ?? '' }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[31] });
      void queryClient.invalidateQueries({ queryKey: ['risk-queue'] });
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  const setFilter = (key: keyof api.Filters) => (value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns: DataTableColumn<api.QueueRow>[] = [
    {
      key: 'alert',
      header: 'Alert',
      render: (row) =>
        row.can_open ? (
          <Link to={`/raf/risk/${row.id}`} className="font-mono text-mono text-accent hover:underline">
            {row.reference}
          </Link>
        ) : (
          <span className="font-mono text-mono text-primary">{row.reference}</span>
        ),
    },
    {
      key: 'claim',
      header: 'Claim',
      render: (row) => (
        <div>
          <p className="font-mono text-mono text-primary">{row.claim_reference}</p>
          <p className="text-small text-text-secondary">{row.claimant_name}</p>
        </div>
      ),
    },
    { key: 'indicator', header: 'Indicator', render: (row) => INDICATOR_LABELS[row.indicator_type] ?? row.indicator_type },
    { key: 'severity', header: 'Severity', render: (row) => <SeverityChip severity={row.severity} /> },
    { key: 'status', header: 'Status', render: (row) => <StateChip kind="alert" state={row.status} /> },
    { key: 'assignee', header: 'Assignee', render: (row) => row.assignee_name ?? 'Unassigned' },
    { key: 'age', header: 'Age', render: (row) => `${row.age_days} day${row.age_days === 1 ? '' : 's'}` },
  ];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <h1 className="text-h1 text-primary">Risk queue</h1>
      <p className="flex items-center gap-2 rounded-card border border-info bg-info-tint p-3 text-body font-medium text-info">
        <Info aria-hidden className="size-icon shrink-0" />
        Alerts are indicators for review, not findings of fraud.
      </p>
      <div data-testid="severity-counts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SEVERITIES.map((item) => (
          <div key={item.key} className="rounded-card border border-border bg-surface p-4">
            <p className="text-label uppercase text-text-secondary">{item.label}</p>
            <p className={`mt-1 text-h1 ${item.className}`}>{queue.data?.counts[item.key] ?? 0}</p>
          </div>
        ))}
      </div>
      <Tabs
        label="Risk queue"
        idPrefix="risk-queue"
        tabs={TABS}
        activeId={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
      />
      <FilterBar
        selects={[
          { label: 'Severity', value: filters.severity, onChange: setFilter('severity'), options: SEVERITIES.map((item) => ({ value: item.key, label: item.label })) },
          { label: 'Status', value: filters.status, onChange: setFilter('status'), options: toOptions(ALERT_STATUS_LABELS) },
          { label: 'Indicator type', value: filters.indicator, onChange: setFilter('indicator'), options: toOptions(INDICATOR_LABELS) },
          { label: 'Assignee', value: filters.assignee, onChange: setFilter('assignee'), options: (investigators.data ?? []).map((item) => ({ value: item.id, label: item.name })) },
          { label: 'Age', value: filters.age, onChange: setFilter('age'), options: [7, 30, 90].map((days) => ({ value: String(days), label: `Older than ${days} days` })) },
        ]}
        onClear={() => {
          setFilters(EMPTY_FILTERS);
          setPage(1);
        }}
      />
      <DataTable
        caption="Risk alerts"
        columns={columns}
        rows={queue.data?.rows ?? []}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.reference}
        status={queue.isPending ? 'loading' : queue.isError ? 'error' : 'ready'}
        onRetry={() => void queue.refetch()}
        empty={<EmptyState icon={ShieldCheck} message="No alerts match these filters." />}
        renderActions={(row) =>
          row.can_open ? (
            <ButtonLink variant="secondary" to={`/raf/risk/${row.id}`} aria-label={`Open ${row.reference} in workspace`}>
              Open
            </ButtonLink>
          ) : (
            <Button variant="secondary" disabled={assign.isPending} aria-label={`Assign ${row.reference} to me`} onClick={() => assign.mutate(row.id)}>
              Assign to me
            </Button>
          )
        }
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={queue.data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
