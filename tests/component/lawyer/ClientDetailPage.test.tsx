import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/claims/api';
import { ClientDetailPage } from '@/pages/lawyer/ClientDetailPage';
import { claimRow } from '../../fixtures/claims';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');

const show = () =>
  renderScreen(
    <Routes>
      <Route path="/lawyer/clients/:id" element={<ClientDetailPage />} />
    </Routes>,
    makeSession({ roles: ['lawyer'] }),
    '/lawyer/clients/c1',
  );

describe('S28 Client detail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S28-1 shows the profile header, tabs and claims cards with Create claim', async () => {
    vi.mocked(api.getClient).mockResolvedValue({ claimant_id: 'c1', full_name: 'Nomsa Khumalo', id_number: 'SYN0000000003', email: 'n@example.com', mobile: null, mandate_status: 'on_file', assigned_lawyer_id: null, claim_count: 1 });
    vi.mocked(api.getClientClaims).mockResolvedValue([claimRow]);
    show();
    expect(await screen.findByRole('heading', { level: 1, name: 'Nomsa Khumalo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create claim for this client' })).toHaveAttribute('href', '/claims/new?client=c1');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\d+$/, ''))).toEqual(['Overview', 'Claims', 'Documents']);
    fireEvent.click(screen.getByRole('tab', { name: /Claims/ }));
    expect(await screen.findByRole('link', { name: 'Open claim workspace' })).toHaveAttribute('href', `/claims/${claimRow.id}`);
    expect(screen.getByText('CG-2026-000142')).toBeInTheDocument();
  });

  it('T-EDGE-20 a client outside the firm shows S08 403', async () => {
    vi.mocked(api.getClient).mockResolvedValue(null);
    show();
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
  });
});
