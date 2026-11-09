import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PermissionMatrix } from '@/components/domain/PermissionMatrix';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { getPermissionMatrix } from '@/features/admin/api';
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/access/roles';

/** S40: view only until Phase 15 (Section 18 #32). */
export function RolesPage() {
  const matrix = useQuery({ queryKey: ['permission-matrix'], queryFn: getPermissionMatrix });
  const [role, setRole] = useState<string>('claimant');
  const held = (matrix.data?.grants ?? []).filter((grant) => grant.role_key === role && grant.scope !== 'no');

  return (
    <div className="mx-auto max-w-content space-y-4">
      <OfflineBanner />
      <h1 className="text-h1 text-primary">Roles and permissions</h1>
      <p className="flex items-center gap-2 rounded-card border border-info bg-info-tint p-3 text-body font-medium text-info">
        <ShieldCheck aria-hidden className="size-icon shrink-0" />
        Permissions are enforced on the server and database, not only in the interface.
      </p>
      {matrix.isPending ? <Skeleton variant="card" /> : null}
      {matrix.isError ? <ErrorState onRetry={() => void matrix.refetch()} /> : null}
      {matrix.data ? (
        <div className="grid items-start gap-6 xl:grid-cols-[3fr_1fr]">
          <PermissionMatrix matrix={matrix.data} />
          <Card title="Selected role">
            <Select label="Selected role" hideLabel name="selected-role" options={ROLE_ORDER.map((key) => ({ value: key, label: ROLE_LABELS[key] }))} value={role} onChange={setRole} />
            <ul data-testid="selected-role" className="mt-3 space-y-2 text-small text-text">
              {held.map((grant) => (
                <li key={grant.permission_key}>{matrix.data.permissions.find((permission) => permission.key === grant.permission_key)?.description ?? grant.permission_key}</li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
