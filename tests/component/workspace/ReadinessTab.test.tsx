import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import * as api from '@/features/readiness/api';
import { TXT } from '@/lib/format/messages';
import { ReadinessTab } from '@/pages/claims/workspace/ReadinessTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/readiness/api');

const assessment: api.Assessment = {
  score: 85, rules_version: '1.0.0', assessed_at: '2026-02-25T10:00:00Z', blocking_count: 1, warning_count: 1, resolved_count: 2,
  category_scores: { documentation: 75, required_information: 100, identity: 0, timeline: 100, cross_document: 100 },
};
const weights = { documentation: 30, required_information: 25, identity: 15, timeline: 15, cross_document: 15 };
const issue = (overrides: Partial<api.ClaimIssue>): api.ClaimIssue => ({
  id: 'i', rule_id: 'RULE-001', issue_key: 'k', title: 'Issue', explanation: 'Why', corrective_action: 'Do', impact: 'blocking', status: 'open', dismiss_reason: null, classification: null, evidence: [], ...overrides,
});
const data: api.Readiness = {
  assessment, weights, stale: false,
  issues: [
    issue({ id: 'b', title: 'Hospital medical report missing' }),
    issue({ id: 'w', title: 'Claimant name differs', impact: 'warning', rule_id: 'RULE-002', evidence: [{ source: 'Identity document', field: 'full_name', value: 'Sipho M. Ndlovu' }, { source: 'Hospital medical report', field: 'full_name', value: 'S. Ndhlovu' }] }),
    issue({ id: 'r', title: 'Accident report missing', status: 'resolved' }),
  ],
};
const lawyer = makeSession({ roles: ['lawyer'] });
const show = (session: AuthSession = lawyer) =>
  renderScreen(
    <Routes>
      <Route path="/claims/:id/readiness" element={<ReadinessTab />} />
    </Routes>,
    session,
    '/claims/c1/readiness',
  );

describe('S18 Readiness', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US30-3 shows the ring, rules version and date, counters and five category bars', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show();
    expect(await screen.findByRole('img', { name: 'Readiness 85%' })).toBeInTheDocument();
    expect(screen.getByText('Rules version 1.0.0 · Assessed 25 Feb 2026')).toBeInTheDocument();
    const counters = screen.getByTestId('counters');
    for (const [label, value] of [['Blocking', '1'], ['Warnings', '1'], ['Resolved', '2']] as const) {
      expect(within(counters).getByText(label).parentElement).toHaveTextContent(value);
    }
    expect(screen.getAllByTestId('category-bar')).toHaveLength(5);
    expect(screen.getByText('Weight 30%')).toBeInTheDocument();
  });

  it('T-US30-4 shows that a score is not a legal opinion', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show();
    expect(await screen.findByText('A readiness score is not a legal opinion or a guarantee of claim acceptance.')).toBeInTheDocument();
  });

  it('T-BR13-1 a blocking issue shows the red card', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show();
    expect(await screen.findByText('1 blocking issue — this claim cannot move to Ready until it is resolved')).toBeInTheDocument();
  });

  it('T-S18 issues are grouped into Blocking, Warnings and Resolved', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show();
    expect(within(await screen.findByTestId('group-blocking')).getByRole('heading', { name: 'Hospital medical report missing' })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-warnings')).getByRole('heading', { name: 'Claimant name differs' })).toBeInTheDocument();
    expect(within(screen.getByTestId('group-resolved')).getByRole('heading', { name: 'Accident report missing' })).toBeInTheDocument();
  });

  it('T-US35-1 shows the side-by-side comparison', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show();
    expect(await screen.findByText('Sipho M. Ndlovu')).toBeInTheDocument();
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
  });

  it('T-US32-2 Re-run checks makes a new assessment and shows TXT-29', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    vi.mocked(api.runReadiness).mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-run checks' }));
    await waitFor(() => expect(api.runReadiness).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText(TXT[29])).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(api.getReadiness).mock.calls.length).toBeGreaterThan(1));
  });

  it('T-S18 not yet assessed shows TXT-51 and Run checks', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue({ assessment: null, issues: [], weights, stale: true });
    vi.mocked(api.runReadiness).mockResolvedValue(undefined);
    show();
    expect(await screen.findByText(TXT[51])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run checks' }));
    await waitFor(() => expect(api.runReadiness).toHaveBeenCalledWith('c1'));
  });

  it('T-S18 a failed re-run shows TXT-2', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    vi.mocked(api.runReadiness).mockRejectedValue(new Error('failed'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-run checks' }));
    expect(await screen.findByText(TXT[2])).toBeInTheDocument();
  });

  it('T-S18 the error state retries', async () => {
    vi.mocked(api.getReadiness).mockRejectedValue(new Error('failed'));
    show();
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });

  it('T-US35-2 classifying an issue saves it and shows TXT-30', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    vi.mocked(api.updateIssue).mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'This is an extraction error' }));
    await waitFor(() => expect(api.updateIssue).toHaveBeenCalledWith({ issueId: 'w', classification: 'extraction_error' }));
    expect(await screen.findByText(TXT[30])).toBeInTheDocument();
  });

  it('T-SEC-13 a claimant sees issues but cannot resolve them', async () => {
    vi.mocked(api.getReadiness).mockResolvedValue(data);
    show(makeSession());
    await screen.findByRole('heading', { name: 'Hospital medical report missing' });
    expect(screen.queryByRole('button', { name: 'Mark as resolved' })).toBeNull();
  });
});
