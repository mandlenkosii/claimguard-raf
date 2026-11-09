import { MetricsDashboard, type Kpi } from '@/features/dashboards/MetricsDashboard';

const KPIS: Kpi[] = [
  { label: 'Total claims', read: (metrics) => metrics.claims_total },
  { label: 'Average readiness', read: (metrics) => (metrics.average_readiness === null ? '—' : `${metrics.average_readiness}%`) },
  { label: 'Open risk alerts', read: (metrics) => metrics.open_alerts ?? '—' },
  { label: 'Overdue requests', read: (metrics) => metrics.overdue_requests },
];

/** S38: totals only, with no claimant names or evidence (SEC31). */
export function ManagementDashboardPage() {
  return <MetricsDashboard role="manager" title="Management dashboard" subtitle="Totals only. Claimant details and investigation evidence are not shown." kpis={KPIS} />;
}
