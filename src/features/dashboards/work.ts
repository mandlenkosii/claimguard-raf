import type { WorkItem } from './api';

export const SOURCE_LABELS: Record<WorkItem['kind'], string> = { issue: 'Readiness issue', request: 'Information request' };

export const workItemPath = (item: WorkItem): string => (item.kind === 'issue' ? `/claims/${item.claim_id}/readiness` : `/claims/${item.claim_id}/requests/${item.id}`);
