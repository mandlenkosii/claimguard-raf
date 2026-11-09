import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Info, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { StateChip } from '@/components/domain/StateChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, OfflineBanner, Skeleton, useOnlineStatus } from '@/components/ui/States';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { Textarea } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/requests/api';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { formatDate, formatTime } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { UploadDocumentModal } from '@/modals/UploadDocumentModal';
import { isOverdue } from '@rules/requests';
import { RECIPIENT_LABELS } from './RequestsTab';

const NOTICE = 'Submitting a response does not close the request — an officer will review it.';
const STAGES = [
  { id: 'pending', label: 'Created' },
  { id: 'responded', label: 'Responded' },
  { id: 'under_review', label: 'Under review' },
  { id: 'closed', label: 'Closed' },
];
const STATUS_TEXT: Record<string, string> = { pending: 'Pending', responded: 'Responded', under_review: 'Under review', closed: 'Closed' };
const when = (value: string) => `${formatDate(value)}, ${formatTime(value)}`;

function progress({ request, history }: api.RequestDetail): Step[] {
  const current = STAGES.findIndex((stage) => stage.id === request.status);
  return STAGES.map((stage, index) => {
    const reached = stage.id === 'pending' ? request.created_at : history.findLast((row) => row.to_status === stage.id)?.created_at;
    return {
      id: stage.id,
      label: stage.label,
      status: index < current || request.status === 'closed' ? 'complete' : index === current ? 'current' : 'upcoming',
      timestamp: reached && index <= current ? formatDate(reached) : undefined,
    };
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label uppercase text-text-secondary">{label}</dt>
      <dd className="mt-1 text-body text-text">{value}</dd>
    </div>
  );
}

function ResponseComposer({ data, onDone }: { data: api.RequestDetail; onDone: () => void }) {
  const toast = useToast();
  const online = useOnlineStatus();
  const { id: requestId, claim_id: claimId, claim_reference: reference } = data.request;
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attached, setAttached] = useState<Array<{ id: string; filename: string }>>([]);
  const submit = useMutation({
    mutationFn: () => api.respondToRequest({ requestId, body: body.trim(), documentIds: attached.map((item) => item.id) }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[36] });
      onDone();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function send() {
    if (!body.trim()) {
      setError(TXT[4]);
      return;
    }
    setError('');
    submit.mutate();
  }

  return (
    <Card title="Respond to this request">
      <div className="space-y-3">
        <Textarea label="Your response" name="response" rows={4} maxLength={4000} value={body} onChange={setBody} error={error} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Paperclip aria-hidden className="size-icon-sm" />} onClick={() => setUploading(true)}>
            Add documents
          </Button>
          {attached.map((item) => (
            <span key={item.id} className="rounded-chip bg-surface-muted px-2 py-1 text-small text-text">
              {item.filename}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-2 rounded-input bg-info-tint p-3 text-small font-medium text-info">
          <Info aria-hidden className="size-icon-sm shrink-0" />
          {NOTICE}
        </p>
        <div className="flex justify-end">
          <Button loading={submit.isPending} disabled={!online || submit.isPending} onClick={send}>
            Submit response
          </Button>
        </div>
      </div>
      <UploadDocumentModal open={uploading} claimId={claimId} reference={reference} onClose={() => setUploading(false)} onUploaded={(document) => setAttached((current) => [...current, document])} />
    </Card>
  );
}

/** S22. */
export function RequestDetailPage() {
  const { id = '', requestId = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['request', requestId], queryFn: () => api.getRequestDetail(requestId) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['request', requestId] });
    void queryClient.invalidateQueries({ queryKey: ['requests', id] });
    void queryClient.invalidateQueries({ queryKey: ['documents', id] });
  };
  const review = useMutation({
    mutationFn: (status: string) => api.updateRequestStatus({ requestId, status }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[37] });
      refresh();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  if (detail.isPending) return <Skeleton variant="card" />;
  if (detail.isError) return <ErrorState onRetry={() => void detail.refetch()} />;

  const data = detail.data;
  const { request, responses, history } = data;
  const reviewable = data.can_review && (request.status === 'responded' || request.status === 'under_review');

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <Link to={`/claims/${id}/requests`} className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline">
        <ArrowLeft aria-hidden className="size-icon-sm" />
        Requests
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h2 text-primary">{request.title}</h2>
              <StateChip kind="request" state={isOverdue(request) ? 'overdue' : request.status} />
            </div>
            <p className="mt-2 text-body text-text">{request.description}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Recipient" value={RECIPIENT_LABELS[request.recipient_type] ?? request.recipient_type} />
              <Detail label="Due date" value={request.due_date ? formatDate(request.due_date) : 'No due date'} />
              <Detail label="Requested by" value={request.creator_name} />
              <Detail label="Linked readiness issue" value={request.linked_issue ? `${request.linked_issue.rule_id} · ${request.linked_issue.title}` : '—'} />
            </dl>
            {reviewable ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {request.status === 'responded' ? (
                  <Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate('under_review')}>
                    Start review
                  </Button>
                ) : null}
                <Button variant="secondary" disabled={review.isPending} onClick={() => review.mutate('pending')}>
                  Request more information
                </Button>
                <Button disabled={review.isPending} onClick={() => review.mutate('closed')}>
                  Close request
                </Button>
              </div>
            ) : null}
          </section>

          {responses.length ? (
            <Card title="Responses">
              <ul className="space-y-4">
                {responses.map((response) => (
                  <li key={response.id} className="rounded-input bg-surface-muted p-3">
                    <p className="whitespace-pre-wrap text-body text-text">{response.body}</p>
                    {response.documents.length ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {response.documents.map((document) => (
                          <li key={document.id} className="inline-flex items-center gap-1 text-small font-medium text-text">
                            <FileText aria-hidden className="size-icon-sm" />
                            <Link to={`/claims/${id}/documents`} className="text-accent hover:underline">
                              {document.filename}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-small text-text-secondary">{`${response.author_name}${response.author_role ? ` · ${ROLE_LABELS[response.author_role as RoleKey] ?? response.author_role}` : ''} · ${when(response.created_at)}`}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {data.can_respond ? <ResponseComposer key={responses.length} data={data} onDone={refresh} /> : null}
        </div>

        <div className="space-y-6">
          <Card title="Request progress">
            <div data-testid="request-progress">
              <Stepper label="Request progress" variant="history" steps={progress(data)} />
            </div>
          </Card>
          <Card title="History">
            <ul data-testid="request-history" className="space-y-3 text-small">
              <li>
                <p className="font-medium text-text">Request created</p>
                <p className="text-text-secondary">{`${request.creator_name} · ${when(request.created_at)}`}</p>
              </li>
              {history.map((row, index) => (
                <li key={`${row.to_status}-${index}`}>
                  <p className="font-medium text-text">{`${STATUS_TEXT[row.from_status ?? ''] ?? '—'} → ${STATUS_TEXT[row.to_status] ?? row.to_status}`}</p>
                  <p className="text-text-secondary">{`${row.actor_name} · ${when(row.created_at)}`}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

