/**
 * Calendar-day helpers that stay in the *viewer's* timezone.
 *
 * `new Date().toISOString().slice(0, 10)` is the tempting one-liner and it is
 * wrong west of UTC: at 21:15 on Jul 28 in UTC-3 it already reports Jul 29,
 * so "today" lands on tomorrow for the last few hours of every evening —
 * exactly the hours this app is used in. Everything that answers "which day
 * did I train / is this today" must go through here.
 */

/** Local calendar day of a Date (or now) as 'YYYY-MM-DD'. */
export const localDateKey = (date: Date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** 'YYYY-MM-DD' for `days` before today, local. Negative values look forward. */
export const daysAgoKey = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
};

/**
 * Parse a 'YYYY-MM-DD' key into a Date at *local* midnight.
 * `new Date('2026-07-28')` parses as UTC midnight, which is the previous day
 * in any negative-offset timezone — this avoids that.
 */
export const dateFromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

/** Weekday index of a 'YYYY-MM-DD' key, 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (key: string): number => (dateFromKey(key).getDay() + 6) % 7;
