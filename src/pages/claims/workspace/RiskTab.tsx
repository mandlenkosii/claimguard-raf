import { useQuery } from '@tanstack/react-query';
import { Info, Lock, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { AlertCard } from '@/components/domain/AlertCard';
import { SeverityChip } from '@/components/domain/SeverityChip';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { getClaimAlerts, getRiskFlag } from '@/features/risk/api';
import { OUTCOME_LABELS } from '@/features/risk/labels';

const NO_ALERTS = 'No risk alerts for this claim.';
const RESTRICTED = 'Visible to authorised investigators only.';

function Restricted() {
  return (
    <p className="flex items-center gap-2 rounded-card border border-border bg-surface-muted p-4 text-small text-text-secondary">
      <Lock aria-hidden className="size-icon-sm shrink-0" />
      {RESTRICTED}
    </p>
  );
}

function InvestigatorView({ claimId }: { claimId: string }) {
  const alerts = useQuery({ queryKey: ['claim-alerts', claimId], queryFn: () => getClaimAlerts(claimId) });
  if (alerts.isPending) return <Skeleton variant="card" />;
  if (alerts.isError) return <ErrorState onRetry={() => void alerts.refetch()} />;
  const rows = alerts.data;
  return (
    <div className="space-y-6">
      <OfflineBanner />
      <p className="flex items-center gap-2 rounded-card border border-info bg-info-tint p-4 text-body font-medium text-info">
        <Info aria-hidden className="size-icon shrink-0" />
        Risk alerts are indicators for human review. They are not findings of fraud.
      </p>
      {rows.length ? (
        <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {rows.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
          <Card title="Risk summary">
            <ul className="space-y-3">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => (
                <li key={severity} className="flex items-center justify-between">
                  <SeverityChip severity={severity} />
                  <span className="text-body font-semibold text-primary">{rows.filter((alert) => alert.severity === severity).length}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState icon={ShieldCheck} message={NO_ALERTS} />
        </div>
      )}
      <Restricted />
    </div>
  );
}

/** The limited view: never the alert, its evidence or its notes (Section 18 #6, #36). */
function LimitedView({ claimId }: { claimId: string }) {
  const flag = useQuery({ queryKey: ['risk-flag', claimId], queryFn: () => getRiskFlag(claimId) });
  if (flag.isPending) return <Skeleton variant="card" />;
  if (flag.isError) return <ErrorState onRetry={() => void flag.refetch()} />;
  const outcome = flag.data?.outcome_label;
  return (
    <div className="space-y-6">
      <OfflineBanner />
      {flag.data?.flag || outcome ? (
        <Card title="Risk status">
          {flag.data?.flag ? <p className="text-body font-semibold text-primary">{flag.data.flag}</p> : null}
          {outcome ? <p className="text-body text-text">{OUTCOME_LABELS[outcome] ?? outcome}</p> : null}
        </Card>
      ) : (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState icon={ShieldCheck} message={NO_ALERTS} />
        </div>
      )}
      <Restricted />
    </div>
  );
}

/** S19. */
export function RiskTab() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  return session?.roles.includes('investigator') ? <InvestigatorView claimId={id} /> : <LimitedView claimId={id} />;
}
