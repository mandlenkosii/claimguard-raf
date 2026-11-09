import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILES = ['src/pages/lawyer/LawyerDashboardPage.tsx', 'src/pages/raf/RafDashboardPage.tsx', 'src/pages/raf/ManagementDashboardPage.tsx', 'src/pages/shared/ClaimantDashboardPage.tsx', 'src/features/dashboards/MetricsDashboard.tsx'];

describe('T-BR31-1 no invented statistics', () => {
  it.each(FILES)('%s holds no literal metric value', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toMatch(/value[:=]\s*\{?\s*['"]?\d/);
  });

  it('the shared dashboard reads its numbers from the server call', () => {
    expect(readFileSync('src/features/dashboards/MetricsDashboard.tsx', 'utf8')).toMatch(/getMetrics/);
    expect(readdirSync(join('src', 'features', 'dashboards'))).toContain('api.ts');
  });
});
