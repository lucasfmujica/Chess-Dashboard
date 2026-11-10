import type { Homework } from '../../../../types/training';

const FIXED_COACH = 'Juan Cruz';
const FALLBACK_COACH = 'Profe';

/** Most frequent coach other than the fixed one among the loaded tasks. */
export const defaultCoach = (items: Pick<Homework, 'coach'>[]): string => {
  const counts = new Map<string, number>();
  for (const { coach } of items) {
    const name = coach?.trim();
    if (name && name !== FIXED_COACH) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = FALLBACK_COACH;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
};

/** Unique, non-empty: the current value, the coaches in the data, and the fixed one. */
export const coachOptions = (
  current: string | undefined,
  items: Pick<Homework, 'coach'>[],
): string[] => {
  const all = [current, ...items.map(h => h.coach), FIXED_COACH];
  return [...new Set(all.map(c => c?.trim()).filter((c): c is string => !!c))];
};
