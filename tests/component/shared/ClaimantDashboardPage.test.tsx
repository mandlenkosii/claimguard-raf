import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/dashboards/api';
import { TXT } from '@/lib/format/messages';
import { ClaimantDashboardPage } from '@/pages/shared/ClaimantDashboardPage';
import { makeSession, renderScreen } from '../../fixtures/auth';
import { workItem } from '../dashboards/fixtures';

vi.mock('@/features/dashboards/api');

const home: api.ClaimantHome = {
  claim: { id: 'c1', reference: 'CG-2026-000141', status: 'documents_needed', readiness_score: 72, blocking_count: 2 },
  open_requests: [{ id: 'r1', title: 'Provide hospital report', due_date: '2099-01-01', status: 'pending' }],
  recent_messages: [{ id: 'm1', body: 'Please review the affidavit.', author_name: 'Lindiwe Nkosi', author_role: 'lawyer', created_at: '2026-02-25T10:00:00Z' }],
  recent_activity: [{ id: 'a1', summary: 'Claim created', created_at: '2026-02-20T10:00:00Z' }],
};

describe('S09 Claimant dashboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-S9-1 shows greeting, claim card, tracker, to-do, requests, messages and activity', async () => {
    vi.mocked(api.getClaimantHome).mockResolvedValue(home);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([workItem({ title: 'Hospital report missing' })]);
    renderScreen(<ClaimantDashboardPage />, makeSession({ firstName: 'Thandiwe' }));
    expect(await screen.findByRole('heading', { name: 'Hello, Thandiwe' })).toBeInTheDocument();
    const card = await screen.findByTestId('your-claim');
    expect(within(card).getByText('CG-2026-000141')).toBeInTheDocument();
    expect(within(card).getByText('Documents Needed')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Readiness 72%' })).toBeInTheDocument();
    expect(within(card).getByText('2 blocking issues')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Resolve issues' })).toHaveAttribute('href', '/claims/c1/readiness');
    expect(screen.getByRole('list', { name: 'Claim progress' })).toBeInTheDocument();
    expect(within(await screen.findByTestId('todo')).getByRole('link', { name: 'Hospital report missing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Provide hospital report' })).toHaveAttribute('href', '/claims/c1/requests/r1');
    expect(screen.getByText('Please review the affidavit.')).toBeInTheDocument();
    expect(screen.getByText('Claim created')).toBeInTheDocument();
  });

  it('T-US76-1 nothing to do shows TXT-58', async () => {
    vi.mocked(api.getClaimantHome).mockResolvedValue(home);
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<ClaimantDashboardPage />, makeSession());
    expect(await screen.findByText(TXT[58])).toBeInTheDocument();
  });

  it('T-S9-1 no claim shows TXT-48 and New claim', async () => {
    vi.mocked(api.getClaimantHome).mockResolvedValue({ claim: null, open_requests: [], recent_messages: [], recent_activity: [] });
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<ClaimantDashboardPage />, makeSession());
    expect(await screen.findByText(TXT[48])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New claim' })).toHaveAttribute('href', '/claims/new');
  });

  it('T-S9 the error state retries', async () => {
    vi.mocked(api.getClaimantHome).mockRejectedValue(new Error('failed'));
    vi.mocked(api.getOutstandingWork).mockResolvedValue([]);
    renderScreen(<ClaimantDashboardPage />, makeSession());
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
