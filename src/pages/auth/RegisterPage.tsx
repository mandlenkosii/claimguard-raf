import { CircleAlert, FileSearch, History, Mail, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, SegmentedControl } from '@/components/ui/Choice';
import { PasswordField } from '@/components/ui/PasswordField';
import { useOnlineStatus } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import * as api from '@/features/auth/api';
import { AuthLayout } from '@/layouts/AuthLayout';
import { POPIA_CONSENT, TXT } from '@/lib/format/messages';
import { confirmError, emailError, passwordError, requiredError } from '@/lib/format/validation';

const POINTS = [
  { icon: Users, title: 'Role-based access', text: 'You only see the information you are authorised to view.' },
  { icon: FileSearch, title: 'Explained issues', text: 'Every important warning includes a reason and supporting evidence.' },
  { icon: History, title: 'Recorded history', text: 'Important actions, decisions and status changes are recorded.' },
];

type Errors = Partial<Record<'firstName' | 'surname' | 'email' | 'firmName' | 'practiceNumber' | 'password' | 'confirm' | 'consent', string>>;

/** S06 Register. */
export function RegisterPage() {
  const online = useOnlineStatus();
  const [accountType, setAccountType] = useState<'claimant' | 'legal_practitioner'>('claimant');
  const [form, setForm] = useState({ firstName: '', surname: '', email: '', mobile: '', firmName: '', practiceNumber: '', password: '', confirm: '' });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const legal = accountType === 'legal_practitioner';
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      firstName: requiredError(form.firstName),
      surname: requiredError(form.surname),
      email: emailError(form.email),
      firmName: legal ? requiredError(form.firmName) : undefined,
      practiceNumber: legal ? requiredError(form.practiceNumber) : undefined,
      password: passwordError(form.password),
      confirm: confirmError(form.password, form.confirm),
      consent: consent ? undefined : TXT[8],
    };
    setErrors(next);
    setFormError(undefined);
    if (Object.values(next).some(Boolean)) return;

    setBusy(true);
    const result = await api.signUp({
      accountType,
      firstName: form.firstName.trim(),
      surname: form.surname.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      password: form.password,
      ...(legal ? { firmName: form.firmName.trim(), practiceNumber: form.practiceNumber.trim() } : {}),
    });
    setBusy(false);
    if (!result.ok) setFormError(result.reason === 'rate_limited' ? TXT[56] : TXT[2]);
    else if (!result.hasSession) setDone(true);
  }

  return (
    <AuthLayout headline="Find and resolve claim-information problems earlier." text="A secure, explainable and auditable platform for claimants, legal practitioners and Road Accident Fund staff." points={POINTS}>
      {done ? (
        <>
          <h1 className="text-h1 text-primary">Create your account</h1>
          <p role="status" className="mt-4 flex items-start gap-2 rounded-card bg-success-tint p-3 text-body text-success">
            <Mail aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
            {TXT[9]}
          </p>
          <ButtonLink to="/login" variant="secondary" className="mt-4 w-full">
            Sign in
          </ButtonLink>
        </>
      ) : (
        <>
          <h1 className="text-h1 text-primary">Create your account</h1>
          <p className="mt-2 text-body text-text-secondary">Register as a claimant or legal practitioner.</p>
          {formError ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-error-tint p-3 text-body text-error">
              <CircleAlert aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
              {formError}
            </p>
          ) : null}
          <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-4">
            <div>
              <p className="mb-1 text-body font-medium text-text">Account type</p>
              <SegmentedControl
                label="Account type"
                fullWidth
                value={accountType}
                options={[
                  { value: 'claimant', label: 'Claimant' },
                  { value: 'legal_practitioner', label: 'Legal practitioner' },
                ]}
                onChange={(value) => setAccountType(value as typeof accountType)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="First name" name="first_name" required maxLength={100} value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
              <TextField label="Surname" name="surname" required maxLength={100} value={form.surname} onChange={set('surname')} error={errors.surname} />
            </div>
            <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
            <TextField label="Mobile" name="mobile" type="tel" autoComplete="tel" maxLength={20} value={form.mobile} onChange={set('mobile')} />
            {legal ? (
              <>
                <TextField label="Firm name" name="firm_name" required maxLength={200} value={form.firmName} onChange={set('firmName')} error={errors.firmName} />
                <TextField label="Practice number" name="practice_number" required maxLength={50} value={form.practiceNumber} onChange={set('practiceNumber')} error={errors.practiceNumber} />
              </>
            ) : null}
            <PasswordField label="Password" name="password" required autoComplete="new-password" showRequirements value={form.password} onChange={set('password')} error={errors.password} />
            <PasswordField label="Confirm password" name="confirm_password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
            <Checkbox label={POPIA_CONSENT} checked={consent} onChange={setConsent} error={errors.consent} />
            <Button type="submit" loading={busy} disabled={!online} className="w-full">
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-body text-text-secondary">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
