import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/Button';
import { Checkbox, RadioGroup } from '@/components/ui/Choice';
import { Modal } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/States';
import { Textarea, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { recordReview } from '@/features/risk/api';
import { OUTCOME_LABELS } from '@/features/risk/labels';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';

const CONFIRMATION = 'I confirm this outcome is based on my own review of the evidence.';
const OUTCOMES = Object.entries(OUTCOME_LABELS).map(([value, label]) => ({ value, label }));
const RESULTING = [
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ESCALATED', label: 'Escalated' },
];

type Props = { open: boolean; alertId: string; reference: string; evidence: Array<{ id: string; description: string }>; onClose: () => void; onRecorded: () => void };
type Errors = Partial<Record<'outcome' | 'summary' | 'rationale' | 'nextAction' | 'confirmed', string>>;

/** M3. A person's finding; it never changes the claim (BR18). */
export function RecordOutcomeModal({ open, alertId, reference, evidence, onClose, onRecorded }: Props) {
  const { session } = useAuth();
  const toast = useToast();
  const online = useOnlineStatus();
  const [outcome, setOutcome] = useState('');
  const [summary, setSummary] = useState('');
  const [rationale, setRationale] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [due, setDue] = useState('');
  const [resulting, setResulting] = useState('RESOLVED');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: () =>
      recordReview({ alertId, outcome, findingSummary: summary.trim(), rationale: rationale.trim(), evidenceIds, nextAction: nextAction.trim(), nextActionDue: due || null, resultingStatus: resulting, confirmed }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[34] });
      onRecorded();
      onClose();
    },
    onError: () => setFormError(TXT[2]),
  });

  function submit() {
    setFormError('');
    const found: Errors = {
      outcome: outcome ? undefined : TXT[4],
      summary: summary.trim() ? undefined : TXT[4],
      rationale: rationale.trim() ? undefined : TXT[4],
      nextAction: nextAction.trim() ? undefined : TXT[4],
      confirmed: confirmed ? undefined : TXT[33],
    };
    setErrors(found);
    if (!Object.values(found).some(Boolean)) save.mutate();
  }

  return (
    <Modal
      open={open}
      title="Record outcome"
      description={`Alert ${reference}`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-small text-text-secondary">{`Recorded by ${session?.displayName ?? ''} · ${formatDate(new Date().toISOString())}`}</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={save.isPending} disabled={!online || save.isPending} onClick={submit}>
              Save outcome
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <OfflineBanner />
        {formError ? (
          <p role="alert" className="rounded-input bg-error-tint p-3 text-small font-medium text-error">
            {formError}
          </p>
        ) : null}
        <RadioGroup legend="Outcome" name="outcome" value={outcome} options={OUTCOMES} onChange={setOutcome} error={errors.outcome} />
        <Textarea label="Finding summary" name="finding-summary" required rows={3} maxLength={2000} value={summary} onChange={setSummary} error={errors.summary} />
        <Textarea label="Rationale" name="rationale" required rows={3} maxLength={4000} value={rationale} onChange={setRationale} error={errors.rationale} />
        {evidence.length ? (
          <fieldset className="space-y-2">
            <legend className="text-body font-medium text-text">Evidence referenced</legend>
            {evidence.map((item) => (
              <Checkbox
                key={item.id}
                label={item.description}
                checked={evidenceIds.includes(item.id)}
                onChange={(checked) => setEvidenceIds((current) => (checked ? [...current, item.id] : current.filter((id) => id !== item.id)))}
              />
            ))}
          </fieldset>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Next action" name="next-action" required maxLength={300} value={nextAction} onChange={setNextAction} error={errors.nextAction} />
          <TextField label="Next action due" name="next-action-due" type="date" value={due} onChange={setDue} />
        </div>
        <Select label="Alert status after this review" name="resulting-status" options={RESULTING} value={resulting} onChange={setResulting} />
        <Checkbox label={CONFIRMATION} checked={confirmed} onChange={setConfirmed} error={errors.confirmed} />
      </div>
    </Modal>
  );
}
