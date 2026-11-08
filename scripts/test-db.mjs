// Runs the pgTAP test files against the hosted Supabase project (Section 18 #46, #48).
// `supabase test db` needs Docker; this runs the same files over one direct connection per file,
// so each file's transaction and `set local` statements behave as they would there.
// Usage: node scripts/test-db.mjs [file.sql ...]   (default: every supabase/tests/database/*.test.sql)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import pg from 'pg';

const TEST_DIR = 'supabase/tests/database';

if (!existsSync('.env')) {
  console.error('Missing .env. Copy .env.example to .env and fill it from your Supabase project (Section 6).');
  process.exit(1);
}
process.loadEnvFile('.env');

const connectionString = process.env.SUPABASE_DB_URL ?? '';
if (!connectionString || connectionString.includes('replace-with')) {
  console.error('SUPABASE_DB_URL in .env is not set to your Supabase connection string (Section 6).');
  process.exit(1);
}

// Supabase's own certificate authority file (public, safe to commit), from
// Dashboard → Project Settings → Database → SSL configuration.
const CA_FILE = 'supabase/prod-ca-2021.crt';

function connect() {
  // TLS is always verified: with Supabase's CA when the file is present, otherwise the system's CAs.
  const ssl = existsSync(CA_FILE) ? { ca: readFileSync(CA_FILE, 'utf8') } : true;
  // Remove any sslmode in the URL so it cannot override the verified TLS settings above.
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return new pg.Client({ connectionString: url.toString(), ssl });
}

/** Pulls TAP lines ("1..N", "ok", "not ok", "# ...") out of every statement's rows. */
function tapLines(results) {
  const lines = [];
  for (const result of [results].flat()) {
    for (const row of result.rows ?? []) {
      const values = Object.values(row);
      if (values.length !== 1 || typeof values[0] !== 'string') continue;
      for (const line of values[0].split('\n')) {
        if (/^(\s*)(1\.\.\d+|ok\b|not ok\b|#)/.test(line)) lines.push(line);
      }
    }
  }
  return lines;
}

/** Returns a list of problems; an empty list means the file passed. */
function judge(lines) {
  const planLine = lines.find((line) => /^1\.\.\d+/.test(line));
  if (!planLine) return { passed: 0, problems: ['no test plan was reported'] };
  const planned = Number(planLine.slice(3));
  const passed = lines.filter((line) => /^ok\b/.test(line)).length;
  const failed = lines.filter((line) => /^not ok\b/.test(line));
  const problems = [...failed];
  if (passed + failed.length !== planned) problems.push(`planned ${planned} tests but ran ${passed + failed.length}`);
  return { passed, problems };
}

async function runFile(file) {
  const client = connect();
  await client.connect();
  try {
    return judge(tapLines(await client.query(readFileSync(file, 'utf8'))));
  } catch (error) {
    return { passed: 0, problems: [`SQL error: ${error.message}`] };
  } finally {
    await client.end();
  }
}

async function main() {
  const requested = process.argv.slice(2);
  const files = requested.length
    ? requested
    : readdirSync(TEST_DIR).filter((name) => name.endsWith('.test.sql')).sort().map((name) => join(TEST_DIR, name));
  if (files.length === 0) throw new Error(`No test files found in ${TEST_DIR}`);

  const setup = connect();
  await setup.connect();
  await setup.query('create extension if not exists pgtap with schema extensions');
  await setup.end();

  let total = 0;
  let failedFiles = 0;
  for (const file of files) {
    const { passed, problems } = await runFile(file);
    total += passed;
    if (problems.length) failedFiles += 1;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${basename(file)} (${passed} passed)`);
    for (const problem of problems) console.log(`     ${problem}`);
  }
  console.log(`Files: ${files.length - failedFiles} passed, ${failedFiles} failed. Assertions passed: ${total}.`);
  process.exit(failedFiles ? 1 : 0);
}

main().catch((error) => {
  console.error(`Database tests could not run: ${error.message}`);
  process.exit(1);
});
