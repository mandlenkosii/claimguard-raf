import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { StateChip } from '@/components/domain/StateChip';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Choice';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { Textarea, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/requests/api';
import { canCreateRequests } from '@/lib/access/capabilities';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { isOverdue } from '@rules/requests';

export const RECIPIENT_LABELS: Record<string, string> = { claimant: 'Claimant', legal_representative: 'Legal representative' };
const RECIPIENTS = Object.entries(RECIPIENT_LABELS).map(([value, label]) => ({ value, label }));
const SUMMARY = [
  { key: 'pending', label: 'Pending' },
  { key: 'responded', label: 'Responded' },
  { key: 'under_review', label: 'Under review' },
  { key: 'closed', label: 'Closed' },
];

type DrawerProps = { claimId: string; open: boolean; onClose: () => void; onCreated: () => void };
type Errors = { title?: string; description?: string; recipient?: string };

function NewRequestDrawer({ claimId, open, onClose, onCreated }: DrawerProps) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [linked, setLinked] = useState('');
  const [due, setDue] = useState('');
  const [documents, setDocuments] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const issues = useQuery({ queryKey: ['linkable-issues', claimId], queryFn: () => api.getLinkableIssues(claimId), enabled: open });

  const create = useMutation({
    mutationFn: () => api.createRequest({ claimId, title: title.trim(), description: description.trim(), recipientType: recipient, linkedIssueId: linked || null, dueDate: due || null, requestsDocuments: documents }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[35] });
      setTitle('');
      setDescription('');
      setRecipient('');
      setLinked('');
      setDue('');
      setDocuments(false);
      onCreated();
      onClose();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function submit() {
    const found: Errors = { title: title.trim() ? undefined : TXT[4], description: description.trim() ? undefined : TXT[4], recipient: recipient ? undefined : TXT[4] };
    setErrors(found);
    if (!found.title && !found.description && !found.recipient) create.mutate();
  }

  return (
    <Drawer
      open={open}
      title="New request"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} disabled={create.isPending} onClick={submit}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Request title" name="title" required maxLength={200} value={title} onChange={setTitle} error={errors.title} />
        <Textarea label="Description" name="description" required rows={4} maxLength={4000} value={description} onChange={setDescription} error={errors.description} />
        <Select label="Recipient" name="recipient" required placeholder="" options={RECIPIENTS} value={recipient} onChange={setRecipient} error={errors.recipient} />
        <Select label="Linked readiness issue (optional)" name="linked-issue" placeholder="" options={(issues.data ?? []).map((issue) => ({ value: issue.id, label: `${issue.rule_id} · ${issue.title}` }))} value={linked} onChange={setLinked} />
        <TextField label="Due date (optional)" name="due-date" type="date" value={due} onChange={setDue} />
        <Checkbox label="Request supporting documents" checked={documents} onChange={setDocuments} />
      </div>
    </Drawer>
  );
}

/** S21. */
export function RequestsTab() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const requests = useQuery({ queryKey: ['requests', id], queryFn: () => api.getRequests(id) });
  const rows = requests.data ?? [];
  const allowed = session ? canCreateRequests(session) : false;

  const columns: DataTableColumn<api.RequestRow>[] = [
    {
      key: 'request',
      header: 'Request',
      render: (row) => (
        <Link to={`/claims/${id}/requests/${row.id}`} className="font-medium text-accent hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: 'recipient', header: 'Recipient', render: (row) => RECIPIENT_LABELS[row.recipient_type] ?? row.recipient_type },
    { key: 'created', header: 'Created', render: (row) => formatDate(row.created_at) },
    {
      key: 'due',
      header: 'Due date',
      render: (row) =>
        row.due_date ? <span className={cn(isOverdue(row) && 'font-semibold text-error')}>{formatDate(row.due_date)}</span> : <span className="text-text-secondary">No due date</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StateChip kind="request" state={isOverdue(row) ? 'overdue' : row.status} /> },
    {
      key: 'issue',
      header: 'Linked issue',
      render: (row) => (row.linked_issue ? <span className="rounded-chip bg-surface-muted px-2 font-mono text-mono text-primary">{row.linked_issue.rule_id}</span> : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul data-testid="request-summary" className="flex flex-wrap gap-2">
          {[...SUMMARY.map((item) => ({ ...item, count: rows.filter((row) => row.status === item.key).length })), { key: 'overdue', label: 'Overdue', count: rows.filter((row) => isOverdue(row)).length }].map((item) => (
            <li key={item.key} className={cn('inline-flex items-center gap-2 rounded-chip px-3 py-1 text-small font-semibold', item.key === 'overdue' ? 'bg-error-tint text-error' : 'bg-surface-muted text-primary')}>
              <span>{item.label}</span>
              <span>{item.count}</span>
            </li>
          ))}
        </ul>
        {allowed ? (
          <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setCreating(true)}>
            New request
          </Button>
        ) : null}
      </div>
      <DataTable
        caption="Information requests"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.title}
        status={requests.isPending ? 'loading' : requests.isError ? 'error' : 'ready'}
        onRetry={() => void requests.refetch()}
        empty={<EmptyState icon={ClipboardList} message={TXT[53]} />}
        renderActions={(row) => (
          <ButtonLink variant="secondary" to={`/claims/${id}/requests/${row.id}`} aria-label={`View details for ${row.title}`}>
            View details
          </ButtonLink>
        )}
      />
      {allowed ? <NewRequestDrawer claimId={id} open={creating} onClose={() => setCreating(false)} onCreated={() => void queryClient.invalidateQueries({ queryKey: ['requests', id] })} /> : null}
    </div>
  );
}
