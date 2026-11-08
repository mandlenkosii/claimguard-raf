// Stores where process-document lives, and its key, in the database Vault so confirm_document_upload can call it.
import { existsSync, readFileSync } from 'node:fs';
import pg from 'pg';

const CA_FILE = 'supabase/prod-ca-2021.crt';

if (!existsSync('.env')) {
  console.error('Missing .env (Section 6).');
  process.exit(1);
}
process.loadEnvFile('.env');

const { SUPABASE_DB_URL: dbUrl, VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
const connection = new URL(dbUrl);
connection.searchParams.delete('sslmode');
const client = new pg.Client({ connectionString: connection.toString(), ssl: existsSync(CA_FILE) ? { ca: readFileSync(CA_FILE, 'utf8') } : true });

async function setSecret(name, value) {
  const { rows } = await client.query('select id from vault.secrets where name = $1', [name]);
  if (rows[0]) await client.query('select vault.update_secret($1, $2)', [rows[0].id, value]);
  else await client.query('select vault.create_secret($1, $2)', [value, name]);
}

await client.connect();
try {
  await setSecret('process_document_url', `${url}/functions/v1/process-document`);
  await setSecret('process_document_key', key);
  console.log('Vault secrets set.');
} catch (error) {
  console.error(`Could not set the Vault secrets: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
