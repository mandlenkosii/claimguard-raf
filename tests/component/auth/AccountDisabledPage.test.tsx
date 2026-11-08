import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { TXT } from '@/lib/format/messages';
import { AccountDisabledPage } from '@/pages/auth/AccountDisabledPage';
import { renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

describe('S08 Account disabled and pending', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US5-2 a disabled account sees the message and can sign out', () => {
    vi.mocked(api.signOut).mockResolvedValue();
    renderScreen(<AccountDisabledPage variant="disabled" />);
    expect(screen.getByText('Your account has been disabled. Contact your administrator.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(api.signOut).toHaveBeenCalledTimes(1);
  });

  it('T-S8-2 a practitioner awaiting verification sees TXT-11 and can sign out', () => {
    renderScreen(<AccountDisabledPage variant="pending" />);
    expect(screen.getByText(TXT[11])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
