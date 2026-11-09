import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CLAIM_STATUSES } from '@/components/domain/StatusChip';
import { KpiCard } from '@/components/ui/Card';
import { BarChart } from '@/components/ui/Chart';
import { ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { getMetrics, type Metrics } from './api';

export type Kpi = { label: string; read: (metrics: Metrics) => ReactNode };
type Props = { role: string; title: string; subtitle?: string; kpis: Kpi[]; children?: ReactNode };

/** The shared frame of S26, S30 and S38. Every number comes from the server (BR31). */
export function MetricsDashboard({ role, title, subtitle, kpis, children }: Props) {
  const metrics = useQuery({ queryKey: ['metrics', role], queryFn: () => getMetrics(role) });
  const data = metrics.data;
  return (
    <div className="mx-auto max-w-content space-y-6">
      <OfflineBanner />
      <div>
        <h1 className="text-h1 text-primary">{title}</h1>
        {subtitle ? <p className="mt-1 text-body text-text-secondary">{subtitle}</p> : null}
      </div>
      {metrics.isPending ? <Skeleton variant="card" /> : null}
      {metrics.isError ? <ErrorState onRetry={() => void metrics.refetch()} /> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.read(data)} demo />
            ))}
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
            {children ? <div className="space-y-6">{children}</div> : null}
            <div className={children ? undefined : 'lg:col-span-2'}>
              <BarChart title="Claims by status" data={Object.entries(CLAIM_STATUSES).map(([key, label]) => ({ label, value: data.by_status[key] ?? 0 }))} demo />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
