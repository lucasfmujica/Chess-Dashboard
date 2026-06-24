/**
 * Training-plan domain types.
 */

/** A single planned training activity within a day. */
export interface TrainingActivity {
  id: string;
  minutes?: number;
  label?: string;
  details?: string;
}

/** A day's plan: a list of activities. */
export type DayPlan = TrainingActivity[];

/** A week's plan keyed by YYYY-MM-DD date string. */
export type WeekPlan = Record<string, DayPlan>;

/** All weekly plans keyed by the week's Monday (YYYY-MM-DD). */
export type WeeklyPlans = Record<string, WeekPlan>;

/** A single day entry produced by getWeekDates. */
export interface WeekDate {
  day: string;
  /** YYYY-MM-DD */
  date: string;
  /** Localized short label, e.g. "Nov 15". */
  displayDate: string;
}

/** Aggregate stats for a planned week (see getWeekStats). */
export interface WeekStats {
  totalPlannedMinutes: number;
  daysPlanned: number;
  restDays: number;
  activityCounts: Record<string, number>;
  avgMinutesPerDay: number;
}
