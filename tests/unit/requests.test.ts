import { describe, expect, it } from 'vitest';
import { isOverdue } from '@rules/requests';

const NOW = new Date('2026-03-10T10:00:00Z');

describe('T-BR20-1 isOverdue', () => {
  it('is true when the due date has passed and the request is not closed', () => {
    expect(isOverdue({ due_date: '2026-03-09', status: 'pending' }, NOW)).toBe(true);
    expect(isOverdue({ due_date: '2026-03-09', status: 'responded' }, NOW)).toBe(true);
    expect(isOverdue({ due_date: '2026-03-09', status: 'under_review' }, NOW)).toBe(true);
  });

  it('is false on the due date itself', () => {
    expect(isOverdue({ due_date: '2026-03-10', status: 'pending' }, NOW)).toBe(false);
  });

  it('is false when closed', () => {
    expect(isOverdue({ due_date: '2026-03-09', status: 'closed' }, NOW)).toBe(false);
  });

  it('is false with no due date', () => {
    expect(isOverdue({ due_date: null, status: 'pending' }, NOW)).toBe(false);
  });

  it('uses the South African date, two hours ahead of UTC', () => {
    expect(isOverdue({ due_date: '2026-03-09', status: 'pending' }, new Date('2026-03-09T21:59:00Z'))).toBe(false);
    expect(isOverdue({ due_date: '2026-03-09', status: 'pending' }, new Date('2026-03-09T22:01:00Z'))).toBe(true);
  });
});
