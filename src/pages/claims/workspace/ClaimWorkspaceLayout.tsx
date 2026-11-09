import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { ClaimHeader } from '@/components/domain/ClaimHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import * as api from '@/features/claims/api';
import { canChangeStatus, canSeeAuditTab, canSeeRiskTab } from '@/lib/access/capabilities';
import { ChangeStatusModal } from '@/modals/ChangeStatusModal';
import { RestrictedClaimView } from './RestrictedClaimView';

const TAB_IDS = ['documents', 'readiness', 'risk', 'messages', 'requests', 'timeline', 'audit'];

export function useWorkspaceClaim(): api.ClaimDetail {
  return useOutletContext<api.ClaimDetail>();
}

/** The claim header and tab bar around every workspace tab (S14–S24). */
export function ClaimWorkspaceLayout() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [changing, setChanging] = useState(false);

  const query = useQuery({
    queryKey: ['claim', id],
    queryFn: async () => {
      const claim = await api.getClaim(id);
      return { claim, summary: claim ? null : await api.getClaimSummary(id) };
    },
  });

  if (query.isPending) return <Skeleton variant="card" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  if (!session) return null;
  const { claim, summary } = query.data;
  if (!claim) return <RestrictedClaimView summary={summary ?? undefined} />;

  const base = location.pathname.startsWith('/raf/') ? `/raf/claims/${id}` : `/claims/${id}`;
  const section = location.pathname.slice(base.length).split('/')[1] ?? '';
  const activeId = TAB_IDS.includes(section) ? section : 'overview';
  const back = session.roles.includes('raf_officer') ? { to: '/raf/claims', label: 'Claims queue' } : session.roles.includes('lawyer') ? { to: '/lawyer/claims', label: 'Claims' } : { to: '/claims', label: 'My claims' };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'readiness', label: 'Readiness' },
    { id: 'risk', label: 'Risk', locked: true, hidden: !canSeeRiskTab(session) },
    { id: 'messages', label: 'Messages' },
    { id: 'requests', label: 'Requests' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'audit', label: 'Audit', locked: true, hidden: !canSeeAuditTab(session) },
  ];

  return (
    <div className="mx-auto max-w-content space-y-6">
      <ClaimHeader
        backTo={back.to}
        backLabel={back.label}
        reference={claim.reference}
        title={claim.claimant_name}
        status={claim.status}
        readinessScore={claim.readiness_score}
        blockingCount={claim.blocking_count}
        actions={canChangeStatus(session) ? <Button onClick={() => setChanging(true)}>Change status</Button> : undefined}
      />
      <Tabs label="Claim workspace" idPrefix="workspace" tabs={tabs} activeId={activeId} onChange={(tab) => navigate(tab === 'overview' ? base : `${base}/${tab}`)} />
      <div role="tabpanel" id={`workspace-panel-${activeId}`} aria-labelledby={`workspace-tab-${activeId}`}>
        <Outlet context={claim} />
      </div>
      <ChangeStatusModal
        open={changing}
        claimId={claim.id}
        reference={claim.reference}
        currentStatus={claim.status}
        onClose={() => setChanging(false)}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['claim', id] });
          void queryClient.invalidateQueries({ queryKey: ['timeline', id] });
          void queryClient.invalidateQueries({ queryKey: ['transitions', id] });
        }}
      />
    </div>
  );
}

/** Risk and Audit: the URLs of hidden tabs show S25 (Section 11). */
export function RestrictedTab({ allowed, children = null }: { allowed: 'risk' | 'audit'; children?: ReactNode }) {
  const { session } = useAuth();
  const permitted = session ? (allowed === 'risk' ? canSeeRiskTab(session) : canSeeAuditTab(session)) : false;
  return permitted ? children : <RestrictedClaimView />;
}
