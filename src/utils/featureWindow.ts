/**
 * Time-boxed UI switches.
 *
 * Until the Final Argentina Amateur Sub-2000 starts, the sections that don't
 * feed tournament preparation are tucked out of the nav. Nothing is deleted:
 * the components stay mounted behind their tab ids and come back on their own.
 */

/** First day the hidden sections show again, as an ART calendar date. */
export const PREP_DISTRACTIONS_UNTIL = '2026-12-04';

/** Tabs hidden from the nav while `hidePrepDistractions` is true. */
export const PREP_DISTRACTION_TABS: ReadonlySet<string> = new Set([
  'geography',
  'norm-tracker',
  'streaks',
  'records',
]);

/** Argentina is UTC-3 all year (no DST), so ART is a fixed offset. */
const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

/** Calendar day of `now` in Argentina, 'YYYY-MM-DD', whatever the viewer's timezone. */
export const artDateKey = (now: Date = new Date()): string =>
  new Date(now.getTime() + ART_OFFSET_MS).toISOString().slice(0, 10);

/** True while the ART date is before 2026-12-04. */
export const hidePrepDistractions = (now: Date = new Date()): boolean =>
  artDateKey(now) < PREP_DISTRACTIONS_UNTIL;
