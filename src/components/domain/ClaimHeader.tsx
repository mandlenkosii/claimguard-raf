import { ArrowLeft, CircleAlert, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { StatusChip } from './StatusChip';

type ClaimHeaderProps = {
  backTo: string;
  backLabel: string;
  reference: string;
  title: string;
  status: string;
  readinessScore: number | null;
  blockingCount: number | null;
  actions?: ReactNode;
};

/** The top of the claim workspace (S14–S24). */
export function ClaimHeader({ backTo, backLabel, reference, title, status, readinessScore, blockingCount, actions }: ClaimHeaderProps) {
  const blocking = blockingCount ?? 0;
  return (
    <header className="rounded-card border border-border bg-surface p-6 shadow-card">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-small text-text-secondary">
        <Link to={backTo} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
          <ArrowLeft aria-hidden className="size-icon-sm" />
          {backLabel}
        </Link>
      </nav>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-small text-text-secondary">
              <span className="font-mono text-mono text-primary">{reference}</span>
              <button type="button" aria-label="Copy reference" onClick={() => void navigator.clipboard?.writeText(reference)} className="rounded-chip p-0.5 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Copy aria-hidden className="size-icon-sm" />
              </button>
            </span>
            <StatusChip status={status} />
            {readinessScore !== null ? <span className="rounded-chip bg-surface-muted px-2 text-small font-semibold text-primary">{`${readinessScore}% ready`}</span> : null}
            {blocking > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-chip bg-error-tint px-2 text-small font-semibold text-error">
                <CircleAlert aria-hidden className="size-icon-sm" />
                {`${blocking} blocking issue${blocking === 1 ? '' : 's'}`}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
