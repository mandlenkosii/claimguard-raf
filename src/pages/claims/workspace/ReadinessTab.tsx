import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, ClipboardCheck, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { IssueCard } from '@/components/domain/IssueCard';
import { CategoryBar, ReadinessRing } from '@/components/domain/Readiness';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, OfflineBanner, Skeleton, useOnlineStatus } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/readiness/api';
import { READINESS_CATEGORIES } from '@/features/readiness/categories';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const NOTICE = 'A readiness score is not a legal opinion or a guarantee of claim acceptance.';

function Counter({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-input px-4 py-2 text-center ${className}`}>
      <p className="text-h2">{value}</p>
      <p className="text-small font-semibold">{label}</p>
    </div>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section data-testid={`group-${id}`} className="space-y-3">
      <h2 className="text-h2 text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** S18. */
export function ReadinessTab() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const readiness = useQuery({ queryKey: ['readiness', id], queryFn: () => api.getReadiness(id), refetchOnMount: 'always' });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['readiness', id] });
    void queryClient.invalidateQueries({ queryKey: ['claim', id] });
  };
  const failed = () => toast.show({ tone: 'error', message: TXT[2] });
  const run = useMutation({
    mutationFn: () => api.runReadiness(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[29] });
      refresh();
    },
    onError: failed,
  });
  const update = useMutation({
    mutationFn: (input: api.IssueUpdate) => api.updateIssue(input),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[30] });
      refresh();
    },
    onError: failed,
  });

  if (readiness.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }
  if (readiness.isError) return <ErrorState onRetry={() => void readiness.refetch()} />;

  const { assessment, issues, weights, stale } = readiness.data;
  if (!assessment) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <OfflineBanner />
        <EmptyState icon={ClipboardCheck} message={TXT[51]} action={online ? { label: 'Run checks', onClick: () => run.mutate() } : undefined} />
      </div>
    );
  }

  const canAct = session?.roles.some((role) => role === 'lawyer' || role === 'raf_officer') ?? false;
  const active = issues.filter((issue) => issue.status === 'open' || issue.status === 'under_review');
  const groups = [
    { id: 'blocking', title: 'Blocking issues', items: active.filter((issue) => issue.impact === 'blocking') },
    { id: 'warnings', title: 'Warnings', items: active.filter((issue) => issue.impact === 'warning') },
    { id: 'resolved', title: 'Resolved', items: issues.filter((issue) => issue.status === 'resolved' || issue.status === 'dismissed') },
  ];
  const blocking = assessment.blocking_count;

  return (
    <div className="space-y-6">
      <OfflineBanner />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <div className="flex flex-col items-center gap-3 text-center">
            <ReadinessRing value={assessment.score} size="large" />
            <p className="text-small text-text-secondary">{`Rules version ${assessment.rules_version} · Assessed ${formatDate(assessment.assessed_at)}`}</p>
            <Button variant="secondary" loading={run.isPending} disabled={!online || run.isPending} icon={<RefreshCw aria-hidden className="size-icon-sm" />} onClick={() => run.mutate()}>
              Re-run checks
            </Button>
          </div>
        </Card>
        <Card>
          <div className="space-y-4">
            {blocking > 0 ? (
              <div className="flex items-center gap-2 rounded-input border border-error bg-error-tint p-3 text-body font-semibold text-error">
                <CircleAlert aria-hidden className="size-icon shrink-0" />
                <p>{`${blocking} blocking issue${blocking === 1 ? '' : 's'} — this claim cannot move to Ready until ${blocking === 1 ? 'it is' : 'they are'} resolved`}</p>
              </div>
            ) : null}
            {stale ? <p className="rounded-input bg-warning-tint p-3 text-small font-medium text-warning">Checks must be re-run first</p> : null}
            <div data-testid="counters" className="grid grid-cols-3 gap-3">
              <Counter label="Blocking" value={blocking} className="bg-error-tint text-error" />
              <Counter label="Warnings" value={assessment.warning_count} className="bg-warning-tint text-warning" />
              <Counter label="Resolved" value={assessment.resolved_count} className="bg-info-tint text-info" />
            </div>
            <p className="text-small text-text-secondary">{NOTICE}</p>
          </div>
        </Card>
      </div>

      <Card title="Readiness categories">
        <div className="space-y-4">
          {READINESS_CATEGORIES.map((category) => {
            const open = active.filter((issue) => (category.rules as readonly string[]).includes(issue.rule_id));
            return (
              <CategoryBar key={category.key} label={category.label} value={assessment.category_scores[category.key]} weight={weights[category.key]}>
                {open.length ? (
                  <ul className="list-disc pl-5">
                    {open.map((issue) => (
                      <li key={issue.id}>{issue.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No open issues.</p>
                )}
              </CategoryBar>
            );
          })}
        </div>
      </Card>

      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <Group key={group.id} id={group.id} title={group.title}>
            {group.items.map((issue) => (
              <IssueCard key={issue.id} issue={issue} canAct={canAct} documentsPath={`/claims/${id}/documents`} busy={update.isPending} onUpdate={(input) => update.mutate(input)} />
            ))}
          </Group>
        ))}
    </div>
  );
}
