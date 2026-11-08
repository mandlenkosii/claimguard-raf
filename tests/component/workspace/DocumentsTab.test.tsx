import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/app/auth';
import * as api from '@/features/documents/api';
import { TXT } from '@/lib/format/messages';
import { DocumentsTab } from '@/pages/claims/workspace/DocumentsTab';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/documents/api');

const doc = (overrides: Partial<api.ClaimDocumentRow> = {}): api.ClaimDocumentRow => ({
  document_id: 'd1', version_id: 'v1', category_key: 'identity_document', category_name: 'Identity document', filename: 'id_SAMPLE.pdf',
  uploader_name: 'Lindiwe Nkosi', uploaded_at: '2026-02-25T10:00:00Z', processing_status: 'processed', processing_error: null, storage_path: 'claims/c1/d1/v1/id_SAMPLE.pdf', ...overrides,
});
const show = (session: AuthSession = makeSession()) =>
  renderScreen(
    <Routes>
      <Route path="/claims/:id/documents" element={<DocumentsTab />} />
    </Routes>,
    session,
    '/claims/c1/documents',
  );

describe('S15 Documents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getDocumentCategories).mockResolvedValue([
      { key: 'identity_document', name: 'Identity document', is_required: true },
      { key: 'accident_report', name: 'Accident report', is_required: true },
      { key: 'proof_of_earnings', name: 'Proof of earnings', is_required: false },
    ]);
  });

  it('T-US16-1 the table shows category, filename, uploader, date and status', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([doc()]);
    show();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Document', 'Category', 'Uploaded by', 'Uploaded', 'Status']);
    expect(await within(table).findByText('id_SAMPLE.pdf')).toBeInTheDocument();
    expect(within(table).getByText('Identity document')).toBeInTheDocument();
    expect(within(table).getByText('Lindiwe Nkosi')).toBeInTheDocument();
    expect(within(table).getByText('25 Feb 2026')).toBeInTheDocument();
    expect(within(table).getByText('Processed')).toBeInTheDocument();
  });

  it('T-US15-2 shows the private storage notice', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([]);
    show();
    expect(await screen.findByText('Documents are stored privately. Download links expire after 5 minutes.')).toBeInTheDocument();
  });

  it('T-US19-1 and T-NFR-3 every processing state is shown as text, with a spinner while processing', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue(
      (['uploaded', 'processing', 'processed', 'failed', 'review_required'] as const).map((processing_status, index) => doc({ document_id: `d${index}`, filename: `f${index}.pdf`, processing_status })),
    );
    const { container } = show();
    const table = await screen.findByRole('table');
    await within(table).findByText('f0.pdf');
    for (const label of ['Uploaded', 'Processing', 'Processed', 'Failed', 'Review required']) expect(within(table).getByText(label, { selector: '[data-state] span' })).toBeInTheDocument();
    expect(container.querySelector('[data-spinner]')).not.toBeNull();
  });

  it('T-US19-2 and T-US26-1 a failed document shows the failure, Retry and Send to manual review', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([doc({ processing_status: 'failed', processing_error: TXT[26] })]);
    vi.mocked(api.retryProcessing).mockResolvedValue(undefined);
    vi.mocked(api.sendToManualReview).mockResolvedValue(undefined);
    show();
    expect(await screen.findByText(TXT[26])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.retryProcessing).toHaveBeenCalledWith('d1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send to manual review' }));
    await waitFor(() => expect(api.sendToManualReview).toHaveBeenCalledWith('d1'));
    expect(await screen.findByText(TXT[28])).toBeInTheDocument();
  });

  it('T-US15-2 download asks for a signed link just in time', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([doc()]);
    vi.mocked(api.getDownloadUrl).mockResolvedValue('https://signed.example/x');
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    show();
    expect(api.getDownloadUrl).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Download id_SAMPLE.pdf' }));
    await waitFor(() => expect(api.getDownloadUrl).toHaveBeenCalledWith('claims/c1/d1/v1/id_SAMPLE.pdf'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://signed.example/x', '_blank', 'noopener'));
    open.mockRestore();
  });

  it('T-S15 required documents show as supplied or missing', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([doc()]);
    show();
    const strip = await screen.findByTestId('required-documents');
    await waitFor(() => expect(within(strip).getByText('Accident report').closest('[data-supplied]')).toHaveAttribute('data-supplied', 'false'));
    expect(within(strip).getByText('Identity document').closest('[data-supplied]')).toHaveAttribute('data-supplied', 'true');
    expect(within(strip).queryByText('Proof of earnings')).toBeNull();
  });

  it('T-S15 filters by category and status', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([doc(), doc({ document_id: 'd2', filename: 'report.pdf', category_key: 'accident_report', category_name: 'Accident report', processing_status: 'failed' })]);
    show();
    await screen.findByText('report.pdf');
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'accident_report' } });
    expect(screen.queryByText('id_SAMPLE.pdf')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'processed' } });
    expect(screen.queryByText('report.pdf')).toBeNull();
  });

  it('T-S15 empty state shows TXT-49', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([]);
    show();
    expect(await screen.findByText(TXT[49])).toBeInTheDocument();
  });

  it('T-SEC-11 upload controls show only for roles that may upload', async () => {
    vi.mocked(api.getClaimDocuments).mockResolvedValue([]);
    show(makeSession({ roles: ['raf_officer'] }));
    await screen.findByText(TXT[49]);
    expect(screen.queryByRole('button', { name: 'Upload document' })).toBeNull();
  });
});
