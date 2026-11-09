import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/requests/api';
import { TXT } from '@/lib/format/messages';
import { RequestDetailPage } from '@/pages/claims/workspace/RequestDetailPage';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/requests/api');
vi.mock('@/modals/UploadDocumentModal', () => ({
  UploadDocumentModal: ({ open, onUploaded }: { open: boolean; onUploaded: (document: { id: string; filename: string }) => void }) =>
    open ? <button onClick={() => onUploaded({ id: 'd1', filename: 'report_SAMPLE.pdf' })}>Finish upload</button> : null,
}));

const NOTICE = 'Submitting a response does not close the request — an officer will review it.';
const base: api.RequestDetail = {
  request: { id: 'r1', claim_id: 'c1', claim_reference: 'CG-2026-000141', title: 'Provide hospital report', description: 'Please upload it.', recipient_type: 'claimant', requests_documents: true, due_date: '2099-01-01', status: 'pending', created_at: '2026-02-20T10:00:00Z', closed_at: null, creator_name: 'Demo RAF Officer', linked_issue: { title: 'Hospital report missing', rule_id: 'RULE-001' } },
  responses: [],
  history: [],
  can_respond: true,
  can_review: false,
};
const responded: api.RequestDetail = {
  ...base,
  request: { ...base.request, status: 'responded' },
  responses: [{ id: 'x1', body: 'Here it is.', author_name: 'Thandiwe Mokoena', author_role: 'claimant', created_at: '2026-02-22T10:00:00Z', documents: [{ id: 'd1', filename: 'report_SAMPLE.pdf' }] }],
  history: [{ from_status: 'pending', to_status: 'responded', actor_name: 'Thandiwe Mokoena', created_at: '2026-02-22T10:00:00Z' }],
  can_respond: false,
  can_review: true,
};
const show = () =>
  renderScreen(<Routes><Route path="/claims/:id/requests/:requestId" element={<RequestDetailPage />} /></Routes>, makeSession(), '/claims/c1/requests/r1');

describe('S22 Request detail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('T-US58-1 shows the request and Created → Responded → Under review → Closed', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(base);
    show();
    expect(await screen.findByRole('heading', { name: 'Provide hospital report' })).toBeInTheDocument();
    expect(screen.getByText('Please upload it.')).toBeInTheDocument();
    expect(within(screen.getByTestId('request-progress')).getAllByRole('listitem').map((item) => item.textContent)).toEqual([expect.stringContaining('Created'), expect.stringContaining('Responded'), expect.stringContaining('Under review'), expect.stringContaining('Closed')]);
  });

  it('T-US55-3 shows that a response does not close the request', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(base);
    show();
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
  });

  it('T-US55-1 submits text and documents and shows TXT-36', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(base);
    vi.mocked(api.respondToRequest).mockResolvedValue(undefined);
    show();
    fireEvent.change(await screen.findByLabelText(/Your response/), { target: { value: 'Here it is.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add documents' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish upload' }));
    expect(await screen.findByText('report_SAMPLE.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }));
    await waitFor(() => expect(api.respondToRequest).toHaveBeenCalledWith({ requestId: 'r1', body: 'Here it is.', documentIds: ['d1'] }));
    expect(await screen.findByText(TXT[36])).toBeInTheDocument();
  });

  it('T-S22 an empty response is refused', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(base);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Submit response' }));
    expect(await screen.findByText(TXT[4])).toBeInTheDocument();
    expect(api.respondToRequest).not.toHaveBeenCalled();
  });

  it('T-S22 a failed response shows TXT-2', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(base);
    vi.mocked(api.respondToRequest).mockRejectedValue(new Error('failed'));
    show();
    fireEvent.change(await screen.findByLabelText(/Your response/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }));
    expect(await screen.findByText(TXT[2])).toBeInTheDocument();
  });

  it('T-SEC-19 no composer for those who may not respond', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue({ ...base, can_respond: false });
    show();
    await screen.findByRole('heading', { name: 'Provide hospital report' });
    expect(screen.queryByLabelText(/Your response/)).toBeNull();
  });

  it('T-US58-1 keeps responses, attachments and history', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(responded);
    show();
    expect(await screen.findByText('Here it is.')).toBeInTheDocument();
    expect(screen.getByText('report_SAMPLE.pdf')).toBeInTheDocument();
    expect(within(screen.getByTestId('request-history')).getByText(/Pending → Responded/)).toBeInTheDocument();
  });

  it('T-US56-1 the reviewer can start review, ask for more or close, and sees TXT-37', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue(responded);
    vi.mocked(api.updateRequestStatus).mockResolvedValue(undefined);
    show();
    expect(await screen.findByRole('button', { name: 'Request more information' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close request' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    await waitFor(() => expect(api.updateRequestStatus).toHaveBeenCalledWith({ requestId: 'r1', status: 'under_review' }));
    expect(await screen.findByText(TXT[37])).toBeInTheDocument();
  });

  it('T-S22 under review offers no Start review', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue({ ...responded, request: { ...responded.request, status: 'under_review' } });
    show();
    await screen.findByRole('button', { name: 'Close request' });
    expect(screen.queryByRole('button', { name: 'Start review' })).toBeNull();
  });

  it('T-S22 a pending request has no review actions', async () => {
    vi.mocked(api.getRequestDetail).mockResolvedValue({ ...base, can_respond: false, can_review: true });
    show();
    await screen.findByRole('heading', { name: 'Provide hospital report' });
    expect(screen.queryByRole('button', { name: 'Close request' })).toBeNull();
  });

  it('T-S22 the error state retries', async () => {
    vi.mocked(api.getRequestDetail).mockRejectedValue(new Error('failed'));
    show();
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument();
  });
});
