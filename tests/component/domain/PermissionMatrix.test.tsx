import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionMatrix } from '@/components/domain/PermissionMatrix';

const matrix = {
  permissions: [{ key: 'claims.view', description: 'View claims' }, { key: 'users.manage', description: 'Manage users and roles' }],
  grants: [{ role_key: 'claimant', permission_key: 'claims.view', scope: 'own' }, { role_key: 'claimant', permission_key: 'users.manage', scope: 'no' }, { role_key: 'admin', permission_key: 'users.manage', scope: 'yes' }],
};

describe('T-C-32 PermissionMatrix', () => {
  it('T-C-32 shows every cell as text with subtle colour', () => {
    render(<PermissionMatrix matrix={matrix} />);
    const view = screen.getByRole('row', { name: /View claims/ });
    expect(within(view).getByText('Own')).toHaveAttribute('data-access', 'granted');
    const manage = screen.getByRole('row', { name: /Manage users/ });
    expect(within(manage).getByText('Yes')).toHaveAttribute('data-access', 'granted');
    expect(within(manage).getAllByText('No')[0]).toHaveAttribute('data-access', 'none');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Capability', 'Claimant', 'Lawyer', 'RAF officer', 'Investigator', 'Manager', 'Administrator']);
  });
});
