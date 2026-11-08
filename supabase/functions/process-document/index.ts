// OP21: runs the mock extraction for one confirmed document version. Server callers only.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { MockOcrProvider } from '../_shared/ocr/mockProvider.ts';

const FAILURE_MESSAGE = "We couldn't read this document. Retry, or send it for manual review.";

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get('PROCESS_DOCUMENT_KEY');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return reply(401, { error: 'unauthorised' });

  const body = await request.json().catch(() => null);
  const versionId = typeof body?.version_id === 'string' ? body.version_id : '';
  if (!versionId) return reply(400, { error: 'version_id required' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: version } = await admin.from('document_versions').select('id, document_id, storage_path, filename, confirmed, documents!inner(category_key, processing_status)').eq('id', versionId).maybeSingle();
  if (!version) return reply(404, { error: 'not_found' });
  if (!version.confirmed) return reply(409, { error: 'not_confirmed' });
  const document = version.documents as unknown as { category_key: string; processing_status: string };
  if (document.processing_status === 'processed') return reply(200, { status: 'processed' });

  await admin.from('documents').update({ processing_status: 'processing', processing_error: null }).eq('id', version.document_id);

  const fail = async (detail: string) => {
    await admin.from('document_extractions').insert({ document_version_id: versionId, status: 'failed', error: detail.slice(0, 500) });
    await admin.from('documents').update({ processing_status: 'failed', processing_error: FAILURE_MESSAGE }).eq('id', version.document_id);
    return reply(200, { status: 'failed' });
  };

  const { data: file, error: downloadError } = await admin.storage.from('claim-documents').download(version.storage_path);
  if (downloadError || !file) return fail('The stored file could not be read');
  const bytes = new Uint8Array(await file.arrayBuffer());
  await admin.from('document_versions').update({ sha256: await sha256(bytes) }).eq('id', versionId);

  const result = await new MockOcrProvider().extract({ filename: version.filename, category: document.category_key, bytes });
  if (!result.ok) return fail(result.error);

  const { data: extraction, error } = await admin.from('document_extractions').insert({ document_version_id: versionId, status: 'succeeded', extracted_text: result.text }).select('id').single();
  if (error || !extraction) return fail('The extraction could not be stored');
  if (result.fields.length) await admin.from('extracted_fields').insert(result.fields.map((field) => ({ ...field, extraction_id: extraction.id })));
  await admin.from('documents').update({ processing_status: 'processed', processing_error: null }).eq('id', version.document_id);
  return reply(200, { status: 'processed' });
});
