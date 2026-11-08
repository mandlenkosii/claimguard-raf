import { describe, expect, it } from 'vitest';
import { color } from '@/theme/tokens';

describe('T-SETUP-1 design tokens', () => {
  it('T-SETUP-1 exports color.primary #0F2A44 and color.accent #0E7C7B', () => {
    expect(color.primary).toBe('#0F2A44');
    expect(color.accent).toBe('#0E7C7B');
  });
});
