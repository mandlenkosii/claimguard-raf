import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/admin/api';
import { RolesPage } from '@/pages/admin/RolesPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/admin/api');
const admin = makeSession({ roles: ['admin'] });
const matrix: api.PermissionMatrixData = {
  permissions: [{ key: 'claims.view', description: 'View claims' }],
  grants: [{ role_key: 'manager', permission_key: 'claims.view', scope: 'summary' }],
};

describe('S40 Roles', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S40-1 shows the matrix and the notice, view only', async () => {
    vi.mocked(api.getPermissionMatrix).mockResolvedValue(matrix);
    renderScreen(<RolesPage />, admin);
    expect(await screen.findByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Permissions are enforced on the server and database, not only in the interface.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });

  it('T-S40-1 the selected role panel lists its permissions', async () => {
    vi.mocked(api.getPermissionMatrix).mockResolvedValue(matrix);
    renderScreen(<RolesPage />, admin);
    await screen.findByText('Summary');
    fireEvent.change(screen.getByLabelText('Selected role'), { target: { value: 'manager' } });
    expect(within(screen.getByTestId('selected-role')).getByText('View claims')).toBeInTheDocument();
  });

  it('T-S40 the error state retries', async () => {
    vi.mocked(api.getPermissionMatrix).mockRejectedValue(new Error('failed'));
    renderScreen(<RolesPage />, admin);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
