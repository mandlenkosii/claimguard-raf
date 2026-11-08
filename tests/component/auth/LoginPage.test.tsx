import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/auth/api';
import { TXT } from '@/lib/format/messages';
import { LoginPage } from '@/pages/auth/LoginPage';
import { renderScreen } from '../../fixtures/auth';

vi.mock('@/features/auth/api');

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('S05 Sign in', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('T-US2-2 wrong credentials show the same message', async () => {
    vi.mocked(api.signIn).mockResolvedValue({ ok: false, reason: 'invalid' });
    renderScreen(<LoginPage />);
    fillAndSubmit('claimant.demo@example.com', 'wrong-pass-1');
    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument();
    expect(api.signIn).toHaveBeenCalledWith('claimant.demo@example.com', 'wrong-pass-1');
  });

  it('T-S5 a rate-limited sign-in shows TXT-56', async () => {
    vi.mocked(api.signIn).mockResolvedValue({ ok: false, reason: 'rate_limited' });
    renderScreen(<LoginPage />);
    fillAndSubmit('claimant.demo@example.com', 'wrong-pass-1');
    expect(await screen.findByText(TXT[56])).toBeInTheDocument();
  });

  it('T-S5 empty and invalid fields are refused before calling the server', () => {
    renderScreen(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getAllByText(TXT[4]).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'name@' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(TXT[5])).toBeInTheDocument();
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it('T-S5 links to password recovery and registration', () => {
    renderScreen(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/reset-password');
    expect(screen.getByRole('link', { name: /Register/ })).toHaveAttribute('href', '/register');
  });

  it('T-AUTH-4 shows the demo section with six role buttons and the simulation notice', () => {
    renderScreen(<LoginPage />);
    expect(screen.getByText('Demo accounts (simulation only)')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-role')).toHaveLength(6);
    expect(screen.getByText('Demo login is a simulation and does not protect real data.')).toBeInTheDocument();
  });

  it('T-AUTH-4 a demo button signs in with only the role key', async () => {
    vi.mocked(api.demoSignIn).mockResolvedValue({ ok: true });
    renderScreen(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /RAF officer/ }));
    await waitFor(() => expect(api.demoSignIn).toHaveBeenCalledWith('raf_officer'));
  });

  it('T-BR36-1 the demo section is not rendered in production', () => {
    vi.stubEnv('VITE_APP_ENV', 'production');
    renderScreen(<LoginPage />);
    expect(screen.queryByText('Demo accounts (simulation only)')).toBeNull();
    expect(screen.queryAllByTestId('demo-role')).toHaveLength(0);
  });
});
