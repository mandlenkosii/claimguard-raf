import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { getOutstandingWork } from '@/features/dashboards/api';
import { MetricsDashboard, type Kpi } from '@/features/dashboards/MetricsDashboard';
import { WorkList } from '@/features/dashboards/WorkList';
import { isOverdue } from '@rules/requests';

const KPIS: Kpi[] = [
  { label: 'Assigned claims', read: (metrics) => metrics.claims_total },
  { label: 'Awaiting review', read: (metrics) => metrics.awaiting_review },
  { label: 'Overdue requests', read: (metrics) => metrics.overdue_requests },
  { label: 'Ready claims', read: (metrics) => metrics.ready_claims },
];

/** S30. */
export function RafDashboardPage() {
  const work = useQuery({ queryKey: ['outstanding-work', 'raf_officer'], queryFn: () => getOutstandingWork('raf_officer') });
  return (
    <MetricsDashboard role="raf_officer" title="Dashboard" kpis={KPIS}>
      <Card title="Overdue requests">{work.data ? <WorkList items={work.data.filter((item) => item.kind === 'request' && isOverdue(item))} testId="overdue" /> : null}</Card>
    </MetricsDashboard>
  );
}
