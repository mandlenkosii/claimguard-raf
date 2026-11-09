import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useState } from 'react';
import { KpiCard } from '@/components/ui/Card';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { getAuditLog, type AuditFilters, type AuditRow } from '@/features/admin/api';
import { summaryLines } from '@/features/admin/auditSummary';
import { ROLE_LABELS, ROLE_ORDER, type RoleKey } from '@/lib/access/roles';
import { cn } from '@/lib/cn';
import { formatDate, formatTime } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const PAGE_SIZE = 25;
const NO_FILTERS: AuditFilters = { actorRole: '', category: '', outcome: '', from: '', to: '' };
const CATEGORIES = [
  { value: 'access', label: 'Access and roles' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'claim', label: 'Claim' },
  { value: 'document', label: 'Document' },
  { value: 'risk', label: 'Risk' },
];

export function Outcome({ outcome }: { outcome: string }) {
  const denied = outcome === 'denied';
  return <span className={cn('text-small font-semibold', denied ? 'text-error' : 'text-success')}>{denied ? 'Denied' : 'Success'}</span>;
}

export const actorText = (row: AuditRow) => row.actor_name ?? 'System';
export const whenText = (row: AuditRow) => `${formatDate(row.created_at)}, ${formatTime(row.created_at)}`;
export const roleText = (row: AuditRow) => (row.actor_role ? (ROLE_LABELS[row.actor_role as RoleKey] ?? row.actor_role) : '—');

const COLUMNS: DataTableColumn<AuditRow>[] = [
  { key: 'time', header: 'Time', render: whenText },
  {
    key: 'actor',
    header: 'Actor',
    render: (row) => (
      <div>
        <p>{actorText(row)}</p>
        <p className="text-small text-text-secondary">{roleText(row)}</p>
      </div>
    ),
  },
  { key: 'event', header: 'Event', render: (row) => <span className="font-mono text-mono">{row.action}</span> },
  { key: 'resource', header: 'Resource', render: (row) => row.resource_type },
  { key: 'outcome', header: 'Outcome', render: (row) => <Outcome outcome={row.outcome} /> },
  { key: 'summary', header: 'Summary', render: (row) => <span className="text-small">{[...summaryLines(row.change_summary), row.reason ? `Reason: ${row.reason}` : ''].filter(Boolean).join(' · ')}</span> },
  { key: 'session', header: 'Session', render: (row) => row.session_ref ?? '—' },
];

/** S42. */
export function AuditLogPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const log = useQuery({ queryKey: ['audit-log', filters, page], queryFn: () => getAuditLog(filters, page, PAGE_SIZE) });
  const setFilter = (key: keyof AuditFilters) => (value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <h1 className="text-h1 text-primary">Audit log</h1>
      {log.data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label="Events" value={log.data.counts.total} />
          <KpiCard label="Denied attempts" value={log.data.counts.denied} />
        </div>
      ) : null}
      <FilterBar
        selects={[
          { label: 'Role', value: filters.actorRole, onChange: setFilter('actorRole'), options: ROLE_ORDER.map((key) => ({ value: key, label: ROLE_LABELS[key] })) },
          { label: 'Category', value: filters.category, onChange: setFilter('category'), options: CATEGORIES },
          { label: 'Outcome', value: filters.outcome, onChange: setFilter('outcome'), options: [{ value: 'success', label: 'Success' }, { value: 'denied', label: 'Denied' }] },
        ]}
        onClear={() => {
          setFilters(NO_FILTERS);
          setPage(1);
        }}
      />
      <div className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:grid-cols-2">
        <TextField label="From" name="from" type="date" value={filters.from} onChange={setFilter('from')} />
        <TextField label="To" name="to" type="date" value={filters.to} onChange={setFilter('to')} />
      </div>
      <DataTable
        caption="Audit log"
        columns={COLUMNS}
        rows={log.data?.rows ?? []}
        getRowId={(row) => String(row.id)}
        getRowLabel={(row) => row.action}
        status={log.isPending ? 'loading' : log.isError ? 'error' : 'ready'}
        onRetry={() => void log.refetch()}
        empty={<EmptyState icon={History} message={TXT[55]} />}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={log.data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
