import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/app/auth';
import { StatusChip } from '@/components/domain/StatusChip';
import { ButtonLink } from '@/components/ui/Button';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/States';
import * as api from '@/features/claims/api';
import { canCreateClaim } from '@/lib/access/capabilities';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const PAGE_SIZE = 20;

/** S10 (no filters until Phase 12). */
export function ClaimsListPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['claims', page], queryFn: () => api.listClaims({ page, pageSize: PAGE_SIZE }) });

  const columns: DataTableColumn<api.ClaimListRow>[] = [
    { key: 'reference', header: 'Claim reference', render: (row) => <Link to={`/claims/${row.id}`} className="font-mono text-mono text-accent hover:underline">{row.reference}</Link> },
    { key: 'claimant', header: 'Claimant', render: (row) => row.claimant_name ?? '—' },
    { key: 'accident', header: 'Accident date', render: (row) => formatDate(row.accident_date) },
    { key: 'status', header: 'Status', render: (row) => <StatusChip status={row.status} /> },
    { key: 'readiness', header: 'Readiness', render: (row) => (row.readiness_score === null ? '—' : `${row.readiness_score}%`) },
    { key: 'blocking', header: 'Blocking issues', render: (row) => row.blocking_count ?? 0 },
    { key: 'requests', header: 'Open requests', render: (row) => row.open_request_count ?? 0 },
    { key: 'updated', header: 'Last updated', render: (row) => formatDate(row.updated_at) },
  ];

  const canCreate = session ? canCreateClaim(session) : false;
  return (
    <div className="mx-auto max-w-content space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-primary">Claims</h1>
        {canCreate ? (
          <ButtonLink to="/claims/new" icon={<Plus aria-hidden className="size-icon-sm" />}>
            New claim
          </ButtonLink>
        ) : null}
      </div>
      <DataTable
        caption="Claims"
        columns={columns}
        rows={query.data?.rows ?? []}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.reference}
        status={query.isPending ? 'loading' : query.isError ? 'error' : 'ready'}
        onRetry={() => void query.refetch()}
        empty={<EmptyState icon={FolderOpen} message={TXT[48]} />}
        rowActions={(row) => [{ label: 'Open', onSelect: () => navigate(`/claims/${row.id}`) }]}
      />
      {query.data && query.data.total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
    </div>
  );
}
