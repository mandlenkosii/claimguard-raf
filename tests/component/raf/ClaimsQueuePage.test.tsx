import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/claims/api';
import { ClaimsQueuePage } from '@/pages/raf/ClaimsQueuePage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');
const officer = makeSession({ roles: ['raf_officer'] });
const row = (reference: string, days: number): api.QueueRow => ({ id: reference, reference, claimant_name: 'Sipho Ndlovu', legal_representative: 'Nkosi & Partners Attorneys', status: 'validation', readiness_score: 85, blocking_count: 1, risk_flag: 'Under review', open_request_count: 2, days_in_stage: days });

describe('S31 Claims queue', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S31-1 shows the tabs and queue columns', async () => {
    vi.mocked(api.getClaimsQueue).mockResolvedValue({ rows: [row('CG-2026-000142', 3)], total: 1 });
    renderScreen(<ClaimsQueuePage />, officer);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Assigned to me', 'Team queue', 'Unassigned']);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Claim reference', 'Claimant', 'Legal representative', 'Status', 'Readiness', 'Blocking issues', 'Risk', 'Open requests', 'Days in stage']);
  });

  it('T-S31-1 days in stage are amber after 14 and red after 30, always with the number', async () => {
    vi.mocked(api.getClaimsQueue).mockResolvedValue({ rows: [row('A', 14), row('B', 15), row('C', 31)], total: 3 });
    renderScreen(<ClaimsQueuePage />, officer);
    await screen.findByRole('table');
    expect(await screen.findByText('14')).toHaveAttribute('data-age', 'normal');
    expect(screen.getByText('15')).toHaveAttribute('data-age', 'amber');
    expect(screen.getByText('31')).toHaveAttribute('data-age', 'red');
  });

  it('T-S31 switching tab reloads that queue', async () => {
    vi.mocked(api.getClaimsQueue).mockResolvedValue({ rows: [], total: 0 });
    renderScreen(<ClaimsQueuePage />, officer);
    await waitFor(() => expect(api.getClaimsQueue).toHaveBeenCalledWith('assigned', 1, 20));
    fireEvent.click(screen.getByRole('tab', { name: 'Team queue' }));
    await waitFor(() => expect(api.getClaimsQueue).toHaveBeenCalledWith('team', 1, 20));
  });

  it('T-S31 rows can be selected in bulk', async () => {
    vi.mocked(api.getClaimsQueue).mockResolvedValue({ rows: [row('A', 1)], total: 1 });
    renderScreen(<ClaimsQueuePage />, officer);
    await screen.findByRole('checkbox', { name: 'Select row A' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByRole('checkbox', { name: 'Select row A' })).toBeChecked();
  });
});

