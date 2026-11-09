import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { ComparisonTable, comparisonRows } from '@/components/domain/ComparisonTable';
import { DocumentPreview } from '@/components/domain/DocumentPreview';
import { SeverityChip } from '@/components/domain/SeverityChip';
import { StateChip } from '@/components/domain/StateChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { Textarea } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/risk/api';
import { ALERT_STATUS_LABELS, FIELD_LABELS, OUTCOME_LABELS } from '@/features/risk/labels';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { formatDate, formatTime } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { RecordOutcomeModal } from '@/modals/RecordOutcomeModal';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';

const when = (value: string) => `${formatDate(value)}, ${formatTime(value)}`;
const statusLabel = (value: string | null) => (value ? (ALERT_STATUS_LABELS[value] ?? value) : '');

function historyText(row: api.AlertHistoryRow): string {
  if (row.change_type === 'status') return `Status: ${statusLabel(row.old_value)} → ${statusLabel(row.new_value)}`;
  if (row.change_type === 'severity') return `Severity: ${row.old_value} → ${row.new_value}`;
  if (row.change_type === 'assignment') return `Assigned to ${row.new_value ?? '—'}`;
  return `Outcome recorded: ${OUTCOME_LABELS[row.new_value ?? ''] ?? row.new_value}`;
}

type ActionMode = 'assign' | 'escalate' | 'severity';
const ACTION_TITLES: Record<ActionMode, string> = { assign: 'Assign alert', escalate: 'Escalate alert', severity: 'Change severity' };
const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => ({ value, label: value }));

type ActionModalProps = { mode: ActionMode; data: api.AlertWorkspace; busy: boolean; onClose: () => void; onSubmit: (update: Omit<api.AlertUpdate, 'alertId'>) => void };

/** Assign, escalate and change severity (OP29). */
function ActionModal({ mode, data, busy, onClose, onSubmit }: ActionModalProps) {
  const [assignee, setAssignee] = useState(data.alert.assigned_to ?? '');
  const [severity, setSeverity] = useState(data.alert.severity);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function confirm() {
    if (mode === 'assign') {
      if (!assignee) {
        setError(TXT[4]);
        return;
      }
      onSubmit({ assignedTo: assignee });
      return;
    }
    if (!reason.trim()) {
      setError(TXT[18]);
      return;
    }
    onSubmit(mode === 'escalate' ? { status: 'ESCALATED', reason: reason.trim() } : { severity, reason: reason.trim() });
  }

  return (
    <Modal
      open
      title={ACTION_TITLES[mode]}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} disabled={busy} onClick={confirm}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === 'assign' ? (
          <Select label="Investigator" name="assignee" required options={data.investigators.map((item) => ({ value: item.id, label: item.name }))} value={assignee} onChange={setAssignee} error={error} />
        ) : (
          <>
            {mode === 'severity' ? <Select label="Severity" name="severity" required options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} /> : null}
            <Textarea label="Reason" name="reason" required rows={3} maxLength={500} value={reason} onChange={setReason} error={error} />
          </>
        )}
      </div>
    </Modal>
  );
}

