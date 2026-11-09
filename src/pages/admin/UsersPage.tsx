import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldAlert, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/auth';
import { StateChip } from '@/components/domain/StateChip';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Choice';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { Drawer } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { EmptyState, OfflineBanner } from '@/components/ui/States';
import { Textarea, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/admin/api';
import { ROLE_LABELS, ROLE_ORDER, type RoleKey } from '@/lib/access/roles';
import { formatDate } from '@/lib/format/dates';
import { fillMessage, RESET_CONFIRMATION, TXT } from '@/lib/format/messages';
import { emailError } from '@/lib/format/validation';

const PAGE_SIZE = 20;
const SELF_NOTE = 'Admins cannot assign roles to themselves.';
const NO_FILTERS: api.UserFilters = { role: '', organisation: '', status: '', search: '' };
const STATUS_LABELS: Record<string, string> = { active: 'Active', invited: 'Invited', suspended: 'Suspended', disabled: 'Disabled' };
const ROLE_OPTIONS = ROLE_ORDER.map((key) => ({ value: key, label: ROLE_LABELS[key] }));
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

function RolePicker({ value, onChange, disabled, roles = ROLE_ORDER }: { value: string[]; onChange: (roles: string[]) => void; disabled?: boolean; roles?: readonly RoleKey[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-body font-medium text-text">Roles</legend>
      {roles.map((role) => (
        <Checkbox key={role} label={ROLE_LABELS[role]} disabled={disabled} checked={value.includes(role)} onChange={(checked) => onChange(checked ? [...value, role] : value.filter((item) => item !== role))} />
      ))}
    </fieldset>
  );
}

function InviteDrawer({ organisations, onClose, onDone }: { organisations: api.Organisation[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [organisation, setOrganisation] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'firstName' | 'surname' | 'roles' | 'reason', string>>>({});
  const invite = useMutation({
    mutationFn: () => api.inviteUser({ email: email.trim(), firstName: firstName.trim(), surname: surname.trim(), roles, organisationId: organisation || null, reason: reason.trim() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[39] });
      onDone();
      onClose();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function submit() {
    const found = {
      email: emailError(email),
      firstName: firstName.trim() ? undefined : TXT[4],
      surname: surname.trim() ? undefined : TXT[4],
      roles: roles.length ? undefined : TXT[4],
      reason: reason.trim() ? undefined : TXT[18],
    };
    setErrors(found);
    if (!Object.values(found).some(Boolean)) invite.mutate();
  }

  return (
    <Drawer
      open
      title="Invite user"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={invite.isPending} disabled={invite.isPending} onClick={submit}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Email" name="email" type="email" required value={email} onChange={setEmail} error={errors.email} />
        <TextField label="First name" name="first-name" required value={firstName} onChange={setFirstName} error={errors.firstName} />
        <TextField label="Surname" name="surname" required value={surname} onChange={setSurname} error={errors.surname} />
        <RolePicker value={roles} onChange={setRoles} roles={ROLE_ORDER.filter((role) => role !== 'claimant')} />
        {errors.roles ? <p className="text-small text-error">{errors.roles}</p> : null}
        <Select label="Organisation (optional)" name="organisation" placeholder="" options={organisations.map((item) => ({ value: item.id, label: item.name }))} value={organisation} onChange={setOrganisation} />
        <Textarea label="Reason" name="reason" required rows={2} maxLength={500} value={reason} onChange={setReason} error={errors.reason} />
      </div>
    </Drawer>
  );
}

function EditDrawer({ user, self, onClose, onDone }: { user: api.AdminUser; self: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [roles, setRoles] = useState(user.roles);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const failed = () => toast.show({ tone: 'error', message: TXT[2] });
  const saveRoles = useMutation({
    mutationFn: () => api.setUserRoles({ userId: user.id, roles, reason: reason.trim() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[40] });
      onDone();
      onClose();
    },
    onError: failed,
  });
  const changeStatus = useMutation({
    mutationFn: (status: string) => api.setAccountStatus({ userId: user.id, status, reason: reason.trim() }),
    onSuccess: (_, status) => {
      toast.show({ tone: 'success', message: fillMessage(TXT[41], { status: STATUS_LABELS[status] ?? status }) });
      onDone();
      onClose();
    },
    onError: failed,
  });
  const reset = useMutation({
    mutationFn: () => api.sendPasswordReset(user.email),
    onSuccess: () => toast.show({ tone: 'success', message: RESET_CONFIRMATION }),
    onError: failed,
  });

  const withReason = (action: () => void) => {
    if (!reason.trim()) {
      setError(TXT[18]);
      return;
    }
    setError('');
    action();
  };
  const busy = saveRoles.isPending || changeStatus.isPending;

  return (
    <Drawer
      open
      title={`Edit ${user.name}`}
      description={user.email}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saveRoles.isPending} disabled={self || busy} onClick={() => withReason(() => saveRoles.mutate())}>
            Save roles
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {self ? <p className="rounded-input bg-warning-tint p-3 text-small font-medium text-warning">{SELF_NOTE}</p> : null}
        <RolePicker value={roles} onChange={setRoles} disabled={self} />
        <Textarea label="Reason" name="reason" required rows={2} maxLength={500} value={reason} onChange={setReason} error={error} />
        {!self ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {user.account_status === 'active' ? (
              <Button variant="danger" disabled={busy} onClick={() => withReason(() => changeStatus.mutate('suspended'))}>
                Suspend
              </Button>
            ) : (
              <Button variant="secondary" disabled={busy} onClick={() => withReason(() => changeStatus.mutate('active'))}>
                {user.account_status === 'invited' ? 'Activate' : 'Re-enable'}
              </Button>
            )}
            {user.account_status !== 'disabled' ? (
              <Button variant="danger" disabled={busy} onClick={() => withReason(() => changeStatus.mutate('disabled'))}>
                Disable
              </Button>
            ) : null}
            <Button variant="ghost" disabled={reset.isPending} onClick={() => reset.mutate()}>
              Reset access
            </Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/** S39. */
export function UsersPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<api.AdminUser | null>(null);
  const users = useQuery({ queryKey: ['admin-users', filters, page], queryFn: () => api.listUsers(filters, page, PAGE_SIZE) });
  const organisations = useQuery({ queryKey: ['organisations'], queryFn: api.getOrganisations });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const setFilter = (key: keyof api.UserFilters) => (value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const columns: DataTableColumn<api.AdminUser>[] = [
    { key: 'user', header: 'User', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'roles', header: 'Roles', render: (row) => row.roles.map((role) => ROLE_LABELS[role as RoleKey] ?? role).join(', ') || '—' },
    { key: 'organisation', header: 'Organisation', render: (row) => row.organisation ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StateChip kind="account" state={row.account_status} /> },
    { key: 'sign-in', header: 'Last sign-in', render: (row) => (row.last_sign_in_at ? formatDate(row.last_sign_in_at) : '—') },
    { key: 'mfa', header: 'MFA', render: (row) => (row.mfa ? 'On' : 'Off') },
  ];
  const counts = users.data?.counts;

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-primary">Users</h1>
        <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setInviting(true)}>
          Invite user
        </Button>
      </div>
      <p className="flex items-center gap-2 rounded-card border border-info bg-info-tint p-3 text-body font-medium text-info">
        <ShieldAlert aria-hidden className="size-icon shrink-0" />
        Administrative access does not grant access to claim content.
      </p>
      {counts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active" value={counts.active} />
          <KpiCard label="Invited" value={counts.invited} />
          <KpiCard label="Suspended" value={counts.suspended} />
          <KpiCard label="Disabled" value={counts.disabled} />
        </div>
      ) : null}
      <FilterBar
        search={{ label: 'Search users', value: filters.search, onChange: setFilter('search'), placeholder: 'Search by name or email' }}
        selects={[
          { label: 'Role', value: filters.role, onChange: setFilter('role'), options: ROLE_OPTIONS },
          { label: 'Organisation', value: filters.organisation, onChange: setFilter('organisation'), options: (organisations.data ?? []).map((item) => ({ value: item.id, label: item.name })) },
          { label: 'Status', value: filters.status, onChange: setFilter('status'), options: STATUS_OPTIONS },
        ]}
        onClear={() => {
          setFilters(NO_FILTERS);
          setPage(1);
        }}
      />
      <DataTable
        caption="Users"
        columns={columns}
        rows={users.data?.rows ?? []}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        status={users.isPending ? 'loading' : users.isError ? 'error' : 'ready'}
        onRetry={() => void users.refetch()}
        empty={<EmptyState icon={Users} message={TXT[59]} />}
        renderActions={(row) => (
          <Button variant="secondary" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>
            Edit
          </Button>
        )}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={users.data?.total ?? 0} onPageChange={setPage} />
      {inviting ? <InviteDrawer organisations={organisations.data ?? []} onClose={() => setInviting(false)} onDone={refresh} /> : null}
      {editing ? <EditDrawer key={editing.id} user={editing} self={editing.id === session?.userId} onClose={() => setEditing(null)} onDone={refresh} /> : null}
    </div>
  );
}
