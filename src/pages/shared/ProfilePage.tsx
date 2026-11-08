import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth, type AuthSession } from '@/app/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RadioGroup } from '@/components/ui/Choice';
import { PasswordField } from '@/components/ui/PasswordField';
import { Select } from '@/components/ui/Select';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/auth/api';
import { ROLE_LABELS } from '@/lib/access/roles';
import { READ_ONLY_TIP, TXT } from '@/lib/format/messages';
import { confirmError, passwordError, requiredError } from '@/lib/format/validation';

const LANGUAGES = ['English', 'Afrikaans', 'isiNdebele', 'isiXhosa', 'isiZulu', 'Sepedi', 'Sesotho', 'Setswana', 'siSwati', 'Tshivenda', 'Xitsonga'];

function DetailsForm({ profile, userId }: { profile: api.MyProfile; userId: string }) {
  const toast = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(profile.first_name);
  const [surname, setSurname] = useState(profile.surname);
  const [mobile, setMobile] = useState(profile.mobile ?? '');
  const [language, setLanguage] = useState(profile.preferred_language ?? '');
  const [contact, setContact] = useState<string>(profile.preferred_contact_method ?? '');
  const [errors, setErrors] = useState<{ firstName?: string; surname?: string }>({});

  const save = useMutation({
    mutationFn: () =>
      api.updateMyProfile(userId, {
        first_name: firstName.trim(),
        surname: surname.trim(),
        mobile: mobile.trim() || null,
        preferred_language: language || null,
        preferred_contact_method: (contact || null) as api.ProfileUpdate['preferred_contact_method'],
      }),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.show({ tone: 'error', message: TXT[2] });
        return;
      }
      toast.show({ tone: 'success', message: TXT[13] });
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      await refresh();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = { firstName: requiredError(firstName), surname: requiredError(surname) };
    setErrors(next);
    if (!next.firstName && !next.surname) save.mutate();
  }

  return (
    <Card title="Personal details">
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" name="first_name" required maxLength={100} value={firstName} onChange={setFirstName} error={errors.firstName} />
          <TextField label="Surname" name="surname" required maxLength={100} value={surname} onChange={setSurname} error={errors.surname} />
        </div>
        <TextField label="Mobile" name="mobile" type="tel" maxLength={20} value={mobile} onChange={setMobile} />
        <Select label="Preferred language" name="preferred_language" value={language} placeholder="" options={LANGUAGES.map((value) => ({ value, label: value }))} onChange={setLanguage} />
        <RadioGroup
          legend="Preferred contact method"
          name="preferred_contact_method"
          value={contact}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'phone', label: 'Phone' },
          ]}
          onChange={setContact}
        />
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

function SecurityCard() {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState<'password' | 'sessions'>();

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    const next = { password: passwordError(password), confirm: confirmError(password, confirm) };
    setErrors(next);
    if (next.password || next.confirm) return;
    setBusy('password');
    const result = await api.updatePassword(password);
    setBusy(undefined);
    toast.show(result.ok ? { tone: 'success', message: TXT[13] } : { tone: 'error', message: TXT[2] });
    if (result.ok) {
      setPassword('');
      setConfirm('');
    }
  }

  async function signOutOthers() {
    setBusy('sessions');
    const result = await api.signOutOtherSessions();
    setBusy(undefined);
    toast.show(result.ok ? { tone: 'success', message: TXT[14] } : { tone: 'error', message: TXT[2] });
  }

  return (
    <Card title="Security">
      <form noValidate onSubmit={(event) => void changePassword(event)} className="space-y-4">
        <PasswordField label="New password" name="new_password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} />
        <PasswordField label="Confirm new password" name="confirm_new_password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" variant="secondary" loading={busy === 'password'}>
          Change password
        </Button>
      </form>
      <h3 className="mt-6 text-body font-medium text-text">Active sessions</h3>
      <div className="mt-3 flex items-center gap-3 rounded-card bg-surface-muted p-3">
        <Monitor aria-hidden className="size-icon text-text-secondary" />
        <div>
          <p className="text-body font-semibold text-text">This device</p>
          <p className="text-small text-text-secondary">Current session</p>
        </div>
      </div>
      <Button variant="secondary" className="mt-4" loading={busy === 'sessions'} onClick={() => void signOutOthers()}>
        Sign out of other sessions
      </Button>
    </Card>
  );
}

function ProfileContent({ session }: { session: AuthSession }) {
  const query = useQuery({ queryKey: ['profile', session.userId], queryFn: () => api.getMyProfile(session.userId) });

  if (query.isPending) return <Skeleton variant="card" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <DetailsForm key={query.dataUpdatedAt} profile={query.data} userId={session.userId} />
      <div className="grid gap-6">
        <Card title="Account">
          <div className="space-y-4">
            <TextField label="Email" name="email" readOnly readOnlyReason={READ_ONLY_TIP} value={query.data.email} />
            <TextField label="Role" name="role" readOnly readOnlyReason={READ_ONLY_TIP} value={session.roles.map((role) => ROLE_LABELS[role]).join(', ')} />
          </div>
        </Card>
        <SecurityCard />
      </div>
    </div>
  );
}

/** S13 Profile and settings. */
export function ProfilePage() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <div className="mx-auto max-w-content">
      <h1 className="text-h1 text-primary">Profile &amp; settings</h1>
      <p className="mb-6 text-body text-text-secondary">Manage your personal details and account security.</p>
      <ProfileContent session={session} />
    </div>
  );
}

