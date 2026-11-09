import type { PermissionMatrixData } from '@/features/admin/api';
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/access/roles';
import { cn } from '@/lib/cn';

const label = (scope: string) => scope[0]!.toUpperCase() + scope.slice(1);

/** S40. Every cell is written out; colour only supports it. */
export function PermissionMatrix({ matrix }: { matrix: PermissionMatrixData }) {
  const scopeOf = (role: string, permission: string) => matrix.grants.find((grant) => grant.role_key === role && grant.permission_key === permission)?.scope ?? 'no';
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">Permission matrix</caption>
        <thead className="bg-surface-muted">
          <tr>
            {['Capability', ...ROLE_ORDER.map((role) => ROLE_LABELS[role])].map((header) => (
              <th key={header} scope="col" className="px-4 py-3 text-left text-label uppercase text-text-secondary">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.permissions.map((permission) => (
            <tr key={permission.key} className="border-t border-border">
              <th scope="row" className="px-4 py-3 text-left text-body font-medium text-text">
                {permission.description}
              </th>
              {ROLE_ORDER.map((role) => {
                const scope = scopeOf(role, permission.key);
                const granted = scope !== 'no';
                return (
                  <td key={role} className="px-4 py-3">
                    <span data-access={granted ? 'granted' : 'none'} className={cn('text-small', granted ? 'font-semibold text-primary' : 'text-text-secondary')}>
                      {label(scope)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
