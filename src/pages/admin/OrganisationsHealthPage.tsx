import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { useState } from 'react';
import { StateChip } from '@/components/domain/StateChip';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/admin/api';
import { cn } from '@/lib/cn';
import { DEMONSTRATION_DATA_LABEL, TXT } from '@/lib/format/messages';

const TYPE_LABELS: Record<string, string> = { law_firm: 'Law firm', raf: 'RAF', other: 'Other' };
const TYPES = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const HEALTH_STYLES: Record<api.HealthStatus, string> = { Operational: 'bg-success-tint text-success', Degraded: 'bg-warning-tint text-warning', Down: 'bg-error-tint text-error' };

function OrganisationDrawer({ organisation, onClose, onSaved }: { organisation: api.Organisation | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(organisation?.name ?? '');
  const [type, setType] = useState(organisation?.type ?? '');
  const [registration, setRegistration] = useState(organisation?.registration_number ?? '');
  const [status, setStatus] = useState(organisation?.status ?? 'active');
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});
  const save = useMutation({
    mutationFn: () => api.saveOrganisation({ id: organisation?.id ?? null, name: name.trim(), type, registrationNumber: registration.trim() || null, status }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[42] });
      onSaved();
      onClose();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  function submit() {
    const found = { name: name.trim() ? undefined : TXT[4], type: type ? undefined : TXT[4] };
    setErrors(found);
    if (!found.name && !found.type) save.mutate();
  }

  return (
    <Drawer
      open
      title={organisation ? 'Edit organisation' : 'Add organisation'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={save.isPending} onClick={submit}>
            Save organisation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" name="name" required maxLength={200} value={name} onChange={setName} error={errors.name} />
        <Select label="Type" name="type" required placeholder="" options={TYPES} value={type} onChange={setType} error={errors.type} />
        <TextField label="Registration number (optional)" name="registration" maxLength={50} value={registration} onChange={setRegistration} />
        <Select label="Organisation status" name="status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} value={status} onChange={setStatus} />
      </div>
    </Drawer>
  );
}

function SystemHealth() {
  const health = useQuery({ queryKey: ['system-health'], queryFn: api.checkHealth });
  if (health.isPending) return <Skeleton variant="card" />;
  if (health.isError) return <ErrorState onRetry={() => void health.refetch()} />;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {health.data.map((item) => (
          <div key={item.service} data-testid={`health-${item.service}`} className="rounded-card border border-border bg-surface p-4 shadow-card">
            <p className="text-body font-medium text-text">{item.service}</p>
            <span className={cn('mt-2 inline-flex rounded-chip px-2 text-small font-semibold', HEALTH_STYLES[item.status])}>{item.status}</span>
          </div>
        ))}
      </div>
      <p className="inline-flex rounded-chip bg-surface-muted px-2 py-0.5 text-small text-text-secondary">{DEMONSTRATION_DATA_LABEL}</p>
    </div>
  );
}

/** S43. */
export function OrganisationsHealthPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('organisations');
  const [editing, setEditing] = useState<api.Organisation | 'new' | null>(null);
  const organisations = useQuery({ queryKey: ['organisations'], queryFn: api.getOrganisations });

  const columns: DataTableColumn<api.Organisation>[] = [
    { key: 'name', header: 'Organisation', render: (row) => row.name },
    { key: 'type', header: 'Type', render: (row) => TYPE_LABELS[row.type] ?? row.type },
    { key: 'registration', header: 'Registration number', render: (row) => row.registration_number ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <StateChip kind="account" state={row.status === 'active' ? 'active' : 'disabled'} /> },
  ];

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-primary">Organisations and system health</h1>
        {tab === 'organisations' ? (
          <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setEditing('new')}>
            Add organisation
          </Button>
        ) : null}
      </div>
      <Tabs label="Organisations and system health" idPrefix="admin-orgs" tabs={[{ id: 'organisations', label: 'Organisations' }, { id: 'health', label: 'System health' }]} activeId={tab} onChange={setTab} />
      <div role="tabpanel" id={`admin-orgs-panel-${tab}`} aria-labelledby={`admin-orgs-tab-${tab}`}>
      {tab === 'organisations' ? (
        <DataTable
          caption="Organisations"
          columns={columns}
          rows={organisations.data ?? []}
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.name}
          status={organisations.isPending ? 'loading' : organisations.isError ? 'error' : 'ready'}
          onRetry={() => void organisations.refetch()}
          empty={<EmptyState icon={Building2} message={TXT[59]} />}
          renderActions={(row) => (
            <Button variant="secondary" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>
              Edit
            </Button>
          )}
        />
      ) : (
        <SystemHealth />
      )}
      </div>
      {editing ? <OrganisationDrawer key={editing === 'new' ? 'new' : editing.id} organisation={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['organisations'] })} /> : null}
    </div>
  );
}

