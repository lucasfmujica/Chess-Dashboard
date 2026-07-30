/**
 * Normalising Postgres DATE columns on the way out.
 *
 * The driver hands a DATE back as a JS Date at *local* midnight, and
 * JSON.stringify then turns that into a full UTC timestamp — so a row stored as
 * 2025-10-15 reaches the client as "2025-10-15T03:00:00.000Z" in UTC-3.
 *
 * That is not a cosmetic difference. Every consumer treats these values as
 * plain `YYYY-MM-DD` strings and compares them as strings, so a timestamp
 * breaks them silently rather than loudly:
 *   - `new Date(`${date}T00:00:00Z`)` becomes an Invalid Date, and the NaN sort
 *     key it produces leaves games in database order instead of play order.
 *   - `date <= dateTo` is false for every game *on* dateTo, because
 *     "2025-10-15T03:00:00.000Z" sorts after "2025-10-15".
 *
 * Formatting with the local getters is the only variant that preserves the
 * calendar day: `toISOString().slice(0, 10)` would shift it a day back for any
 * timezone west of UTC.
 */
export const toDateString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  // Already a string: keep just the calendar day, whether it arrived as
  // "2025-10-15" or as a full timestamp.
  return String(value).slice(0, 10);
};
