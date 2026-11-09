/**
 * Running score for over-the-board play: W = 1, D = 0.5, L = 0.
 *
 * Two views of the same games. By round, the way a tournament crosstable reads
 * ("after round 4 I have 2.5"); and by game of the day, for days with several
 * games where the round is not recorded. Online games are never counted.
 */

import type { Game, GameResult } from '../types/chess';
import { isOtb } from './tournamentPrep';

const POINTS: Record<GameResult, number> = { W: 1, D: 0.5, L: 0 };

export interface RoundScore {
  tournament: string;
  round: string;
  opp: string;
  result: GameResult;
  points: number;
  /** Points accumulated in the tournament up to and including this round. */
  total: number;
}

export interface GameOfDayScore {
  date: string;
  /** 1-based position in the day, ordered by time, then round. */
  gameNo: number;
  opp: string;
  result: GameResult;
  points: number;
  /** Points accumulated that day up to and including this game. */
  total: number;
}

/** '2' < '10' < '10.1'; falls back to text order for non-numeric rounds. */
const compareRounds = (a: string, b: string): number => {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
};

/**
 * OTB games that carry a round, grouped by tournament and ordered by round,
 * each with the tournament's score so far. Tournaments come out in the order
 * of their earliest game.
 */
export const scoreByRound = (games: Game[]): RoundScore[] => {
  const byTournament = new Map<string, Game[]>();
  for (const game of games) {
    if (!isOtb(game) || !game.round) continue;
    const list = byTournament.get(game.tournament) ?? [];
    list.push(game);
    byTournament.set(game.tournament, list);
  }

  const earliest = (list: Game[]) => list.reduce((min, g) => ((g.date ?? '') < min ? (g.date ?? '') : min), '9999');
  const ordered = [...byTournament.entries()].sort(
    ([, a], [, b]) => earliest(a).localeCompare(earliest(b))
  );

  return ordered.flatMap(([tournament, list]) => {
    let total = 0;
    return [...list]
      .sort((a, b) => compareRounds(a.round as string, b.round as string))
      .map(game => {
        total += POINTS[game.result];
        return {
          tournament,
          round: game.round as string,
          opp: game.opp,
          result: game.result,
          points: POINTS[game.result],
          total,
        };
      });
  });
};

/**
 * OTB games grouped by date, ordered within the day by time and then round,
 * each with the day's score so far. Days come out oldest first.
 */
export const scoreByGameOfDay = (games: Game[]): GameOfDayScore[] => {
  const byDate = new Map<string, Game[]>();
  for (const game of games) {
    if (!isOtb(game) || !game.date) continue;
    const list = byDate.get(game.date) ?? [];
    list.push(game);
    byDate.set(game.date, list);
  }

  return [...byDate.keys()].sort().flatMap(date => {
    let total = 0;
    return (byDate.get(date) as Game[])
      .map((game, index) => ({ game, index }))
      .sort(
        (a, b) =>
          (a.game.time ?? '').localeCompare(b.game.time ?? '') ||
          compareRounds(a.game.round ?? '', b.game.round ?? '') ||
          a.index - b.index
      )
      .map(({ game }, i) => {
        total += POINTS[game.result];
        return { date, gameNo: i + 1, opp: game.opp, result: game.result, points: POINTS[game.result], total };
      });
  });
};

/** '2.5/4' style label. */
export const formatScore = (points: number, games: number): string => `${points}/${games}`;
