import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { RestrictedNotice } from '@/components/domain/RestrictedNotice';
import { StatusChip } from '@/components/domain/StatusChip';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import * as api from '@/features/claims/api';
import { landingRoute } from '@/lib/access/roles';
import { maskIdNumber } from '@/lib/format/dates';
import { ACCESS_DENIED, TXT } from '@/lib/format/messages';

/** S28 (no Notes tab, Section 18 #16). */
export function ClientDetailPage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const [tab, setTab] = useState('overview');
  const client = useQuery({ queryKey: ['client', id], queryFn: () => api.getClient(id) });
  const claims = useQuery({ queryKey: ['client-claims', id], queryFn: () => api.getClientClaims(id), enabled: Boolean(client.data) });

  if (client.isPending) return <Skeleton variant="card" />;
  if (client.isError) return <ErrorState onRetry={() => void client.refetch()} />;
  if (!client.data) return <RestrictedNotice message={ACCESS_DENIED} backTo={landingRoute(session?.roles ?? []) ?? '/'} />;
  const person = client.data;

  return (
    <div className="mx-auto max-w-content space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <div>
          <h1 className="text-h1 text-primary">{person.full_name}</h1>
          <p className="mt-1 text-small text-text-secondary">
            <span className="font-mono">{maskIdNumber(person.id_number)}</span>
            {` · ${person.mandate_status === 'on_file' ? 'Mandate on file' : 'Mandate pending'}`}
          </p>
        </div>
        <ButtonLink to={`/claims/new?client=${person.claimant_id}`} icon={<Plus aria-hidden className="size-icon-sm" />}>
          Create claim for this client
        </ButtonLink>
      </header>
      <Tabs
        label="Client"
        idPrefix="client"
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'claims', label: 'Claims', count: person.claim_count },
          { id: 'documents', label: 'Documents' },
        ]}
        activeId={tab}
        onChange={setTab}
      />
      <div role="tabpanel" id={`client-panel-${tab}`} aria-labelledby={`client-tab-${tab}`}>
        {tab === 'overview' ? (
          <Card title="Contact details">
            <p className="text-body text-text">{person.email ?? '—'}</p>
            <p className="text-body text-text">{person.mobile ?? '—'}</p>
          </Card>
        ) : null}
        {tab === 'claims' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(claims.data ?? []).map((claim) => (
              <Card key={claim.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-mono text-primary">{claim.reference}</span>
                  <StatusChip status={claim.status} />
                </div>
                <p className="mt-2 text-small text-text-secondary">{`${claim.blocking_count ?? 0} blocking issues · ${claim.open_request_count ?? 0} open requests`}</p>
                <Link to={`/claims/${claim.id}`} className="mt-3 inline-flex items-center gap-1 text-body font-semibold text-accent hover:underline">
                  Open claim workspace
                  <ArrowRight aria-hidden className="size-icon-sm" />
                </Link>
              </Card>
            ))}
          </div>
        ) : null}
        {tab === 'documents' ? <EmptyState icon={FileText} message={TXT[49]} /> : null}
      </div>
    </div>
  );
}
