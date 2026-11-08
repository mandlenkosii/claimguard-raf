import { useAuth } from '@/app/auth';
import { RestrictedNotice } from '@/components/domain/RestrictedNotice';
import { StatusChip } from '@/components/domain/StatusChip';
import { Card, KpiCard } from '@/components/ui/Card';
import type { ClaimSummary } from '@/features/claims/api';
import { landingRoute } from '@/lib/access/roles';
import { formatDate } from '@/lib/format/dates';
import { NO_CLAIM_PERMISSION } from '@/lib/format/messages';

/** S25: no access at all, or the manager and administrator summary (SEC5, SEC6). */
export function RestrictedClaimView({ summary }: { summary?: ClaimSummary }) {
  const { session } = useAuth();
  if (!summary) return <RestrictedNotice message={NO_CLAIM_PERMISSION} backTo={landingRoute(session?.roles ?? []) ?? '/'} />;
  return (
    <div className="mx-auto max-w-content space-y-6">
      <header className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="font-mono text-h2 text-primary">{summary.reference}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusChip status={summary.status} />
          <span className="text-small text-text-secondary">{`Created ${formatDate(summary.created_at)} · Updated ${formatDate(summary.updated_at)}`}</span>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Readiness" value={summary.readiness_score === null ? '—' : `${summary.readiness_score}%`} demo />
        <KpiCard label="Blocking issues" value={summary.blocking_count ?? 0} demo />
        <KpiCard label="Warnings" value={summary.warning_count ?? 0} demo />
        <KpiCard label="Open requests" value={summary.open_request_count} demo />
      </div>
      <Card title="Summary view">
        <p className="text-body text-text-secondary">Claimant details, documents and investigation evidence are restricted for your role.</p>
      </Card>
    </div>
  );
}
