import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleAlert, FolderOpen, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth';
import { claimStages } from '@/components/domain/claimStages';
import { ReadinessRing } from '@/components/domain/Readiness';
import { StateChip } from '@/components/domain/StateChip';
import { StatusChip } from '@/components/domain/StatusChip';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { Stepper } from '@/components/ui/Stepper';
import { getClaimantHome, getOutstandingWork } from '@/features/dashboards/api';
import { WorkList } from '@/features/dashboards/WorkList';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { isOverdue } from '@rules/requests';

/** S09. */
export function ClaimantDashboardPage() {
  const { session } = useAuth();
  const home = useQuery({ queryKey: ['claimant-home'], queryFn: getClaimantHome });
  const work = useQuery({ queryKey: ['outstanding-work', 'claimant'], queryFn: () => getOutstandingWork('claimant') });
  const claim = home.data?.claim;

  return (
    <div className="mx-auto max-w-content space-y-6">
      <OfflineBanner />
      <h1 className="text-h1 text-primary">{`Hello, ${session?.firstName ?? ''}`}</h1>
      {home.isPending ? <Skeleton variant="card" /> : null}
      {home.isError ? <ErrorState onRetry={() => void home.refetch()} /> : null}
      {home.data && !claim ? (
        <Card>
          <EmptyState icon={FolderOpen} message={TXT[48]} />
          <div className="text-center">
            <ButtonLink to="/claims/new" icon={<Plus aria-hidden className="size-icon-sm" />}>
              New claim
            </ButtonLink>
          </div>
        </Card>
      ) : null}
      {home.data && claim ? (
        <>
          <div data-testid="your-claim">
            <Card title="Your claim">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {claim.readiness_score !== null ? <ReadinessRing value={claim.readiness_score} size="large" /> : null}
                  <div className="space-y-2">
                    <p className="font-mono text-mono text-primary">{claim.reference}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={claim.status} />
                      {claim.blocking_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-chip bg-error-tint px-2 text-small font-semibold text-error">
                          <CircleAlert aria-hidden className="size-icon-sm" />
                          {`${claim.blocking_count} blocking issue${claim.blocking_count === 1 ? '' : 's'}`}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink to={`/claims/${claim.id}/readiness`}>Resolve issues</ButtonLink>
                  <ButtonLink variant="secondary" to={`/claims/${claim.id}`} icon={<ArrowRight aria-hidden className="size-icon-sm" />}>
                    Open claim
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </div>
          <Card>
            <Stepper label="Claim progress" variant="tracker" steps={claimStages(claim.status)} />
          </Card>
          <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <Card title="What you need to do">{work.data ? <WorkList items={work.data} testId="todo" /> : <Skeleton variant="card" />}</Card>
              <Card title="Recent messages">
                {home.data.recent_messages.length ? (
                  <ul className="space-y-3">
                    {home.data.recent_messages.map((message) => (
                      <li key={message.id}>
                        <p className="text-small text-text-secondary">
                          <span className="font-semibold text-text">{message.author_name}</span>
                          {message.author_role ? ` · ${ROLE_LABELS[message.author_role as RoleKey] ?? message.author_role}` : ''}
                          {` · ${formatDate(message.created_at)}`}
                        </p>
                        <p className="text-body text-text">{message.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body text-text-secondary">{TXT[54]}</p>
                )}
              </Card>
            </div>
            <div className="space-y-6">
              <Card title="Open requests">
                {home.data.open_requests.length ? (
                  <ul className="space-y-3">
                    {home.data.open_requests.map((request) => (
                      <li key={request.id} className="flex items-start justify-between gap-2">
                        <span>
                          <Link to={`/claims/${claim.id}/requests/${request.id}`} className="text-body font-medium text-accent hover:underline">
                            {request.title}
                          </Link>
                          <span className="block text-small text-text-secondary">{request.due_date ? `Due ${formatDate(request.due_date)}` : 'No due date'}</span>
                        </span>
                        <StateChip kind="request" state={isOverdue(request) ? 'overdue' : request.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body text-text-secondary">{TXT[58]}</p>
                )}
              </Card>
              <Card title="Recent activity">
                <ul className="space-y-3">
                  {home.data.recent_activity.map((event) => (
                    <li key={event.id}>
                      <p className="text-body text-text">{event.summary}</p>
                      <p className="text-small text-text-secondary">{formatDate(event.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
