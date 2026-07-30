/**
 * Which tournament last moved the FIDE standard rating, and by how much.
 *
 * `profile.elo_change_last_tournament` / `last_tournament` were typed in by
 * hand, so they went stale the moment an event was imported and nobody
 * remembered to edit them. Both are already implied by the `tournaments`
 * table, so they are derived from it.
 *
 * Two rules do the work:
 *
 *  - Only `affects_elo` events count. The team rapid events carry an
 *    `elo_change` of their own (Necochea +19.8, Copa AFA XX +1.4) but that is
 *    the rapid rating; the badge sits next to a standard rating and would be
 *    reporting a different pool's movement.
 *  - The federation's own figure wins over the sum of the per-game changes.
 *    They disagree — IRT Carnaval is -1.6 officially and -1 by summing —
 *    because FIDE rounds once at the end, not per game.
 */

export interface TournamentEloRow {
  name: string;
  /** End date, or start date when the event has no end. `YYYY-MM-DD`. */
  date: string | null;
  affectsElo: boolean;
  /** The federation's own rating change for the event. */
  eloChange: number | null;
  /** Sum of the per-game changes, used only when the official figure is absent. */
  gamesChange: number | null;
}

export interface LastTournament {
  name: string;
  /** Rounded to whole points, which is how a rating change is quoted. */
  eloChange: number | null;
}

export const pickLastTournament = (rows: TournamentEloRow[]): LastTournament | null => {
  const rated = rows.filter(row => row.affectsElo && row.date);
  if (rated.length === 0) return null;

  // Latest date wins; name breaks a same-day tie so the result is stable.
  const last = [...rated].sort(
    (a, b) => a.date!.localeCompare(b.date!) || a.name.localeCompare(b.name)
  )[rated.length - 1];

  const change = last.eloChange ?? last.gamesChange;
  return { name: last.name, eloChange: change === null ? null : Math.round(change) };
};
