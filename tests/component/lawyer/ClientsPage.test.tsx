import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/claims/api';
import { TXT } from '@/lib/format/messages';
import { ClientsPage } from '@/pages/lawyer/ClientsPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');
const lawyer = makeSession({ roles: ['lawyer'] });
const client = { claimant_id: 'c1', full_name: 'Nomsa Khumalo', id_number: 'SYN0000000003', email: 'n@example.com', mobile: null, mandate_status: 'on_file' as const, assigned_lawyer_id: null, claim_count: 2 };

describe('S27 Clients', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getFirmLawyers).mockResolvedValue([]);
  });

  it('T-S27-1 lists the firm\'s clients and shows the firm notice', async () => {
    vi.mocked(api.listClients).mockResolvedValue({ rows: [client], total: 1 });
    renderScreen(<ClientsPage />, lawyer);
    expect(await screen.findByRole('link', { name: 'Nomsa Khumalo' })).toHaveAttribute('href', '/lawyer/clients/c1');
    expect(screen.getByText('You can only see clients linked to your firm.')).toBeInTheDocument();
    expect(screen.queryByText('SYN0000000003')).toBeNull();
  });

  it('T-S27-2 Add client validates and saves', async () => {
    vi.mocked(api.listClients).mockResolvedValue({ rows: [], total: 0 });
    vi.mocked(api.addClient).mockResolvedValue('new');
    renderScreen(<ClientsPage />, lawyer);
    expect(await screen.findByText(TXT[57])).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add client' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Save client' }));
    expect(screen.getAllByText(TXT[4]).length).toBeGreaterThan(0);
    expect(api.addClient).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Fictional' } });
    fireEvent.change(screen.getByLabelText(/Surname/), { target: { value: 'Client' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save client' }));
    await waitFor(() => expect(api.addClient).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Fictional', surname: 'Client' })));
    expect(await screen.findByText(TXT[22])).toBeInTheDocument();
  });
});
