import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/documents/api';
import { TXT } from '@/lib/format/messages';
import { UploadDocumentModal } from '@/modals/UploadDocumentModal';
import { makeSession, renderScreen } from '../../fixtures/auth';

vi.mock('@/features/documents/api');

const pdf = new File(['%PDF'], 'sample.pdf', { type: 'application/pdf' });
const exe = new File(['MZ'], 'setup.exe', { type: 'application/x-msdownload' });
const onUploaded = vi.fn();

const show = () => renderScreen(<UploadDocumentModal open claimId="c1" reference="CG-2026-000142" onClose={vi.fn()} onUploaded={onUploaded} />, makeSession());
const addFiles = (...files: File[]) => fireEvent.change(screen.getByLabelText('Browse files'), { target: { files } });
const choose = async () => {
  await screen.findByRole('option', { name: 'Identity document' });
  fireEvent.change(screen.getByLabelText(/Document category/), { target: { value: 'identity_document' } });
};
const upload = () => fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

describe('M1 Upload document', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getDocumentCategories).mockResolvedValue([{ key: 'identity_document', name: 'Identity document', is_required: true }]);
  });

  it('T-US14-2 with no category Upload is disabled', async () => {
    show();
    addFiles(pdf);
    await screen.findByRole('option', { name: 'Identity document' });
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('T-US14-3 an .exe is rejected before upload', async () => {
    show();
    await choose();
    addFiles(exe);
    expect(screen.getByText('File type not supported (.exe)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(api.uploadDocument).not.toHaveBeenCalled();
  });

  it('T-S17 a file over 10 MB shows TXT-23', async () => {
    show();
    await choose();
    addFiles(new File([new Uint8Array(10485761)], 'big.pdf', { type: 'application/pdf' }));
    expect(screen.getByText(TXT[23])).toBeInTheDocument();
  });

  it('T-US14-4 Confirmed shows only after OP20 returns success', async () => {
    let finishConfirm: (value: { ok: true }) => void = () => {};
    vi.mocked(api.uploadDocument).mockImplementation(async (input) => {
      input.onProgress(100);
      return { documentId: 'd1', versionId: 'v1' };
    });
    vi.mocked(api.confirmUpload).mockReturnValue(new Promise((resolve) => { finishConfirm = resolve; }));
    show();
    await choose();
    addFiles(pdf);
    upload();
    await waitFor(() => expect(api.confirmUpload).toHaveBeenCalledWith('v1'));
    expect(screen.queryByText('Confirmed ✓')).toBeNull();
    finishConfirm({ ok: true });
    expect(await screen.findByText('Confirmed ✓')).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalled();
  });

  it('T-BR28-1 a failed confirmation shows an error and no success state', async () => {
    vi.mocked(api.uploadDocument).mockResolvedValue({ documentId: 'd1', versionId: 'v1' });
    vi.mocked(api.confirmUpload).mockResolvedValue({ ok: false, code: 'error' });
    show();
    await choose();
    addFiles(pdf);
    upload();
    expect(await screen.findByText(TXT[25])).toBeInTheDocument();
    expect(screen.queryByText('Confirmed ✓')).toBeNull();
  });

  it('T-S17 the upload rate limit shows TXT-56', async () => {
    vi.mocked(api.uploadDocument).mockResolvedValue({ documentId: 'd1', versionId: 'v1' });
    vi.mocked(api.confirmUpload).mockResolvedValue({ ok: false, code: 'rate_limited' });
    show();
    await choose();
    addFiles(pdf);
    upload();
    expect(await screen.findByText(TXT[56])).toBeInTheDocument();
  });

  it('T-M1-1 the replace checkbox is shown but disabled', async () => {
    show();
    await screen.findByRole('option', { name: 'Identity document' });
    expect(screen.getByRole('checkbox', { name: 'This replaces an existing document (keeps the previous version)' })).toBeDisabled();
  });
});
