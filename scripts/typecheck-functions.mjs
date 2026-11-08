// Type-checks every Edge Function file with Deno (Section 4.3 `npm run typecheck`).
// Edge Functions are added in later phases; until then there is nothing to check.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'supabase/functions';

function listTs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listTs(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const files = listTs(root);
if (files.length === 0) {
  console.log(`No Edge Function files in ${root} yet; nothing to type-check.`);
  process.exit(0);
}

const result = spawnSync('deno', ['check', ...files], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
