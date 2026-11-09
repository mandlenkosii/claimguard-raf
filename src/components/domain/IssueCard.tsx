import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextField';
import type { ClaimIssue, IssueUpdate } from '@/features/readiness/api';
import { cn } from '@/lib/cn';
import { TXT } from '@/lib/format/messages';
import { issueActionLabel } from '@rules/readiness';
import { ComparisonTable, comparisonRows } from './ComparisonTable';
import { StateChip } from './StateChip';

const COMPARED_RULES = ['RULE-002', 'RULE-003'];
type IssueCardProps = { issue: ClaimIssue; canAct: boolean; documentsPath: string; busy?: boolean; onUpdate: (update: IssueUpdate) => void };

/** One issue on S18 (US31, US35, US37). */
export function IssueCard({ issue, canAct, documentsPath, busy, onUpdate }: IssueCardProps) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const active = issue.status === 'open' || issue.status === 'under_review';
  const comparable = COMPARED_RULES.includes(issue.rule_id) && issue.evidence.filter((item) => item.value).length >= 2;

  function confirmDismissal() {
    if (!reason.trim()) {
      setReasonError(TXT[18]);
      return;
    }
    onUpdate({ issueId: issue.id, status: 'dismissed', reason: reason.trim() });
  }

  return (
    <article className={cn('rounded-card border border-l-4 border-border bg-surface p-5 shadow-card', active && (issue.impact === 'blocking' ? 'border-l-error' : 'border-l-warning'))}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-chip bg-surface-muted px-2 font-mono text-mono text-primary">{issue.rule_id}</span>
          <span className={cn('rounded-chip px-2 text-small font-semibold', issue.impact === 'blocking' ? 'bg-error-tint text-error' : 'bg-warning-tint text-warning')}>
            {issue.impact === 'blocking' ? 'Blocking' : 'Warning'}
          </span>
        </div>
        <StateChip kind="issue" state={issue.status} />
      </div>
      <h3 className="mt-3 text-h3 text-primary">{issue.title}</h3>
      <p className="mt-1 text-body text-text">{issue.explanation}</p>
      {issue.dismiss_reason ? <p className="mt-1 text-small text-text-secondary">{`Reason for dismissal: ${issue.dismiss_reason}`}</p> : null}

      {comparable ? (
        <div className="mt-3">
          <ComparisonTable rows={comparisonRows(issue.evidence)} />
        </div>
      ) : issue.evidence.length ? (
        <ul className="mt-3 flex flex-wrap gap-2 rounded-input bg-surface-muted p-3">
          {issue.evidence.map((item, index) => (
            <li key={`${item.source}-${index}`} className="inline-flex items-center gap-1 text-small text-text-secondary">
              <FileText aria-hidden className="size-icon-sm" />
              {item.document_id ? (
                <Link to={documentsPath} className="font-medium text-accent hover:underline">
                  {item.source}
                </Link>
              ) : (
                <span>{item.source}</span>
              )}
              {item.value ? <span className="font-mono text-mono">{item.value}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        <>
          <p className="mt-3 text-small font-medium text-text">{issue.corrective_action}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {issue.rule_id !== 'RULE-000' ? <ButtonLink to={documentsPath}>{issueActionLabel(issue.rule_id)}</ButtonLink> : null}
            {canAct && comparable ? (
              <>
                <Button variant="secondary" disabled={busy} aria-pressed={issue.classification === 'extraction_error'} onClick={() => onUpdate({ issueId: issue.id, classification: 'extraction_error' })}>
                  This is an extraction error
                </Button>
                <Button variant="secondary" disabled={busy} aria-pressed={issue.classification === 'genuine_discrepancy'} onClick={() => onUpdate({ issueId: issue.id, classification: 'genuine_discrepancy' })}>
                  Mark as genuine discrepancy
                </Button>
              </>
            ) : null}
            {canAct ? (
              <>
                {issue.status === 'open' ? (
                  <Button variant="ghost" disabled={busy} onClick={() => onUpdate({ issueId: issue.id, status: 'under_review' })}>
                    Mark under review
                  </Button>
                ) : null}
                <Button variant="ghost" disabled={busy} onClick={() => onUpdate({ issueId: issue.id, status: 'resolved' })}>
                  Mark as resolved
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setDismissing(true)}>
                  Dismiss
                </Button>
              </>
            ) : null}
          </div>
          {dismissing ? (
            <div className="mt-3 space-y-2">
              <Textarea
                label="Reason for dismissal"
                name={`dismiss-${issue.id}`}
                required
                rows={2}
                maxLength={500}
                value={reason}
                error={reasonError}
                onChange={(value) => {
                  setReason(value);
                  setReasonError('');
                }}
              />
              <Button variant="danger" disabled={busy} onClick={confirmDismissal}>
                Confirm dismissal
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
