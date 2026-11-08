import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, signedIn } from './helpers';
import { CLIENT_NOMSA, createClaim } from './helpers-claims';
import { startUpload, waitForStatus } from './documentHelpers';

const LAWYER = '00000000-0000-4000-8000-000000000003';
const CLAIMANT2 = '00000000-0000-4000-8000-000000000002';
const admin = adminClient();

type Client = Awaited<ReturnType<typeof signedIn>>;
let lawyer: Client;
let claimId: string;

beforeAll(async () => {
  lawyer = await signedIn('lawyer.demo@example.com');
  ({ id: claimId } = await createClaim(lawyer, CLIENT_NOMSA));
});

describe('Uploading', () => {
  it('T-US14-1 and T-SEC-11a a lawyer uploads and confirms; the file is processed by the mock provider', async () => {
    const upload = await startUpload(lawyer, claimId, LAWYER);
    expect(upload.error).toBeNull();
    const { data } = await lawyer.rpc('confirm_document_upload', { p_version: upload.versionId });
    expect(data).toEqual({ ok: true });
    expect(await waitForStatus(lawyer, upload.documentId, ['processed', 'failed'])).toBe('processed');
    const { data: version } = await admin.from('document_versions').select('confirmed, version').eq('id', upload.versionId).single();
    expect(version).toEqual({ confirmed: true, version: 1 });
  });

  it('T-SEC-11b an unrelated claimant cannot add a document to the claim', async () => {
    const other = await signedIn('claimant2.demo@example.com');
    const upload = await startUpload(other, claimId, CLAIMANT2);
    expect((upload.error as { code?: string } | null)?.code).toBe('42501');
  });

  it('T-US14-3 the server rejects an executable', async () => {
    const { error } = await lawyer.storage.from('claim-documents').upload(`claims/${claimId}/x/v1/setup.exe`, new TextEncoder().encode('MZ'), { contentType: 'application/x-msdownload' });
    expect(error).not.toBeNull();
  });

  it('T-EDGE-5 an upload that is never confirmed is not listed and is not processed', async () => {
    const upload = await startUpload(lawyer, claimId, LAWYER, 'unconfirmed_SAMPLE.pdf');
    expect(upload.error).toBeNull();
    const { data: listed } = await lawyer.rpc('get_claim_documents', { p_claim: claimId });
    expect(listed.map((row: { document_id: string }) => row.document_id)).not.toContain(upload.documentId);
    const { data: document } = await admin.from('documents').select('processing_status').eq('id', upload.documentId).single();
    expect(document).toEqual({ processing_status: 'uploaded' });
  });

  it('T-BR28 a file missing from storage cannot be confirmed', async () => {
    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    await lawyer.from('documents').insert({ id: documentId, claim_id: claimId, category_key: 'identity_document', uploaded_by: LAWYER });
    await lawyer.from('document_versions').insert({ id: versionId, document_id: documentId, version: 1, storage_path: `claims/${claimId}/${documentId}/v1/ghost.pdf`, filename: 'ghost.pdf', mime_type: 'application/pdf', size_bytes: 10, uploaded_by: LAWYER });
    const { data } = await lawyer.rpc('confirm_document_upload', { p_version: versionId });
    expect(data).toMatchObject({ ok: false, code: 'error' });
  });

  it('T-US14 only the uploader can confirm', async () => {
    const upload = await startUpload(lawyer, claimId, LAWYER, 'other_SAMPLE.pdf');
    const officer = await signedIn('officer.demo@example.com');
    const { data } = await officer.rpc('confirm_document_upload', { p_version: upload.versionId });
    expect(data).toMatchObject({ ok: false, code: 'error' });
  });
});

describe('Downloading', () => {
  const SEEDED = 'c0000000-0000-4000-8000-000000000002';
  const seededPath = async () => {
    const { data } = await admin.from('documents').select('document_versions(storage_path)').eq('claim_id', SEEDED).limit(1).single();
    return (data as unknown as { document_versions: Array<{ storage_path: string }> }).document_versions[0]!.storage_path;
  };

  it('T-US15-1 no public URL works', async () => {
    const path = await seededPath();
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/claim-documents/${path}`);
    expect(response.ok).toBe(false);
  });

  it('T-US15-2, T-BR27-1 and T-SEC-12a the owner gets a working link that expires after 300 seconds', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { data, error } = await claimant.storage.from('claim-documents').createSignedUrl(await seededPath(), 300);
    expect(error).toBeNull();
    expect((await fetch(data!.signedUrl)).ok).toBe(true);
    const token = new URL(data!.signedUrl).searchParams.get('token')!;
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(300);
  });

  it('T-US15-3, T-EDGE-23 and T-SEC-12b the second claimant is denied a link by path', async () => {
    const other = await signedIn('claimant2.demo@example.com');
    const { data, error } = await other.storage.from('claim-documents').createSignedUrl(await seededPath(), 300);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('T-US16-1 the list has category, filename, uploader, date, status and is hidden from others', async () => {
    const claimant = await signedIn('claimant.demo@example.com');
    const { data } = await claimant.rpc('get_claim_documents', { p_claim: SEEDED });
    expect(data[0]).toMatchObject({ category_name: expect.any(String), filename: expect.any(String), uploader_name: expect.any(String), uploaded_at: expect.any(String), processing_status: 'processed' });
    const manager = await signedIn('manager.demo@example.com');
    expect((await manager.rpc('get_claim_documents', { p_claim: SEEDED })).data).toEqual([]);
  });
});

describe('Failure paths', () => {
  it('T-US26-1 and T-US26-2 a failed document stores the error, can be retried, and can go to manual review', async () => {
    const upload = await startUpload(lawyer, claimId, LAWYER, 'FAILURE_SAMPLE.pdf');
    await lawyer.rpc('confirm_document_upload', { p_version: upload.versionId });
    expect(await waitForStatus(lawyer, upload.documentId, ['failed', 'processed'])).toBe('failed');
    const { data: failed } = await lawyer.from('documents').select('processing_error').eq('id', upload.documentId).single();
    expect(failed).toEqual({ processing_error: "We couldn't read this document. Retry, or send it for manual review." });

    const { error: retryError } = await lawyer.rpc('retry_document_processing', { p_document: upload.documentId });
    expect(retryError).toBeNull();
    const started = Date.now();
    let attempts = 0;
    while (Date.now() - started < 30000 && attempts < 2) {
      const { count } = await admin.from('document_extractions').select('id', { count: 'exact', head: true }).eq('document_version_id', upload.versionId);
      attempts = count ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    expect(attempts).toBe(2);
    expect(await waitForStatus(lawyer, upload.documentId, ['failed'])).toBe('failed');

    const { error: reviewError } = await lawyer.rpc('mark_document_manual_review', { p_document: upload.documentId });
    expect(reviewError).toBeNull();
    expect(await waitForStatus(lawyer, upload.documentId, ['review_required'], 5000)).toBe('review_required');
  });

  it('T-SEC-11 someone with no upload access cannot retry or send to review', async () => {
    const upload = await startUpload(lawyer, claimId, LAWYER, 'FAILURE_SAMPLE.pdf');
    const other = await signedIn('claimant2.demo@example.com');
    expect((await other.rpc('retry_document_processing', { p_document: upload.documentId })).error?.code).toBe('42501');
    expect((await other.rpc('mark_document_manual_review', { p_document: upload.documentId })).error?.code).toBe('42501');
  });
});

