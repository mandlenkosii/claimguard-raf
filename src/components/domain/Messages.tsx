import { Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextField';
import type { Message } from '@/features/messages/api';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { cn } from '@/lib/cn';
import { formatDate, formatTime } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

/** One conversation (S20). The author and time come from the server (BR21). */
export function MessageThread({ messages, currentUserId }: { messages: Message[]; currentUserId: string }) {
  return (
    <ul className="space-y-4">
      {messages.map((message) => {
        const own = message.author_id === currentUserId;
        return (
          <li key={message.id} data-testid={`message-${message.id}`} data-own={own} className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
            <div className="flex flex-wrap items-center gap-2 text-small text-text-secondary">
              <span className="font-semibold text-text">{message.author_name}</span>
              {message.author_role ? <span className="rounded-chip bg-surface-muted px-2 font-semibold text-primary">{ROLE_LABELS[message.author_role as RoleKey] ?? message.author_role}</span> : null}
              <span>{`${formatDate(message.created_at)}, ${formatTime(message.created_at)}`}</span>
            </div>
            <p className={cn('mt-1 max-w-prose whitespace-pre-wrap rounded-card p-3 text-body', own ? 'bg-primary text-text-on-dark' : 'bg-surface-muted text-text')}>{message.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** The message box (S20). */
export function Composer({ onSend, disabled }: { onSend: (body: string) => Promise<void> | void; disabled?: boolean }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!body.trim()) {
      setError(TXT[4]);
      return;
    }
    setError('');
    setSending(true);
    try {
      await onSend(body.trim());
      setBody('');
    } catch {
      setError(TXT[38]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea label="Message" name="message" rows={3} maxLength={4000} value={body} onChange={setBody} error={error} />
      <div className="flex justify-end">
        <Button loading={sending} disabled={disabled || sending} icon={<Send aria-hidden className="size-icon-sm" />} onClick={() => void submit()}>
          Send
        </Button>
      </div>
    </div>
  );
}
