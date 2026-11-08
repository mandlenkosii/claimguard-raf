import { describe, expect, it } from 'vitest';
import { sidebarItemsFor } from '@/lib/access/navigation';

describe('T-US4-2 sidebar for several roles', () => {
  it('T-US4-2 a user with two roles gets both roles\' items once each', () => {
    const items = sidebarItemsFor(['manager', 'investigator']).map((item) => item.to);
    expect(items).toEqual(['/raf/risk', '/notifications', '/profile', '/raf/management']);
  });
});
