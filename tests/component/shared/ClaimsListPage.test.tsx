import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/claims/api';
import { TXT } from '@/lib/format/messages';
import { ClaimsListPage } from '@/pages/shared/ClaimsListPage';
import { claimRow } from '../../fixtures/claims';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');
const lawyer = makeSession({ roles: ['lawyer'] });

describe('S10 Claims list', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S10-1 shows the design columns, with a mono reference and pagination', async () => {
    vi.mocked(api.listClaims).mockResolvedValue({ rows: [claimRow], total: 1 });
    renderScreen(<ClaimsListPage />, lawyer);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Claim reference', 'Claimant', 'Accident date', 'Status', 'Readiness', 'Blocking issues', 'Open requests', 'Last updated']);
    expect(await screen.findByRole('link', { name: 'CG-2026-000142' })).toHaveClass('font-mono');
    expect(screen.getByRole('button', { name: 'Actions for CG-2026-000142' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('T-EDGE-17 and T-NFR-4 only one page loads at a time and the next page is requested', async () => {
    vi.mocked(api.listClaims).mockResolvedValue({ rows: [claimRow], total: 45 });
    renderScreen(<ClaimsListPage />, lawyer);
    await screen.findByRole('link', { name: 'CG-2026-000142' });
    expect(api.listClaims).toHaveBeenCalledTimes(1);
    expect(api.listClaims).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(api.listClaims).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }));
  });

  it('T-S10 empty state shows TXT-48 and New claim for lawyers', async () => {
    vi.mocked(api.listClaims).mockResolvedValue({ rows: [], total: 0 });
    renderScreen(<ClaimsListPage />, lawyer);
    expect(await screen.findByText(TXT[48])).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New claim' }).length).toBeGreaterThan(0);
  });

  it('T-S10 managers get no New claim action', async () => {
    vi.mocked(api.listClaims).mockResolvedValue({ rows: [claimRow], total: 1 });
    renderScreen(<ClaimsListPage />, makeSession({ roles: ['manager'] }));
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: 'New claim' })).toBeNull();
  });

  it('T-S10 error state retries', async () => {
    vi.mocked(api.listClaims).mockRejectedValue(new Error('failed'));
    renderScreen(<ClaimsListPage />, lawyer);
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText(TXT[3])).toBeInTheDocument();
  });
});
