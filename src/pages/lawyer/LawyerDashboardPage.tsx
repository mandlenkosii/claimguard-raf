import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { getOutstandingWork } from '@/features/dashboards/api';
import { MetricsDashboard, type Kpi } from '@/features/dashboards/MetricsDashboard';
import { WorkList } from '@/features/dashboards/WorkList';

const KPIS: Kpi[] = [
  { label: 'Active claims', read: (metrics) => metrics.claims_total },
  { label: 'Open requests', read: (metrics) => metrics.open_requests },
  { label: 'Blocking issues', read: (metrics) => metrics.blocking_issues },
  { label: 'Ready claims', read: (metrics) => metrics.ready_claims },
];

/** S26. */
export function LawyerDashboardPage() {
  const work = useQuery({ queryKey: ['outstanding-work', 'lawyer'], queryFn: () => getOutstandingWork('lawyer') });
  return (
    <MetricsDashboard role="lawyer" title="Dashboard" kpis={KPIS}>
      <Card title="Needs your attention">{work.data ? <WorkList items={work.data.slice(0, 8)} testId="attention" /> : null}</Card>
    </MetricsDashboard>
  );
}