function Notes({ data }: { data: api.AlertWorkspace }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const add = useMutation({
    mutationFn: (input: api.NoteInput) => api.addNote(input),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[32] });
      setBody('');
      setCorrecting(null);
      void queryClient.invalidateQueries({ queryKey: ['alert-workspace', data.alert.id] });
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function submit() {
    if (!body.trim()) {
      setError(TXT[4]);
      return;
    }
    setError('');
    add.mutate({ alertId: data.alert.id, body: body.trim(), correctsNoteId: correcting });
  }

  return (
    <Card title="Investigation notes">
      <ul className="space-y-3">
        {data.notes.map((note) => (
          <li key={note.id} className="rounded-input bg-surface-muted p-3">
            {note.corrects_note_id ? <p className="text-small font-semibold text-warning">Correction to an earlier note</p> : null}
            <p className="text-body text-text">{note.body}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-small text-text-secondary">
              <span>{`${note.author_name}${note.author_role ? ` · ${ROLE_LABELS[note.author_role as RoleKey] ?? note.author_role}` : ''} · ${when(note.created_at)}`}</span>
              <button type="button" className="font-medium text-accent hover:underline" onClick={() => setCorrecting(note.id)}>
                Add correction
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        {correcting ? (
          <p className="flex items-center gap-2 text-small font-medium text-warning">
            Correcting an earlier note. The original stays visible.
            <button type="button" className="text-accent hover:underline" onClick={() => setCorrecting(null)}>
              Cancel
            </button>
          </p>
        ) : null}
        <Textarea label="Add a note" name="note" rows={3} maxLength={5000} value={body} onChange={setBody} error={error} />
        <Button variant="secondary" loading={add.isPending} disabled={add.isPending} onClick={submit}>
          Add note
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-h3 text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** S36. */
export function InvestigationWorkspacePage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [recording, setRecording] = useState(false);
  const [selected, setSelected] = useState<api.AlertEvidence | null>(null);

  const workspace = useQuery({
    queryKey: ['alert-workspace', id],
    queryFn: () => api.getAlertWorkspace(id),
    retry: (count, error) => (error as { code?: string }).code !== '42501' && count < 1,
  });
  const preview = useQuery({
    queryKey: ['evidence-preview', selected?.storage_path],
    queryFn: () => api.getPreviewUrl(selected!.storage_path!),
    enabled: Boolean(selected?.storage_path),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['alert-workspace', id] });
  const update = useMutation({
    mutationFn: (input: api.AlertUpdate) => api.updateAlert(input),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[31] });
      setMode(null);
      refresh();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  if (workspace.isPending) {
    return (
      <div className="mx-auto max-w-content space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }
  if (workspace.isError) {
    if ((workspace.error as { code?: string }).code === '42501') return <AccessDeniedPage />;
    return <ErrorState onRetry={() => void workspace.refetch()} />;
  }

  const data = workspace.data;
  const { alert, claim, rule, evidence, review } = data;
  const isOpen = alert.status === 'OPEN';
  const active = isOpen || alert.status === 'UNDER_REVIEW' || alert.status === 'ESCALATED';
  const mine = alert.assigned_to === session?.userId;
  const comparable = alert.indicator_type !== 'duplicate_hash' && evidence.filter((item) => item.value).length >= 2;

  return (
    <div className="mx-auto max-w-content space-y-6">
      <OfflineBanner />
      <header className="rounded-card border border-border bg-surface p-6 shadow-card">
        <Link to="/raf/risk" className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline">
          <ArrowLeft aria-hidden className="size-icon-sm" />
          Risk queue
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={alert.severity} />
              <span className="font-mono text-mono text-primary">{alert.reference}</span>
              <StateChip kind="alert" state={alert.status} />
            </div>
            <h1 className="mt-2 text-h1 text-primary">{alert.title}</h1>
            <p className="mt-1 text-small text-text-secondary">
              <Link to={`/claims/${claim.id}/risk`} className="font-mono text-mono text-accent hover:underline">
                {claim.reference}
              </Link>
              {` · ${claim.claimant_name} · ${alert.assignee_name ? `Assigned: ${alert.assignee_name}` : 'Unassigned'} · ${formatDate(alert.created_at)}`}
            </p>
          </div>
          {active ? (
            <div className="flex flex-wrap gap-2">
              {isOpen && mine ? (
                <Button variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ alertId: alert.id, status: 'UNDER_REVIEW' })}>
                  Start review
                </Button>
              ) : null}
              {data.can_assign ? (
                <Button variant="secondary" onClick={() => setMode('assign')}>
                  Assign
                </Button>
              ) : null}
              {mine ? (
                <Button variant="secondary" onClick={() => setMode('severity')}>
                  Change severity
                </Button>
              ) : null}
              {alert.status !== 'ESCALATED' ? (
                <Button variant="danger" onClick={() => setMode('escalate')}>
                  Escalate
                </Button>
              ) : null}
              {!isOpen ? <Button onClick={() => setRecording(true)}>Record outcome</Button> : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_2fr_1fr]">
        <div className="space-y-6">
          <Section title="Why this alert was raised" testId="why-raised">
            {rule ? <p className="font-mono text-mono text-primary">{`${rule.id} v${rule.version}`}</p> : null}
            <p className="mt-1 text-body text-text">{alert.explanation}</p>
          </Section>
          <Section title="Evidence">
            <ul className="space-y-2">
              {evidence.map((item) => {
                const label = `${item.source}: ${item.value ?? item.description}`;
                return (
                  <li key={item.id} className="text-small">
                    {item.document_id ? (
                      <button type="button" className="text-left font-medium text-accent hover:underline" onClick={() => setSelected(item)}>
                        {label}
                      </button>
                    ) : (
                      <span className="text-text">{label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title="Related documents">
            <ul className="space-y-2 text-small text-text">
              {data.documents.map((document) => (
                <li key={document.id}>
                  <span className="font-medium">{document.filename}</span>
                  <span className="block text-text-secondary">{document.category_name}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Related issues">
            <ul className="space-y-2 text-small text-text">
              {data.issues.map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{issue.title}</span>
                  <StateChip kind="issue" state={issue.status} />
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="space-y-6">
          {comparable ? (
            <Section title="Evidence comparison">
              <ComparisonTable rows={comparisonRows(evidence.map((item) => ({ source: item.source, field: item.field, value: item.value ?? undefined })))} />
            </Section>
          ) : null}
          <Section title="Source document">
            {selected ? (
              <DocumentPreview filename={selected.filename ?? selected.source} url={preview.data ?? null} page={selected.source_page} field={FIELD_LABELS[selected.field] ?? selected.field} value={selected.value} />
            ) : (
              <p className="text-body text-text-secondary">Select an evidence item to see its source document.</p>
            )}
          </Section>
          {review ? (
            <Section title="Recorded outcome">
              <p className="text-body font-semibold text-primary">{OUTCOME_LABELS[review.outcome] ?? review.outcome}</p>
              <p className="mt-1 text-body text-text">{review.finding_summary}</p>
              <p className="mt-1 text-small text-text-secondary">{review.rationale}</p>
              <p className="mt-2 text-small text-text">{`Next action: ${review.next_action}${review.next_action_due ? ` · Due ${formatDate(review.next_action_due)}` : ''}`}</p>
              <p className="mt-2 text-small text-text-secondary">{`Recorded by ${review.recorder_name} · ${when(review.recorded_at)}`}</p>
            </Section>
          ) : null}
          <Notes data={data} />
        </div>

        <div className="space-y-6">
          <Section title="Alert history" testId="alert-history">
            <ul className="space-y-3">
              {data.history.map((row) => (
                <li key={row.id} className="text-small">
                  <p className="font-medium text-text">{historyText(row)}</p>
                  {row.reason ? <p className="text-text-secondary">{row.reason}</p> : null}
                  <p className="text-text-secondary">{`${row.actor_name ?? 'System'} · ${when(row.created_at)}`}</p>
                </li>
              ))}
              <li className="text-small">
                <p className="font-medium text-text">{`${alert.reference} raised`}</p>
                <p className="text-text-secondary">{when(alert.created_at)}</p>
              </li>
            </ul>
          </Section>
          <p className="flex items-start gap-2 rounded-card border border-border bg-surface-muted p-4 text-small font-medium text-text">
            <ShieldCheck aria-hidden className="size-icon-sm shrink-0" />
            Closing this alert does not close or reject the claim. Human decision required.
          </p>
        </div>
      </div>

      {mode ? <ActionModal mode={mode} data={data} busy={update.isPending} onClose={() => setMode(null)} onSubmit={(input) => update.mutate({ alertId: alert.id, ...input })} /> : null}
      <RecordOutcomeModal open={recording} alertId={alert.id} reference={alert.reference} evidence={evidence} onClose={() => setRecording(false)} onRecorded={refresh} />
    </div>
  );
}

