import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { TXT } from '@/lib/format/messages';
import { ProfilePage } from '@/pages/shared/ProfilePage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

const profile = {
  first_name: 'Thandiwe',
  surname: 'Mokoena',
  email: 'claimant.demo@example.com',
  mobile: '+27820000000',
  preferred_language: 'English',
  preferred_contact_method: 'email' as const,
};

describe('S13 Profile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US3-1 changing details saves them and shows the success toast', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    vi.mocked(api.updateMyProfile).mockResolvedValue({ ok: true });
    renderScreen(<ProfilePage />, makeSession());
    fireEvent.change(await screen.findByLabelText(/First name/), { target: { value: 'Thandi' } });
    fireEvent.change(screen.getByLabelText(/Mobile/), { target: { value: '+27829999999' } });
    fireEvent.change(screen.getByLabelText(/Preferred language/), { target: { value: 'isiZulu' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Phone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(TXT[13])).toBeInTheDocument();
    expect(api.updateMyProfile).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      expect.objectContaining({ first_name: 'Thandi', mobile: '+27829999999', preferred_language: 'isiZulu', preferred_contact_method: 'phone' }),
    );
  });

  it('T-US3-2 Role is read-only with a lock icon and the tooltip', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    renderScreen(<ProfilePage />, makeSession());
    const role = await screen.findByLabelText('Role');
    expect(role).toHaveAttribute('readonly');
    expect(role).toHaveValue('Claimant');
    expect(screen.getAllByTitle('Managed by your administrator').length).toBeGreaterThan(0);
  });

  it('T-S13 required fields use TXT-4 and nothing is saved', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    renderScreen(<ProfilePage />, makeSession());
    fireEvent.change(await screen.findByLabelText(/First name/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText(TXT[4])).toBeInTheDocument();
    expect(api.updateMyProfile).not.toHaveBeenCalled();
  });

  it('T-S13 shows a loading state', () => {
    vi.mocked(api.getMyProfile).mockReturnValue(new Promise(() => {}));
    renderScreen(<ProfilePage />, makeSession());
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('T-S13 shows the error state and retries', async () => {
    vi.mocked(api.getMyProfile).mockRejectedValue(new Error('failed'));
    renderScreen(<ProfilePage />, makeSession());
    const retry = await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 });
    expect(screen.getByText(TXT[3])).toBeInTheDocument();
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    fireEvent.click(retry);
    expect(await screen.findByLabelText(/First name/)).toBeInTheDocument();
  });

  it('T-S13 changing the password validates, then shows TXT-13', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    vi.mocked(api.updatePassword).mockResolvedValue({ ok: true });
    renderScreen(<ProfilePage />, makeSession());
    fireEvent.change(await screen.findByLabelText(/^New password/), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'abd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText(TXT[7])).toBeInTheDocument();
    expect(api.updatePassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'abcdefg1' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(api.updatePassword).toHaveBeenCalledWith('abcdefg1'));
    expect(await screen.findByText(TXT[13])).toBeInTheDocument();
  });

  it('T-S13 signs out other sessions and shows TXT-14', async () => {
    vi.mocked(api.getMyProfile).mockResolvedValue(profile);
    vi.mocked(api.signOutOtherSessions).mockResolvedValue({ ok: true });
    renderScreen(<ProfilePage />, makeSession());
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of other sessions' }));
    expect(await screen.findByText(TXT[14])).toBeInTheDocument();
  });
});
