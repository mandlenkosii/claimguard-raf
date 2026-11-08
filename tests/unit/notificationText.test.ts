import { describe, expect, it } from 'vitest';
import { notificationText } from '@rules/notificationText';

const reference = 'CG-2026-000142';

// TXT-60 … TXT-64 (Section 10). The same strings are checked for SQL in notifications.test.sql.
const CASES = [
  ['request', 'New information request', `You have a new information request on claim ${reference}.`],
  ['response', 'New response', `A response was submitted on claim ${reference}.`],
  ['assignment', 'Claim assigned', `You have been assigned to claim ${reference}.`],
  ['claim_update', 'Claim status updated', `Claim ${reference} is now Validation.`],
  ['message', 'New message', `You have a new message on claim ${reference}.`],
] as const;

describe('T-BR22-1 notification text', () => {
  it.each(CASES)('T-BR22-1 %s uses the exact catalogue wording', (type, title, summary) => {
    expect(notificationText(type, { reference, status: 'Validation' })).toEqual({ title, summary });
  });

  it('T-BR22-1 never includes names, ID numbers, document contents or evidence', () => {
    for (const [type] of CASES) {
      const { title, summary } = notificationText(type, { reference, status: 'Validation' });
      expect(`${title} ${summary}`).not.toMatch(/Ndlovu|Mokoena|\b\d{13}\b|evidence|\.pdf/i);
    }
  });
});
