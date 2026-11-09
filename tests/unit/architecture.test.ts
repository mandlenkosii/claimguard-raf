import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const UI = [...files('src/pages'), ...files('src/components')];

describe('T-NFR-16 rules live on the server side of the code', () => {
  it.each(UI)('%s holds no business-rule logic', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/function isOverdue|function assess\b|function categoryScore|ADMISSION_WINDOW|CONFIDENCE_THRESHOLD/);
    expect(source).not.toMatch(/service_role|SERVICE_ROLE|sb_secret/);
  });
});

describe('T-NFR-11 Edge Function logging', () => {
  it.each(files('supabase/functions'))('%s logs only error messages', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/console\.(log|info|debug)\(/);
    for (const [, argument] of source.matchAll(/console\.error\('[^']*',\s*([^\n]*)\)/g)) expect(argument).toMatch(/instanceof Error/);
  });
});
