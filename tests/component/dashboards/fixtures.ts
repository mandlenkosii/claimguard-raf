import type { Metrics, WorkItem } from '@/features/dashboards/api';

export const metrics: Metrics = {
  claims_total: 21,
  by_status: { draft: 2, validation: 7, ready: 3 },
  ready_claims: 3,
  average_readiness: 84,
  blocking_issues: 4,
  open_requests: 6,
  overdue_requests: 2,
  awaiting_review: 5,
  open_alerts: 3,
};

export const workItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  kind: 'issue', id: 'w1', title: 'Work', claim_id: 'c1', claim_reference: 'CG-2026-000142', claimant_name: 'Sipho Ndlovu', due_date: null, status: 'open', impact: 'blocking', rule_id: 'RULE-001', column: 'todo', ...overrides,
});
