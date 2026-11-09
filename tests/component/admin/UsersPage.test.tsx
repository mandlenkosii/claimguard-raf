import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/admin/api';
import { TXT } from '@/lib/format/messages';
import { UsersPage } from '@/pages/admin/UsersPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/admin/api');
const SELF_NOTE = 'Admins cannot assign roles to themselves.';
const admin = makeSession({ userId: 'admin-1', roles: ['admin'] });
const row = (overrides: Partial<api.AdminUser> = {}): api.AdminUser => ({
  id: 'u1', name: 'Sipho Ndlovu', email: 'sipho@example.com', account_status: 'active', roles: ['claimant'], organisation: 'Nkosi & Partners', last_sign_in_at: '2026-02-25T10:00:00Z', mfa: false, ...overrides,
});
const counts = { active: 1, invited: 0, suspended: 0, disabled: 0 };
const list = (rows: api.AdminUser[]) => vi.mocked(api.listUsers).mockResolvedValue({ rows, total: rows.length, counts });
const editFirst = async () => fireEvent.click(await screen.findByRole('button', { name: /^Edit / }));

describe('S39 Users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getOrganisations).mockResolvedValue([{ id: 'o1', name: 'Nkosi & Partners', type: 'law_firm', registration_number: null, status: 'active' }]);
  });

  it('T-US81-1 and T-US85-1 lists users with roles, organisation, status, last sign-in and MFA, and the notice', async () => {
    list([row()]);
    renderScreen(<UsersPage />, admin);
    expect(await screen.findByText('sipho@example.com')).toBeInTheDocument();
    for (const header of ['User', 'Email', 'Roles', 'Organisation', 'Status', 'Last sign-in', 'MFA']) expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    expect(screen.getByText('Administrative access does not grant access to claim content.')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('T-US81-1 filters reload the list', async () => {
    list([]);
    renderScreen(<UsersPage />, admin);
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledWith({ role: '', organisation: '', status: '', search: '' }, 1, 20));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'suspended' } });
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledWith({ role: '', organisation: '', status: 'suspended', search: '' }, 1, 20));
  });

  it('T-US81-1 invites a user and shows TXT-39', async () => {
    list([]);
    vi.mocked(api.inviteUser).mockResolvedValue(undefined);
    renderScreen(<UsersPage />, admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Invite user' }));
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/Surname/), { target: { value: 'Person' } });
    fireEvent.click(screen.getByLabelText('RAF officer'));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'New starter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(api.inviteUser).toHaveBeenCalledWith({ email: 'new@example.com', firstName: 'New', surname: 'Person', roles: ['raf_officer'], organisationId: null, reason: 'New starter' }));
    expect(await screen.findByText(TXT[39])).toBeInTheDocument();
  });

  it('T-US81-1 an invitation needs a valid email, a role and a reason', async () => {
    list([]);
    renderScreen(<UsersPage />, admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Invite user' }));
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText(TXT[5])).toBeInTheDocument();
    expect(api.inviteUser).not.toHaveBeenCalled();
  });

  it('T-US82-1 saving roles needs a reason, then shows TXT-40', async () => {
    list([row()]);
    vi.mocked(api.setUserRoles).mockResolvedValue(undefined);
    renderScreen(<UsersPage />, admin);
    await editFirst();
    fireEvent.click(screen.getByLabelText('Lawyer'));
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }));
    expect(await screen.findByText(TXT[18])).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Verified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }));
    await waitFor(() => expect(api.setUserRoles).toHaveBeenCalledWith({ userId: 'u1', roles: ['claimant', 'lawyer'], reason: 'Verified' }));
    expect(await screen.findByText(TXT[40])).toBeInTheDocument();
  });

  it('T-US82-2 the admin editing themselves is told and cannot save', async () => {
    list([row({ id: 'admin-1', roles: ['admin'] })]);
    renderScreen(<UsersPage />, admin);
    await editFirst();
    expect(await screen.findByText(SELF_NOTE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save roles' })).toBeDisabled();
  });

  it('T-US81-1 suspending needs a reason and shows TXT-41', async () => {
    list([row()]);
    vi.mocked(api.setAccountStatus).mockResolvedValue(undefined);
    renderScreen(<UsersPage />, admin);
    await editFirst();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Leaving' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(api.setAccountStatus).toHaveBeenCalledWith({ userId: 'u1', status: 'suspended', reason: 'Leaving' }));
    expect(await screen.findByText('Account status updated to Suspended.')).toBeInTheDocument();
  });

  it('T-US81-1 a suspended user can be re-enabled', async () => {
    list([row({ account_status: 'suspended' })]);
    renderScreen(<UsersPage />, admin);
    await editFirst();
    expect(screen.getByRole('button', { name: 'Re-enable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).toBeNull();
  });

  it('T-US81-1 reset access asks for a new password', async () => {
    list([row()]);
    vi.mocked(api.sendPasswordReset).mockResolvedValue(undefined);
    renderScreen(<UsersPage />, admin);
    await editFirst();
    fireEvent.click(screen.getByRole('button', { name: 'Reset access' }));
    await waitFor(() => expect(api.sendPasswordReset).toHaveBeenCalledWith('sipho@example.com'));
  });

  it('T-S39 the error state retries', async () => {
    vi.mocked(api.listUsers).mockRejectedValue(new Error('failed'));
    renderScreen(<UsersPage />, admin);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
