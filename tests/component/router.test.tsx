import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
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
