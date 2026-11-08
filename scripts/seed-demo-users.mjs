// Runs after the database reset (Section 8.7): sets the demo users' passwords from DEMO_USER_PASSWORD
// and uploads the synthetic SAMPLE documents to the seed claims' storage paths.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

if (!existsSync('.env')) {
  console.error('Missing .env. Copy .env.example to .env and fill it from your Supabase project (Section 6).');
  process.exit(1);
}
process.loadEnvFile('.env');

const { VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey, DEMO_USER_PASSWORD: password } = process.env;
if (!url || !serviceKey || !password || password.includes('replace-with')) {
  console.error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_USER_PASSWORD in .env (Section 6).');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const DEMO_USER_IDS = Array.from({ length: 8 }, (_, index) => `00000000-0000-4000-8000-00000000000${index + 1}`);

function fail(step, error) {
  // error.message only: never print keys or passwords.
  console.error(`${step}: ${error.message}`);
  process.exit(1);
}

for (const id of DEMO_USER_IDS) {
  const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
  if (error) fail(`Setting a demo password for ${id}`, error);
}
console.log(`Set passwords for ${DEMO_USER_IDS.length} demo users.`);

const { data: versions, error: listError } = await admin
  .from('document_versions')
  .select('id, storage_path, documents!inner(claim_id, category_key)');
if (listError) fail('Listing seed documents', listError);

for (const version of versions) {
  const { claim_id: claimId, category_key: category } = version.documents;
  // A trailing PDF comment makes each claim's copy unique, so seed files are not RULE-004 duplicates.
  const base = readFileSync(join('fixtures', 'sample-documents', `${category}.pdf`));
  const file = Buffer.concat([base, Buffer.from(`\n%SAMPLE claim ${claimId}\n`)]);

  const { error: uploadError } = await admin.storage
    .from('claim-documents')
    .upload(version.storage_path, file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) fail(`Uploading ${version.storage_path}`, uploadError);

  const sha256 = createHash('sha256').update(file).digest('hex');
  const { error: updateError } = await admin
    .from('document_versions')
    .update({ size_bytes: file.length, sha256 })
    .eq('id', version.id);
  if (updateError) fail(`Recording ${version.storage_path}`, updateError);
}
console.log(`Uploaded ${versions.length} SAMPLE documents.`);

// The seed readiness assessments are current, so the upload bookkeeping above must not mark them stale.
const { error: staleError } = await admin.from('claims').update({ readiness_stale: false }).like('reference', 'CG-2026-0001%');
if (staleError) fail('Clearing the readiness flag', staleError);
console.log('Seed complete.');
