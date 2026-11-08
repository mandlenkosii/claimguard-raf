import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Choice';
import { Modal } from '@/components/ui/Overlay';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Textarea } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { CLAIM_STATUSES, StatusChip } from '@/components/domain/StatusChip';
import * as api from '@/features/workflow/api';
import { cn } from '@/lib/cn';
import { fillMessage, TXT } from '@/lib/format/messages';

type Props = { open: boolean; claimId: string; reference: string; currentStatus: string; onClose: () => void; onChanged: () => void };

/** M2. The server decides what is allowed; this only shows its answer. */
export function ChangeStatusModal({ open, claimId, reference, currentStatus, onClose, onChanged }: Props) {
  const toast = useToast();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [reasonError, setReasonError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  const options = useQuery({ queryKey: ['transitions', claimId], queryFn: () => api.allowedTransitions(claimId), enabled: open });

  const change = useMutation({
    mutationFn: () => api.transitionStatus({ claimId, target, reason: reason.trim(), note: note.trim() || undefined, notify }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.show({ tone: 'success', message: fillMessage(TXT[19], { status: CLAIM_STATUSES[target] ?? target }) });
        onChanged();
        onClose();
      } else if (result.code === 'missing_fields') {
        setFormError(fillMessage(TXT[17], { fields: (result.missing ?? []).join(', ') }));
      } else if (result.code === 'reason_required') {
        setReasonError(TXT[18]);
      } else {
        setFormError(fillMessage(TXT[20], { reason: result.reason ?? '' }).trim());
      }
    },
    onError: () => setFormError(TXT[2]),
  });

  function confirm() {
    setFormError(undefined);
    if (!reason.trim()) {
      setReasonError(TXT[18]);
      return;
    }
    setReasonError(undefined);
    change.mutate();
  }

  return (
    <Modal
      open={open}
      title="Change claim status"
      description={`Update the workflow status for claim ${reference}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!target} loading={change.isPending} onClick={confirm}>
            Confirm change
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 rounded-card bg-surface-muted p-3 text-small font-semibold text-text-secondary">
        Current status <StatusChip status={currentStatus} />
      </div>

      {options.isPending ? <div className="mt-4"><Skeleton variant="card" /></div> : null}
      {options.isError ? <ErrorState onRetry={() => void options.refetch()} /> : null}
      {options.data ? (
        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-h3 text-primary">Select target status</legend>
          {options.data.allowed.map((option) => (
            <label key={option.status} className={cn('flex cursor-pointer items-center gap-3 rounded-card border p-3', target === option.status ? 'border-accent bg-surface-muted' : 'border-border')}>
              <input type="radio" name="target" value={option.status} checked={target === option.status} onChange={() => setTarget(option.status)} className="size-4 accent-accent" />
              <span className="text-body font-medium text-text">{option.label}</span>
            </label>
          ))}
          {options.data.blocked.map((option) => (
            <label key={option.status} className="flex items-start gap-3 rounded-card border border-border bg-surface-muted p-3 opacity-70">
              <input type="radio" name="target" value={option.status} disabled className="mt-1 size-4" />
              <span>
                <span className="block text-body font-medium text-text">{option.label}</span>
                <span className="block text-small text-text-secondary">{option.reason}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="mt-4 space-y-4">
        <Textarea label="Reason for change" name="reason" required maxLength={300} rows={3} value={reason} onChange={setReason} error={reasonError} />
        <Textarea label="Note to participants" name="note" maxLength={180} rows={2} value={note} onChange={setNote} />
        <Toggle label="Notify participants" checked={notify} onChange={setNotify} />
        {formError ? <p role="alert" className="rounded-card bg-error-tint p-3 text-body text-error">{formError}</p> : null}
        <p className="text-small text-text-secondary">Status changes are recorded in the timeline and audit history.</p>
      </div>
    </Modal>
  );
}
