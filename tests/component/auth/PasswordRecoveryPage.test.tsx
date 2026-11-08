import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { TXT } from '@/lib/format/messages';
import { PasswordRecoveryPage } from '@/pages/auth/PasswordRecoveryPage';
import { renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

const NEUTRAL = "If an account exists for this email, we've sent a reset link";

describe('S07 Password recovery', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('T-US6-1 any email gets the same neutral confirmation', async () => {
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ ok: true });
    renderScreen(<PasswordRecoveryPage />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'nobody@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument();
    expect(api.requestPasswordReset).toHaveBeenCalledWith('nobody@example.org');
  });

  it('T-US6-1 the confirmation is neutral even when the server call fails', async () => {
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ ok: false, reason: 'error' });
    renderScreen(<PasswordRecoveryPage />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'nobody@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(NEUTRAL)).toBeInTheDocument();
  });

  it('T-US6-2 a valid reset link can set a new password and shows the toast', async () => {
    window.history.replaceState({}, '', '/reset-password#type=recovery&access_token=x');
    vi.mocked(api.updatePassword).mockResolvedValue({ ok: true });
    vi.mocked(api.signOut).mockResolvedValue();
    renderScreen(<PasswordRecoveryPage />);
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'abcdefg1' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Password updated. Please sign in.')).toBeInTheDocument();
    expect(api.updatePassword).toHaveBeenCalledWith('abcdefg1');
  });

  it('T-S7 weak and mismatched new passwords use the catalogue', () => {
    window.history.replaceState({}, '', '/reset-password#type=recovery');
    renderScreen(<PasswordRecoveryPage />);
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'abd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByText(TXT[7])).toBeInTheDocument();
    expect(screen.getByText(TXT[6])).toBeInTheDocument();
  });

  it('T-S7 an expired link shows TXT-10', () => {
    window.history.replaceState({}, '', '/reset-password#error=access_denied&error_code=otp_expired');
    renderScreen(<PasswordRecoveryPage />);
    expect(screen.getByText(TXT[10])).toBeInTheDocument();
  });
});
