import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, MessageSquare, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { Composer, MessageThread } from '@/components/domain/Messages';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState, ErrorState, OfflineBanner, Skeleton, useOnlineStatus } from '@/components/ui/States';
import { Textarea, TextField } from '@/components/ui/TextField';
import * as api from '@/features/messages/api';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { RestrictedClaimView } from './RestrictedClaimView';

const NOTICE = 'Messages are not official RAF submissions or legal notices.';

type NewThreadProps = { claimId: string; onClose: () => void; onCreated: (threadId: string) => void };

function NewThreadModal({ claimId, onClose, onCreated }: NewThreadProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ title?: string; body?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    const found = { title: title.trim() ? undefined : TXT[4], body: body.trim() ? undefined : TXT[4] };
    setErrors(found);
    if (found.title || found.body) return;
    setSaving(true);
    try {
      onCreated(await api.createThread({ claimId, title: title.trim(), body: body.trim() }));
    } catch {
      setErrors({ form: TXT[38] });
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="New thread"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={saving} onClick={() => void submit()}>
            Start thread
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form ? <p role="alert" className="text-small font-medium text-error">{errors.form}</p> : null}
        <TextField label="Thread title" name="thread-title" required maxLength={150} value={title} onChange={setTitle} error={errors.title} />
        <Textarea label="First message" name="first-message" required rows={4} maxLength={4000} value={body} onChange={setBody} error={errors.body} />
      </div>
    </Modal>
  );
}

/** S20. */
export function MessagesTab() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const messaging = useQuery({ queryKey: ['messaging', id], queryFn: () => api.getMessaging(id) });
  const threadId = selected ?? messaging.data?.threads[0]?.id ?? null;
  const messages = useQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: () => api.getThreadMessages(threadId!),
    enabled: Boolean(threadId),
    // Keeps a conversation current while another participant replies.
    refetchInterval: 5000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['messaging', id] });
    void queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
  };

  if (messaging.isPending) return <Skeleton variant="card" />;
  if (messaging.isError) return <ErrorState onRetry={() => void messaging.refetch()} />;
  if (!messaging.data.is_participant) return <RestrictedClaimView />;

  const { threads, participants } = messaging.data;
  const newThread = (
    <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setCreating(true)}>
      New thread
    </Button>
  );
  const modal = creating ? (
    <NewThreadModal
      claimId={id}
      onClose={() => setCreating(false)}
      onCreated={(created) => {
        setCreating(false);
        setSelected(created);
        refresh();
      }}
    />
  ) : null;

  if (!threads.length) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <OfflineBanner />
        <EmptyState icon={MessageSquare} message={TXT[54]} action={{ label: 'New thread', onClick: () => setCreating(true) }} />
        {modal}
      </div>
    );
  }

  const active = threads.find((thread) => thread.id === threadId);

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="space-y-3 rounded-card border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h3 text-primary">Threads</h2>
            {newThread}
          </div>
          <ul className="space-y-2">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  aria-current={thread.id === threadId || undefined}
                  onClick={() => setSelected(thread.id)}
                  className={cn('w-full rounded-input border p-3 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', thread.id === threadId ? 'border-accent bg-surface-muted' : 'border-border')}
                >
                  <span className="block text-body font-medium text-text">{thread.title}</span>
                  {thread.last_message_body ? <span className="block truncate text-small text-text-secondary">{thread.last_message_body}</span> : null}
                  <span className="block text-small text-text-secondary">{formatDate(thread.last_message_at ?? thread.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="text-h2 text-primary">{active?.title}</h2>
          <div>
            <button type="button" aria-expanded={showParticipants} onClick={() => setShowParticipants((current) => !current)} className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline">
              {`Participants (${participants.length})`}
              <ChevronDown aria-hidden className={cn('size-icon-sm transition-transform', showParticipants && 'rotate-180')} />
            </button>
            {showParticipants ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {participants.map((person) => (
                  <li key={person.id} className="rounded-chip bg-surface-muted px-2 py-1 text-small text-text">
                    <span>{person.name}</span>
                    {person.role ? <span className="text-text-secondary">{` · ${ROLE_LABELS[person.role as RoleKey] ?? person.role}`}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {messages.isPending && threadId ? <Skeleton variant="card" /> : null}
          {messages.isError ? <ErrorState onRetry={() => void messages.refetch()} /> : null}
          {messages.data ? <MessageThread messages={messages.data} currentUserId={session?.userId ?? ''} /> : null}
          <p className="flex items-start gap-2 rounded-input bg-warning-tint p-3 text-small font-medium text-warning">
            <TriangleAlert aria-hidden className="size-icon-sm shrink-0" />
            <span>{NOTICE}</span>
          </p>
          <Composer
            disabled={!online}
            onSend={async (body) => {
              await api.sendMessage({ claimId: id, threadId: threadId!, body });
              refresh();
            }}
          />
        </section>
      </div>
      {modal}
    </div>
  );
}
