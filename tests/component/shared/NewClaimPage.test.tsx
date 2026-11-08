import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/claims/api';
import { NewClaimPage } from '@/pages/shared/NewClaimPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/claims/api');
vi.mock('@/features/workflow/api');

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('S11 New claim', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.createClaim).mockResolvedValue({ id: 'new-id', reference: 'CG-2026-000187' });
    vi.mocked(api.updateClaim).mockResolvedValue(undefined);
    vi.mocked(api.listClients).mockResolvedValue({ rows: [], total: 0 });
  });

  it('T-US8-1 the unique reference shows at the top once the draft exists', async () => {
    renderScreen(<NewClaimPage />, makeSession());
    save();
    expect(await screen.findByText('CG-2026-000187')).toBeInTheDocument();
  });

  it('T-US9-1 required fields show an asterisk and helper text', () => {
    renderScreen(<NewClaimPage />, makeSession());
    next();
    expect(screen.getByLabelText(/Accident date/)).toBeRequired();
    expect(screen.getByLabelText(/Accident province/)).toBeRequired();
    expect(screen.getAllByText('Required before this claim can leave Draft.').length).toBeGreaterThan(0);
  });

  it('T-US10-1 Save as draft stores an incomplete form and shows Draft saved', async () => {
    renderScreen(<NewClaimPage />, makeSession());
    next();
    fireEvent.change(screen.getByLabelText(/Accident town/), { target: { value: 'Polokwane' } });
    save();
    await waitFor(() => expect(api.createClaim).toHaveBeenCalledWith(expect.objectContaining({ claimantId: null, fields: expect.objectContaining({ accident_town: 'Polokwane' }) })));
    expect(await screen.findByText(/Draft saved .* ago/)).toBeInTheDocument();
  });

  it('T-US10-1 a second save updates the same draft', async () => {
    renderScreen(<NewClaimPage />, makeSession());
    save();
    await screen.findByText('CG-2026-000187');
    next();
    fireEvent.change(screen.getByLabelText(/Accident town/), { target: { value: 'Polokwane' } });
    save();
    await waitFor(() => expect(api.updateClaim).toHaveBeenCalledWith('new-id', expect.objectContaining({ accident_town: 'Polokwane' })));
    expect(api.createClaim).toHaveBeenCalledTimes(1);
  });

  it('T-US10-2 the preview card shows what is missing and never implies readiness', () => {
    renderScreen(<NewClaimPage />, makeSession());
    expect(screen.getByRole('heading', { name: 'Draft readiness preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Accident description').length).toBeGreaterThan(0);
    expect(screen.getByText('Saving a draft does not mark your claim as ready.')).toBeInTheDocument();
  });

  it('T-S11 has six wizard steps', () => {
    renderScreen(<NewClaimPage />, makeSession());
    expect(screen.getAllByRole('listitem').filter((item) => item.hasAttribute('data-status'))).toHaveLength(6);
  });

  it('T-S11 a lawyer must choose a client from their firm', async () => {
    vi.mocked(api.listClients).mockResolvedValue({
      rows: [{ claimant_id: 'c1', full_name: 'Nomsa Khumalo', id_number: 'SYN1', email: null, mobile: null, mandate_status: 'on_file', assigned_lawyer_id: null, claim_count: 0 }],
      total: 1,
    });
    renderScreen(<NewClaimPage />, makeSession({ roles: ['lawyer'] }));
    expect(await screen.findByRole('option', { name: 'Nomsa Khumalo' })).toBeInTheDocument();
    save();
    expect(api.createClaim).not.toHaveBeenCalled();
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
  });

  it('T-NAV-8 unsaved changes are saved when the user navigates away', async () => {
    const { unmount } = renderScreen(<NewClaimPage />, makeSession());
    next();
    fireEvent.change(screen.getByLabelText(/Accident town/), { target: { value: 'Tzaneen' } });
    unmount();
    await waitFor(() => expect(api.createClaim).toHaveBeenCalledWith(expect.objectContaining({ fields: expect.objectContaining({ accident_town: 'Tzaneen' }) })));
  });

  it('T-S11 failing to save shows TXT-16', async () => {
    vi.mocked(api.createClaim).mockRejectedValue(new Error('failed'));
    renderScreen(<NewClaimPage />, makeSession());
    save();
    expect(await screen.findByText("We couldn't save your draft. Your changes are still on this page. Please try again.")).toBeInTheDocument();
  });
});
