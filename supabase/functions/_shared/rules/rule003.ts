import { sourcesFor, toEvidence } from './compare.ts';
import { makeCheck, makeIssue, type Rule } from './types.ts';

/** Section 18 #59: how long after the accident a hospital admission is still consistent with it. */
export const ADMISSION_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;
const KEY = 'conflict:accident_date';

const dayOf = (value: string) => Date.parse(`${value.trim().slice(0, 10)}T00:00:00Z`);

/** BR9: accident dates must agree, and an admission must fall inside the window after the accident. */
export const rule003: Rule = (input, rule) => {
  const accidents = sourcesFor(input, 'accident_date').filter((source) => !Number.isNaN(dayOf(source.value)));
  const admissions = sourcesFor(input, 'admission_date').filter((source) => !Number.isNaN(dayOf(source.value)));
  if (accidents.length + admissions.length < 2 || !accidents.length) return { checks: [makeCheck(rule, 'not_applicable')], issues: [] };

  const accidentDays = new Set(accidents.map((source) => dayOf(source.value)));
  const accidentDay = Math.min(...accidentDays);
  const outsideWindow = admissions.some((source) => {
    const gap = dayOf(source.value) - accidentDay;
    return gap < 0 || gap > ADMISSION_WINDOW_DAYS * DAY_MS;
  });
  if (accidentDays.size === 1 && !outsideWindow) return { checks: [makeCheck(rule, 'passed', KEY)], issues: [] };

  const evidence = [...accidents.map((source) => toEvidence('accident_date', source)), ...admissions.map((source) => toEvidence('admission_date', source))];
  return { checks: [makeCheck(rule, 'failed', KEY)], issues: [makeIssue(rule, KEY, 'Accident dates differ between documents', evidence)] };
};
