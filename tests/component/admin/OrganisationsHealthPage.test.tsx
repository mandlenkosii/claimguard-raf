import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/admin/api';
import { TXT } from '@/lib/format/messages';
import { OrganisationsHealthPage } from '@/pages/admin/OrganisationsHealthPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/admin/api');
const admin = makeSession({ roles: ['admin'] });
const org: api.Organisation = { id: 'o1', name: 'Nkosi & Partners', type: 'law_firm', registration_number: 'LPC-1', status: 'active' };

describe('S43 Organisations and system health', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S43-1 lists organisations', async () => {
    vi.mocked(api.getOrganisations).mockResolvedValue([org]);
    renderScreen(<OrganisationsHealthPage />, admin);
    expect(await screen.findByText('Nkosi & Partners')).toBeInTheDocument();
    expect(screen.getByText('Law firm')).toBeInTheDocument();
    expect(screen.getByText('LPC-1')).toBeInTheDocument();
  });

  it('T-S43-1 adds an organisation and shows TXT-42', async () => {
    vi.mocked(api.getOrganisations).mockResolvedValue([]);
    vi.mocked(api.saveOrganisation).mockResolvedValue(undefined);
    renderScreen(<OrganisationsHealthPage />, admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Add organisation' }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'New Firm' } });
    fireEvent.change(screen.getByLabelText(/^Type/), { target: { value: 'law_firm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save organisation' }));
    await waitFor(() => expect(api.saveOrganisation).toHaveBeenCalledWith({ id: null, name: 'New Firm', type: 'law_firm', registrationNumber: null, status: 'active' }));
    expect(await screen.findByText(TXT[42])).toBeInTheDocument();
  });

  it('T-S43-1 name and type are required', async () => {
    vi.mocked(api.getOrganisations).mockResolvedValue([]);
    renderScreen(<OrganisationsHealthPage />, admin);
    fireEvent.click(await screen.findByRole('button', { name: 'Add organisation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save organisation' }));
    expect((await screen.findAllByText(TXT[4])).length).toBe(2);
  });

  it('T-S43-2 the system health tab shows each service with the demo label', async () => {
    vi.mocked(api.getOrganisations).mockResolvedValue([]);
    vi.mocked(api.checkHealth).mockResolvedValue([
      { service: 'Auth', status: 'Operational' },
      { service: 'Database', status: 'Operational' },
      { service: 'Storage', status: 'Degraded' },
      { service: 'Edge Functions', status: 'Down' },
      { service: 'Mock OCR provider', status: 'Operational' },
    ]);
    renderScreen(<OrganisationsHealthPage />, admin);
    fireEvent.click(await screen.findByRole('tab', { name: 'System health' }));
    expect(within(await screen.findByTestId('health-Storage')).getByText('Degraded')).toBeInTheDocument();
    expect(within(screen.getByTestId('health-Edge Functions')).getByText('Down')).toBeInTheDocument();
    expect(within(screen.getByTestId('health-Auth')).getByText('Operational')).toBeInTheDocument();
    expect(screen.getByTestId('health-Database')).toBeInTheDocument();
    expect(screen.getByTestId('health-Mock OCR provider')).toBeInTheDocument();
    expect(screen.getByText('Demonstration data')).toBeInTheDocument();
  });
});
