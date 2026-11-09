import { Link } from 'react-router';
import type { AlertSummary } from '@/features/risk/api';
import { formatDate } from '@/lib/format/dates';
import { SeverityChip } from './SeverityChip';
import { StateChip } from './StateChip';

/** One alert on S19. */
export function AlertCard({ alert }: { alert: AlertSummary }) {
  return (
    <article className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityChip severity={alert.severity} />
          <span className="font-mono text-mono text-text-secondary">{alert.reference}</span>
          {alert.rule_id ? <span className="rounded-chip bg-surface-muted px-2 font-mono text-mono text-primary">{alert.rule_id}</span> : null}
        </div>
        <StateChip kind="alert" state={alert.status} />
      </div>
      <h3 className="mt-3 text-h3 text-primary">{alert.title}</h3>
      <p className="mt-1 text-body text-text">{alert.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-small text-text-secondary">
        <div className="flex flex-wrap gap-4">
          <span>{formatDate(alert.created_at)}</span>
          <span>{alert.assignee_name ? `Assigned: ${alert.assignee_name}` : 'Unassigned'}</span>
          <span>{`${alert.evidence_count} evidence item${alert.evidence_count === 1 ? '' : 's'}`}</span>
        </div>
        <Link to={`/raf/risk/${alert.id}`} className="font-medium text-accent hover:underline">
          Open in workspace
        </Link>
      </div>
    </article>
  );
}
