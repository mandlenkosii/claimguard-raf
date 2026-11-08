import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';
import { makeSession } from '../fixtures/auth';

vi.mock('@/features/auth/api');

function renderAt(path: string, session: AuthSession | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders session={session}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('T-NAV-1 / T-NAV-2 logged-out navigation', () => {
  it.each([
    ['/', 'Catch claim problems early. Resolve them with evidence.'],
    ['/about', 'About ClaimGuard RAF'],
    ['/how-it-works', 'How ClaimGuard works'],
    ['/security', 'Security and privacy by design'],
  ])('T-NAV-1 a logged-out user can open %s', async (path, heading) => {
    const router = renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it('T-NAV-2 a logged-out user opening /claims is sent to /login', async () => {
    const router = renderAt('/claims');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ from: '/claims' });
  });
});

describe('T-NAV-3 … T-NAV-5 signed-in navigation', () => {
  it.each([
    ['/login', 'claimant', '/dashboard'],
    ['/register', 'claimant', '/dashboard'],
    ['/login', 'lawyer', '/lawyer/dashboard'],
    ['/login', 'raf_officer', '/raf/dashboard'],
    ['/login', 'investigator', '/raf/risk'],
    ['/login', 'manager', '/raf/management'],
    ['/login', 'admin', '/admin/users'],
  ] as const)('T-NAV-3 opening %s as %s goes to %s', async (path, role, target) => {
    const router = renderAt(path, makeSession({ roles: [role] }));
    await waitFor(() => expect(router.state.location.pathname).toBe(target));
  });

  it('T-NAV-3 users with two roles land on the first role in the Section 11 order', async () => {
    const router = renderAt('/login', makeSession({ roles: ['manager', 'lawyer'] }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/lawyer/dashboard'));
  });

  it.each(['suspended', 'disabled', 'invited'] as const)('T-NAV-4 a %s user sees S08 on any protected route', async (accountStatus) => {
    renderAt('/claims', makeSession({ accountStatus }));
    expect(await screen.findByText('Your account has been disabled. Contact your administrator.')).toBeInTheDocument();
  });

  it('T-NAV-4 a practitioner awaiting verification sees the pending variant', async () => {
    renderAt('/profile', makeSession({ accountType: 'legal_practitioner', roles: [], practitionerStatus: 'pending' }));
    expect(await screen.findByText(/waiting for an administrator to verify it/)).toBeInTheDocument();
  });

  it('T-NAV-5 a claimant opening /admin/users sees S08 403', async () => {
    renderAt('/admin/users', makeSession());
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
  });

  it('T-NAV-5 the right role opens its route inside the app shell', async () => {
    renderAt('/admin/users', makeSession({ roles: ['admin'] }));
    expect(await screen.findByTestId('role-badge')).toHaveTextContent('Administrator');
  });

  it('T-NAV-5 a non-claimant opening /dashboard goes to their own dashboard', async () => {
    const router = renderAt('/dashboard', makeSession({ roles: ['raf_officer'] }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/raf/dashboard'));
  });
});
