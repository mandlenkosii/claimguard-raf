import { useQuery } from '@tanstack/react-query';
import { Download, History, Lock } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/Button';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { getAuditLog, type AuditRow } from '@/features/admin/api';
import { auditToCsv, downloadCsv } from '@/features/admin/auditCsv';
import { summaryLines } from '@/features/admin/auditSummary';
import { canSeeAuditTab } from '@/lib/access/capabilities';
import { TXT } from '@/lib/format/messages';
import { actorText, Outcome, roleText, whenText } from '@/pages/admin/AuditLogPage';

const PAGE_SIZE = 25;
const COLUMNS: DataTableColumn<AuditRow>[] = [
  { key: 'time', header: 'Time', render: whenText },
  { key: 'actor', header: 'Actor', render: actorText },
  { key: 'role', header: 'Role', render: roleText },
  { key: 'event', header: 'Event', render: (row) => <span className="font-mono text-mono">{row.action}</span> },
  { key: 'outcome', header: 'Outcome', render: (row) => <Outcome outcome={row.outcome} /> },
];

/** S24. */
export function AuditTab() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const [page, setPage] = useState(1);
  const log = useQuery({ queryKey: ['claim-audit', id, page], queryFn: () => getAuditLog({ claimId: id, actorRole: '', category: '', outcome: '', from: '', to: '' }, page, PAGE_SIZE) });
  const rows = log.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-small font-medium text-text-secondary">
          <Lock aria-hidden className="size-icon-sm shrink-0" />
          Audit records are append-only and never include document contents or credentials.
        </p>
        {session && canSeeAuditTab(session) ? (
          <Button variant="secondary" icon={<Download aria-hidden className="size-icon-sm" />} disabled={!rows.length} onClick={() => downloadCsv(`claim-audit-${id}.csv`, auditToCsv(rows))}>
            Export (CSV)
          </Button>
        ) : null}
      </div>
      <DataTable
        caption="Claim audit log"
        columns={COLUMNS}
        rows={rows}
        getRowId={(row) => String(row.id)}
        getRowLabel={(row) => row.action}
        status={log.isPending ? 'loading' : log.isError ? 'error' : 'ready'}
        onRetry={() => void log.refetch()}
        empty={<EmptyState icon={History} message={TXT[55]} />}
        renderExpanded={(row) => (
          <ul className="space-y-1 text-small text-text">
            {summaryLines(row.change_summary).map((line) => (
              <li key={line}>{line}</li>
            ))}
            {row.reason ? <li>{`Reason: ${row.reason}`}</li> : null}
          </ul>
        )}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={log.data?.total ?? 0} onPageChange={setPage} />
    </div>
  );
}
