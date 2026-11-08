import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import { AppProviders } from '@/app/providers';
import { routes } from '@/app/router';
import * as api from '@/features/claims/api';
import { claimDetail, CLAIM_ID } from '../../fixtures/claims';
import { makeSession } from '../../fixtures/auth';

vi.mock('@/features/auth/api');
vi.mock('@/features/claims/api');
vi.mock('@/features/workflow/api');

function open(path: string, session: AuthSession) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders session={session}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('Claim workspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getClaim).mockResolvedValue(claimDetail);
    vi.mocked(api.getAssignments).mockResolvedValue([{ profile_id: 'o1', display_name: 'Demo RAF Officer', assignment_role: 'raf_officer', assigned_at: '2026-01-13T10:00:00Z' }]);
  });

  it('T-US11-1 tabs show in the design order', async () => {
    open(`/claims/${CLAIM_ID}`, makeSession({ roles: ['raf_officer'], capabilities: ['audit.view'] }));
    await screen.findByRole('tab', { name: /Overview/ });
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Overview', 'Documents', 'Readiness', 'Risk', 'Messages', 'Requests', 'Timeline', 'Audit']);
  });

  it('T-US11-2 a role without risk or audit permission does not get those tabs', async () => {
    open(`/claims/${CLAIM_ID}`, makeSession());
    await screen.findByRole('tab', { name: /Overview/ });
    expect(screen.queryByRole('tab', { name: /Risk/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Audit/ })).toBeNull();
  });

  it('T-US12-1 Overview shows the Parties and Assignments cards', async () => {
    open(`/claims/${CLAIM_ID}`, makeSession());
    expect(await screen.findByRole('heading', { name: 'Parties' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByText('Nkosi & Partners Attorneys')).toBeInTheDocument();
    expect(await screen.findByText('Demo RAF Officer')).toBeInTheDocument();
  });

  it('T-NAV-6 a role without permission opening the Risk URL sees S25', async () => {
    open(`/claims/${CLAIM_ID}/risk`, makeSession());
    expect(await screen.findByText("You don't have permission to view this claim")).toBeInTheDocument();
  });

  it('T-NAV-6 a role without permission opening the Audit URL sees S25', async () => {
    open(`/claims/${CLAIM_ID}/audit`, makeSession());
    expect(await screen.findByText("You don't have permission to view this claim")).toBeInTheDocument();
  });

  it('T-S14 the error state offers Try again', async () => {
    vi.mocked(api.getClaim).mockRejectedValue(new Error('failed'));
    open(`/claims/${CLAIM_ID}`, makeSession());
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });

  it('T-S14 Change status is offered only to roles in the workflow', async () => {
    open(`/claims/${CLAIM_ID}`, makeSession());
    expect(await screen.findByRole('button', { name: 'Change status' })).toBeInTheDocument();
  });
});
