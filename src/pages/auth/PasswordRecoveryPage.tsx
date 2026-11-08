import { CircleAlert, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { useOnlineStatus } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/auth/api';
import { AuthLayout } from '@/layouts/AuthLayout';
import { initialHash } from '@/lib/initialHash';
import { PASSWORD_UPDATED, RESET_CONFIRMATION, TXT } from '@/lib/format/messages';
import { confirmError, emailError, passwordError } from '@/lib/format/validation';

const POINTS = [
  { icon: Mail, title: 'Sent by email', text: 'Open the reset link from your inbox to choose a new password.' },
  { icon: Lock, title: 'Private by design', text: 'Users access only information they are authorised to view.' },
];

const backToSignIn = (
  <p className="mt-4 text-center">
    <Link to="/login" className="text-body font-semibold text-accent hover:underline">
      Back to sign in
    </Link>
  </p>
);

function RequestForm() {
  const online = useOnlineStatus();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = emailError(email);
    setError(problem);
    if (problem) return;
    setBusy(true);
    await api.requestPasswordReset(email.trim());
    setBusy(false);
    // Always the same message, so it never reveals whether the account exists (OP4).
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="text-h1 text-primary">Reset your password</h1>
        <p role="status" className="mt-4 flex items-start gap-2 rounded-card bg-surface-muted p-3 text-body text-primary">
          <Mail aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
          {RESET_CONFIRMATION}
        </p>
        {backToSignIn}
      </>
    );
  }

  return (
    <>
      <h1 className="text-h1 text-primary">Reset your password</h1>
      <p className="mt-2 text-body text-text-secondary">Enter your email address and we will send you a reset link.</p>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-4">
        <TextField label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={setEmail} error={error} />
        <Button type="submit" loading={busy} disabled={!online} className="w-full">
          Send reset link
        </Button>
      </form>
      {backToSignIn}
    </>
  );
}

function SetNewPassword() {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = { password: passwordError(password), confirm: confirmError(password, confirm) };
    setErrors(next);
    setFormError(undefined);
    if (next.password || next.confirm) return;
    setBusy(true);
    const result = await api.updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setFormError(TXT[2]);
      return;
    }
    await api.signOut();
    toast.show({ tone: 'success', message: PASSWORD_UPDATED });
    navigate('/login', { replace: true });
  }

  return (
    <>
      <h1 className="text-h1 text-primary">Choose a new password</h1>
      {formError ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-error-tint p-3 text-body text-error">
          <CircleAlert aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
          {formError}
        </p>
      ) : null}
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-4">
        <PasswordField label="New password" name="password" required autoComplete="new-password" showRequirements value={password} onChange={setPassword} error={errors.password} />
        <PasswordField label="Confirm new password" name="confirm_password" required autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" loading={busy} disabled={!online} className="w-full">
          Update password
        </Button>
      </form>
    </>
  );
}

/** S07 Password recovery. */
export function PasswordRecoveryPage() {
  const [hash] = useState(() => window.location.hash || initialHash);
  const expired = hash.includes('error_code=') || hash.includes('error=');
  const recovery = hash.includes('type=recovery');

  return (
    <AuthLayout headline="Regain access to your account securely." text="Reset links are sent only by email. The confirmation never reveals whether an account exists." points={POINTS}>
      {expired ? (
        <>
          <h1 className="text-h1 text-primary">Reset your password</h1>
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-error-tint p-3 text-body text-error">
            <CircleAlert aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
            {TXT[10]}
          </p>
          <ButtonLink to="/reset-password" reloadDocument variant="secondary" className="mt-4 w-full">
            Send reset link
          </ButtonLink>
        </>
      ) : recovery ? (
        <SetNewPassword />
      ) : (
        <RequestForm />
      )}
    </AuthLayout>
  );
}
