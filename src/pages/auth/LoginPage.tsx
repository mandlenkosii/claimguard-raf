import { CircleAlert, FileSearch, History, Info, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useOnlineStatus } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { PasswordField } from '@/components/ui/PasswordField';
import * as api from '@/features/auth/api';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ROLE_LABELS, type RoleKey } from '@/lib/access/roles';
import { DEMO_NOTICE, SIGN_IN_ERROR, TXT } from '@/lib/format/messages';
import { emailError, requiredError } from '@/lib/format/validation';

const POINTS = [
  { icon: Users, title: 'Role-based access', text: 'You only see the information you are authorised to view.' },
  { icon: FileSearch, title: 'Explained issues', text: 'Every important warning includes a reason and supporting evidence.' },
  { icon: History, title: 'Recorded history', text: 'Important actions, decisions and status changes are recorded.' },
];

const DEMO_ROLES: Array<{ role: RoleKey; name: string }> = [
  { role: 'claimant', name: 'Thandiwe Mokoena' },
  { role: 'lawyer', name: 'Lindiwe Nkosi' },
  { role: 'raf_officer', name: 'Demo RAF Officer' },
  { role: 'investigator', name: 'Ayesha Patel' },
  { role: 'manager', name: 'Demo Manager' },
  { role: 'admin', name: 'Demo Administrator' },
];

/** S05 Sign in. */
export function LoginPage() {
  const online = useOnlineStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const showDemo = import.meta.env.VITE_APP_ENV !== 'production';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = { email: emailError(email), password: requiredError(password) };
    setErrors(next);
    setFormError(undefined);
    if (next.email || next.password) return;
    setBusy(true);
    const result = await api.signIn(email.trim(), password);
    setBusy(false);
    if (!result.ok) setFormError(result.reason === 'invalid' ? SIGN_IN_ERROR : result.reason === 'rate_limited' ? TXT[56] : TXT[2]);
  }

  async function onDemo(role: RoleKey) {
    setFormError(undefined);
    setBusy(true);
    const result = await api.demoSignIn(role);
    setBusy(false);
    if (!result.ok) setFormError(TXT[2]);
  }

  return (
    <AuthLayout headline="Find and resolve claim-information problems earlier." text="A secure, explainable and auditable platform for claimants, legal practitioners and Road Accident Fund staff." points={POINTS}>
      <h1 className="text-h1 text-primary">Sign in</h1>
      <p className="mt-2 text-body text-text-secondary">Enter your email and password to access your account.</p>

      {formError ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-card bg-error-tint p-3 text-body text-error">
          <CircleAlert aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
          {formError}
        </p>
      ) : null}

      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-4">
        <TextField label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={setEmail} error={errors.email} />
        <PasswordField label="Password" name="password" required value={password} onChange={setPassword} error={errors.password} />
        <Link to="/reset-password" className="inline-block text-body font-semibold text-accent hover:underline">
          Forgot password?
        </Link>
        <Button type="submit" loading={busy} disabled={!online} className="w-full">
          Sign in
        </Button>
      </form>

      {showDemo ? (
        <section className="mt-6 border-t border-border pt-6">
          <h2 className="text-body font-semibold text-text">Demo accounts (simulation only)</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_ROLES.map(({ role, name }) => (
              <button
                key={role}
                type="button"
                data-testid="demo-role"
                disabled={busy || !online}
                onClick={() => void onDemo(role)}
                className="rounded-input bg-surface-muted p-2 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                <span className="block text-small font-semibold text-primary">{ROLE_LABELS[role]}</span>
                <span className="block font-mono text-small text-text-secondary">{name}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-small text-text-secondary">
            <Info aria-hidden className="mt-0.5 size-icon-sm shrink-0" />
            {DEMO_NOTICE}
          </p>
        </section>
      ) : null}

      <p className="mt-6 text-center text-body text-text-secondary">
        New claimant?{' '}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
