import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { DataTable, Pagination, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/claims/api';
import { maskIdNumber } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { requiredError } from '@/lib/format/validation';

const PAGE_SIZE = 20;
const BLANK: api.NewClientInput = { firstName: '', surname: '', idNumber: '', dateOfBirth: '', email: '', mobile: '', assignedLawyer: '', mandateStatus: 'pending' };

function AddClientDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<{ firstName?: string; surname?: string }>({});
  const lawyers = useQuery({ queryKey: ['firm-lawyers'], queryFn: api.getFirmLawyers, enabled: open });
  const set = (key: keyof api.NewClientInput) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: () => api.addClient(form),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[22] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      setForm(BLANK);
      onClose();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = { firstName: requiredError(form.firstName), surname: requiredError(form.surname) };
    setErrors(next);
    if (!next.firstName && !next.surname) save.mutate();
  }

  return (
    <Drawer open={open} title="Add client" onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <TextField label="First name" name="first_name" required maxLength={100} value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
        <TextField label="Surname" name="surname" required maxLength={100} value={form.surname} onChange={set('surname')} error={errors.surname} />
        <TextField label="ID number" name="id_number" maxLength={20} value={form.idNumber} onChange={set('idNumber')} />
        <TextField label="Date of birth" name="date_of_birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        <TextField label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
        <TextField label="Mobile" name="mobile" type="tel" maxLength={20} value={form.mobile} onChange={set('mobile')} />
        <Select label="Assigned attorney" name="assigned_lawyer" placeholder="" value={form.assignedLawyer} options={(lawyers.data ?? []).map((lawyer) => ({ value: lawyer.profile_id, label: lawyer.display_name }))} onChange={set('assignedLawyer')} />
        <Select label="Mandate status" name="mandate_status" value={form.mandateStatus} options={[{ value: 'pending', label: 'Mandate pending' }, { value: 'on_file', label: 'Mandate on file' }]} onChange={set('mandateStatus')} />
        <Button type="submit" loading={save.isPending}>
          Save client
        </Button>
      </form>
    </Drawer>
  );
}

/** S27. */
export function ClientsPage() {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const query = useQuery({ queryKey: ['clients', page], queryFn: () => api.listClients({ page, pageSize: PAGE_SIZE }) });

  const columns: DataTableColumn<api.ClientRow>[] = [
    { key: 'client', header: 'Client', render: (row) => <Link to={`/lawyer/clients/${row.claimant_id}`} className="font-medium text-accent hover:underline">{row.full_name}</Link> },
    { key: 'id', header: 'ID number', render: (row) => <span className="font-mono text-mono">{maskIdNumber(row.id_number)}</span> },
    { key: 'contact', header: 'Contact', render: (row) => row.email ?? row.mobile ?? '—' },
    { key: 'claims', header: 'Claims', render: (row) => row.claim_count },
    { key: 'mandate', header: 'Mandate', render: (row) => (row.mandate_status === 'on_file' ? 'Mandate on file' : 'Mandate pending') },
  ];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-primary">Clients</h1>
        <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setAdding(true)}>
          Add client
        </Button>
      </div>
      <p className="flex items-center gap-2 rounded-card bg-surface-muted p-4 text-body font-medium text-primary">
        <ShieldCheck aria-hidden className="size-icon text-accent" />
        You can only see clients linked to your firm.
      </p>
      <DataTable
        caption="Clients"
        columns={columns}
        rows={query.data?.rows ?? []}
        getRowId={(row) => row.claimant_id}
        getRowLabel={(row) => row.full_name}
        status={query.isPending ? 'loading' : query.isError ? 'error' : 'ready'}
        onRetry={() => void query.refetch()}
        empty={<EmptyState icon={Users} message={TXT[57]} action={{ label: 'Add client', onClick: () => setAdding(true) }} />}
      />
      {query.data && query.data.total > 0 ? <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
      <AddClientDrawer open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
