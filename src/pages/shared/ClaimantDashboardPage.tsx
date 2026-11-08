import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderOpen, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { StatusChip } from '@/components/domain/StatusChip';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import * as api from '@/features/claims/api';
import { TXT } from '@/lib/format/messages';

/** S09, Phase 4 part: the "Your claim" card. The full dashboard comes in Phase 9. */
export function ClaimantDashboardPage() {
  const query = useQuery({ queryKey: ['claims', 'dashboard'], queryFn: () => api.listClaims({ page: 1, pageSize: 5 }) });
  return (
    <div className="mx-auto max-w-content space-y-4">
      <h1 className="text-h1 text-primary">Dashboard</h1>
      {query.isPending ? <Skeleton variant="card" /> : null}
      {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
      {query.data?.rows.length === 0 ? (
        <Card>
          <EmptyState icon={FolderOpen} message={TXT[48]} />
          <div className="text-center">
            <ButtonLink to="/claims/new" icon={<Plus aria-hidden className="size-icon-sm" />}>
              New claim
            </ButtonLink>
          </div>
        </Card>
      ) : null}
      {query.data?.rows.map((claim) => (
        <Card key={claim.id} title="Your claim">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-mono text-primary">{claim.reference}</span>
              <StatusChip status={claim.status} />
            </div>
            <Link to={`/claims/${claim.id}`} className="inline-flex items-center gap-1 text-body font-semibold text-accent hover:underline">
              Open claim
              <ArrowRight aria-hidden className="size-icon-sm" />
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
