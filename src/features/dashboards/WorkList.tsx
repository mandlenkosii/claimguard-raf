import { Link } from 'react-router';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import type { WorkItem } from './api';
import { SOURCE_LABELS, workItemPath } from './work';

/** Requests and issues waiting for someone (S09, S26, S30). */
export function WorkList({ items, testId }: { items: WorkItem[]; testId: string }) {
  if (!items.length) return <p className="text-body text-text-secondary">{TXT[58]}</p>;
  return (
    <ul data-testid={testId} className="divide-y divide-border">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="py-3 first:pt-0 last:pb-0">
          <Link to={workItemPath(item)} className="text-body font-medium text-accent hover:underline">
            {item.title}
          </Link>
          <p className="text-small text-text-secondary">
            <span className="font-mono text-mono">{item.claim_reference}</span>
            {` · ${SOURCE_LABELS[item.kind]}${item.due_date ? ` · Due ${formatDate(item.due_date)}` : ''}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
