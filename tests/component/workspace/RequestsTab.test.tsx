import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import * as api from '@/features/requests/api';
import { TXT } from '@/lib/format/messages';
import { RequestsTab } from '@/pages/claims/workspace/RequestsTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/requests/api');

const row = (id: string, overrides: Partial<api.RequestRow>): api.RequestRow => ({
  id, title: `Request ${id}`, description: 'Text', recipient_type: 'claimant', status: 'pending', due_date: '2099-01-01', created_at: '2026-02-20T10:00:00Z', requests_documents: false, linked_issue: null, ...overrides,
});
const rows = [
  row('none', { title: 'No date item', due_date: null }),
  row('late', { title: 'Overdue item', due_date: '2020-01-01' }),
  row('resp', { status: 'responded', linked_issue: { title: 'Hospital report missing', rule_id: 'RULE-001' } }),
  row('rev', { status: 'under_review' }),
  row('done', { status: 'closed', due_date: '2020-01-01' }),
];
const officer = makeSession({ roles: ['raf_officer'], capabilities: ['requests.create'] });
const show = (session: AuthSession = officer) =>
  renderScreen(<Routes><Route path="/claims/:id/requests" element={<RequestsTab />} /></Routes>, session, '/claims/c1/requests');

describe('S21 Requests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getLinkableIssues).mockResolvedValue([{ id: 'i1', title: 'Hospital report missing', rule_id: 'RULE-001' }]);
  });

  it('T-US56-1 the summary chips count each state', async () => {
    vi.mocked(api.getRequests).mockResolvedValue(rows);
    show();
    await screen.findByText('Overdue item');
    const summary = screen.getByTestId('request-summary');
    for (const [label, value] of [['Pending', '2'], ['Responded', '1'], ['Under review', '1'], ['Closed', '1'], ['Overdue', '1']] as const) {
      expect(within(summary).getByText(label).parentElement).toHaveTextContent(value);
    }
  });

  it('T-US56-2 and T-EDGE-11 overdue is red and no due date is grey', async () => {
    vi.mocked(api.getRequests).mockResolvedValue(rows);
    show();
    const late = (await screen.findByText('Overdue item')).closest('tr')!;
    expect(within(late).getByText('Overdue').parentElement).toHaveAttribute('data-state', 'overdue');
    expect(within(late).getByText('01 Jan 2020').className).toContain('text-error');
    const none = screen.getByText('No date item').closest('tr')!;
    expect(within(none).getByText('No due date').className).toContain('text-text-secondary');
    expect(within(none).queryByText('Overdue')).toBeNull();
  });

  it('T-BR20-1 a closed request is not overdue', async () => {
    vi.mocked(api.getRequests).mockResolvedValue(rows);
    show();
    const closed = (await screen.findByText('Request done')).closest('tr')!;
    expect(within(closed).queryByText('Overdue')).toBeNull();
    expect(within(closed).getByText('Closed')).toBeInTheDocument();
  });

  it('T-S21 links to the detail and shows the linked issue', async () => {
    vi.mocked(api.getRequests).mockResolvedValue(rows);
    show();
    expect(await screen.findByRole('link', { name: 'Request resp' })).toHaveAttribute('href', '/claims/c1/requests/resp');
    expect(screen.getByText('RULE-001')).toBeInTheDocument();
  });

  it('T-S21 shows TXT-53 when empty', async () => {
    vi.mocked(api.getRequests).mockResolvedValue([]);
    show();
    expect(await screen.findByText('No information requests yet.')).toBeInTheDocument();
  });

  it('T-US54-1 the drawer captures every field and shows TXT-35', async () => {
    vi.mocked(api.getRequests).mockResolvedValue([]);
    vi.mocked(api.createRequest).mockResolvedValue('r1');
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'New request' }));
    fireEvent.change(screen.getByLabelText(/Request title/), { target: { value: 'Send report' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Please send it' } });
    fireEvent.change(screen.getByLabelText(/Recipient/), { target: { value: 'legal_representative' } });
    await screen.findByRole('option', { name: 'RULE-001 · Hospital report missing' });
    fireEvent.change(screen.getByLabelText(/Linked readiness issue/), { target: { value: 'i1' } });
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByLabelText('Request supporting documents'));
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(api.createRequest).toHaveBeenCalledWith({ claimId: 'c1', title: 'Send report', description: 'Please send it', recipientType: 'legal_representative', linkedIssueId: 'i1', dueDate: '2026-12-01', requestsDocuments: true }),
    );
    expect(await screen.findByText(TXT[35])).toBeInTheDocument();
  });

  it('T-US54-1 title, description and recipient are required', async () => {
    vi.mocked(api.getRequests).mockResolvedValue([]);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'New request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect((await screen.findAllByText(TXT[4])).length).toBe(3);
    expect(api.createRequest).not.toHaveBeenCalled();
  });

  it('T-SEC-18 New request shows only to those who may create one', async () => {
    vi.mocked(api.getRequests).mockResolvedValue(rows);
    show(makeSession());
    await screen.findByText('Overdue item');
    expect(screen.queryByRole('button', { name: 'New request' })).toBeNull();
  });

  it('T-S21 the error state retries', async () => {
    vi.mocked(api.getRequests).mockRejectedValue(new Error('failed'));
    show();
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
