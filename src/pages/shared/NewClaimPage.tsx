import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { missingRequiredFields, REQUIRED_FIELD_LABELS } from '@rules/requiredFields';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Stepper } from '@/components/ui/Stepper';
import { Textarea, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/claims/api';
import * as workflow from '@/features/workflow/api';
import { formatAgo } from '@/lib/format/dates';
import { fillMessage, TXT } from '@/lib/format/messages';

const STEPS = ['Claimant', 'Accident', 'Injuries', 'Vehicles', 'Parties', 'Review'];
const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'].map((value) => ({ value, label: value }));
const CLAIMANT_ROLES = ['driver', 'passenger', 'pedestrian', 'cyclist'].map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }));
const REQUIRED_HELP = 'Required before this claim can leave Draft.';
const AUTO_SAVE_MS = 3000;

const EMPTY = {
  claimant_role: '', accident_date: '', accident_time: '', accident_province: '', accident_town: '', accident_location: '',
  police_station: '', cas_number: '', accident_description: '', injuries_summary: '', vehicle_registration: '', vehicle_model: '', other_party: '',
};
type Form = typeof EMPTY;

/** S11. Nothing is created until there is something to save, so opening the page leaves no empty drafts. */
export function NewClaimPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const needsClient = !session?.roles.includes('claimant');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [clientId, setClientId] = useState(params.get('client') ?? '');
  const [reference, setReference] = useState<string>();
  const [savedAt, setSavedAt] = useState<Date>();
  const [, setTick] = useState(0);
  const [saveError, setSaveError] = useState<string>();
  const [clientError, setClientError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const clients = useQuery({ queryKey: ['clients', 'all'], queryFn: () => api.listClients({ page: 1, pageSize: 100 }), enabled: needsClient });

  // The latest values, readable when the page unmounts (T-NAV-8).
  const latest = useRef({ form, clientId, needsClient });
  const ids = useRef<{ claim?: string; vehicle?: string; party?: string }>({});
  const dirty = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    latest.current = { form, clientId, needsClient };
  }, [form, clientId, needsClient]);

  const persist = useCallback(async (): Promise<boolean> => {
    if (saving.current) await saving.current;
    const run = async () => {
      const { form: values, clientId: client, needsClient: mustHaveClient } = latest.current;
      if (mustHaveClient && !client) return false;
      const fields: api.ClaimFields = {
        claimant_role: values.claimant_role || null,
        accident_date: values.accident_date || null,
        accident_time: values.accident_time || null,
        accident_province: values.accident_province || null,
        accident_town: values.accident_town || null,
        accident_location: values.accident_location || null,
        police_station: values.police_station || null,
        cas_number: values.cas_number || null,
        accident_description: values.accident_description || null,
        injuries_summary: values.injuries_summary || null,
      };
      try {
        dirty.current = false;
        if (ids.current.claim) {
          await api.updateClaim(ids.current.claim, fields);
        } else {
          const created = await api.createClaim({ claimantId: mustHaveClient ? client : null, fields });
          ids.current.claim = created.id;
          setReference(created.reference);
        }
        const claim = ids.current.claim;
        if (values.vehicle_registration || values.vehicle_model) {
          ids.current.vehicle = await api.saveVehicle(claim, ids.current.vehicle ?? null, { registration_number: values.vehicle_registration || null, make_model: values.vehicle_model || null });
        }
        if (values.other_party) ids.current.party = await api.saveOtherParty(claim, ids.current.party ?? null, values.other_party);
        setSavedAt(new Date());
        setSaveError(undefined);
        return true;
      } catch {
        dirty.current = true;
        setSaveError(TXT[16]);
        return false;
      }
    };
    saving.current = run();
    const result = await saving.current;
    saving.current = null;
    return result;
  }, []);

  // Auto-save after a pause in typing.
  useEffect(() => {
    if (!dirty.current) return undefined;
    const timer = window.setTimeout(() => void persist(), AUTO_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [form, clientId, persist]);

  // Save before leaving (Section 11: no silent data loss).
  useEffect(
    () => () => {
      if (dirty.current) void persist();
    },
    [persist],
  );

  // Keeps "Draft saved … ago" current.
  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const set = (key: keyof Form) => (value: string) => {
    dirty.current = true;
    setForm((current) => ({ ...current, [key]: value }));
  };

  function chooseClient(value: string) {
    dirty.current = true;
    setClientId(value);
    setClientError(undefined);
  }

  async function saveDraft() {
    if (needsClient && !clientId) {
      setClientError(TXT[4]);
      return;
    }
    setBusy(true);
    await persist();
    setBusy(false);
  }

  async function finish() {
    if (needsClient && !clientId) {
      setClientError(TXT[4]);
      setStep(0);
      return;
    }
    setBusy(true);
    const saved = await persist();
    if (saved && ids.current.claim) {
      try {
        const result = await workflow.transitionStatus({ claimId: ids.current.claim, target: 'documents_needed', reason: 'Claim details completed' });
        if (result.ok) {
          toast.show({ tone: 'success', message: fillMessage(TXT[19], { status: 'Documents Needed' }) });
          navigate(`/claims/${ids.current.claim}`, { replace: true });
          return;
        }
        setSaveError(result.code === 'missing_fields' ? fillMessage(TXT[17], { fields: (result.missing ?? []).join(', ') }) : fillMessage(TXT[20], { reason: result.reason ?? '' }).trim());
      } catch {
        setSaveError(TXT[2]);
      }
    }
    setBusy(false);
  }

  const missing = missingRequiredFields({ claimant_id: needsClient ? clientId : 'self', ...form });
  const stepItems = STEPS.map((label, index) => ({ id: label, label, status: index < step ? ('complete' as const) : index === step ? ('current' as const) : ('upcoming' as const) }));

  return (
    <div className="mx-auto max-w-content space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-primary">New claim</h1>
          {reference ? <p className="font-mono text-mono text-primary">{reference}</p> : <p className="text-small text-text-secondary">A reference is assigned when the draft is first saved.</p>}
        </div>
        <div className="flex items-center gap-3">
          {savedAt ? <span className="text-small text-text-secondary">{fillMessage(TXT[15], { time: formatAgo(savedAt) })}</span> : null}
          <Button variant="secondary" loading={busy} onClick={() => void saveDraft()}>
            Save as draft
          </Button>
        </div>
      </div>
      {saveError ? <p role="alert" className="rounded-card bg-error-tint p-3 text-body text-error">{saveError}</p> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_3fr_1fr]">
        <Card>
          <Stepper label="New claim steps" variant="wizard" steps={stepItems} />
        </Card>

        <Card title={STEPS[step]}>
          <div className="space-y-4">
            {step === 0 ? (
              <>
                {needsClient ? (
                  <Select label="Client" name="client" required placeholder="" value={clientId} options={(clients.data?.rows ?? []).map((client) => ({ value: client.claimant_id, label: client.full_name }))} onChange={chooseClient} error={clientError} />
                ) : (
                  <TextField label="Claimant" name="claimant" readOnly value={session?.displayName ?? ''} />
                )}
                <Select label="Claimant role" name="claimant_role" required helperText={REQUIRED_HELP} placeholder="" value={form.claimant_role} options={CLAIMANT_ROLES} onChange={set('claimant_role')} />
              </>
            ) : null}
            {step === 1 ? (
              <>
                <TextField label="Accident date" name="accident_date" type="date" required helperText={REQUIRED_HELP} max={new Date().toISOString().slice(0, 10)} value={form.accident_date} onChange={set('accident_date')} />
                <TextField label="Accident time" name="accident_time" type="time" value={form.accident_time} onChange={set('accident_time')} />
                <Select label="Accident province" name="accident_province" required helperText={REQUIRED_HELP} placeholder="" value={form.accident_province} options={PROVINCES} onChange={set('accident_province')} />
                <TextField label="Accident town" name="accident_town" maxLength={100} value={form.accident_town} onChange={set('accident_town')} />
                <TextField label="Street or location" name="accident_location" maxLength={300} value={form.accident_location} onChange={set('accident_location')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Police station" name="police_station" maxLength={100} value={form.police_station} onChange={set('police_station')} />
                  <TextField label="CAS number" name="cas_number" maxLength={50} value={form.cas_number} onChange={set('cas_number')} />
                </div>
                <Textarea label="Description of the accident" name="accident_description" required helperText={REQUIRED_HELP} maxLength={4000} value={form.accident_description} onChange={set('accident_description')} />
              </>
            ) : null}
            {step === 2 ? <Textarea label="Injuries" name="injuries_summary" maxLength={2000} value={form.injuries_summary} onChange={set('injuries_summary')} /> : null}
            {step === 3 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Registration number" name="registration" maxLength={20} value={form.vehicle_registration} onChange={set('vehicle_registration')} />
                <TextField label="Make and model" name="make_model" maxLength={100} value={form.vehicle_model} onChange={set('vehicle_model')} />
              </div>
            ) : null}
            {step === 4 ? <TextField label="Other party" name="other_party" maxLength={200} value={form.other_party} onChange={set('other_party')} /> : null}
            {step === 5 ? <p className="text-body text-text-secondary">Check your details, then continue to add your documents.</p> : null}
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button loading={busy} disabled={missing.length > 0} onClick={() => void finish()}>
                Continue to documents
              </Button>
            )}
          </div>
        </Card>

        <Card title="Draft readiness preview">
          {missing.length ? (
            <ul className="space-y-1 text-small text-text-secondary">
              {missing.map((field) => (
                <li key={field}>{REQUIRED_FIELD_LABELS[field]}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-small text-text-secondary">Saving a draft does not mark your claim as ready.</p>
        </Card>
      </div>
    </div>
  );
}
