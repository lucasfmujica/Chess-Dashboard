import type { Game } from '../types/chess';
import { calculateExpectedScore, getActualScore } from './eloCalculations';

/** Aggregate of a group of games: score vs. Elo-expected score. */
export interface BracketStats {
  games: number;
  bracketGames: Game[];
  wins: number;
  draws: number;
  losses: number;
  /** Points, one decimal ("2.5"). */
  score: string;
  winRate: number;
  scorePercentage: number;
  avgEloDiff: number;
  expectedPercentage: number;
  /** scorePercentage − expectedPercentage, one decimal. */
  performance: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Summarise a list of games. The expected score is computed per game with the
 * player's own ELO at the time of that game (Elo formula), then averaged.
 * Callers must pass games with both `elo` and `opp_elo` known.
 */
export const summarizeBracket = (bracketGames: Game[]): BracketStats => {
  const total = bracketGames.length;
  const wins = bracketGames.filter(g => g.result === 'W').length;
  const draws = bracketGames.filter(g => g.result === 'D').length;
  const losses = bracketGames.filter(g => g.result === 'L').length;
  const points = bracketGames.reduce((s, g) => s + getActualScore(g.result), 0);
  const expected = bracketGames.reduce((s, g) => s + calculateExpectedScore(g.elo, g.opp_elo), 0);

  const scorePercentage = total ? round1((points / total) * 100) : 0;
  const expectedPercentage = total ? round1((expected / total) * 100) : 0;

  return {
    games: total,
    bracketGames,
    wins,
    draws,
    losses,
    score: points.toFixed(1),
    winRate: total ? round1((wins / total) * 100) : 0,
    scorePercentage,
    avgEloDiff: total ? Math.round(bracketGames.reduce((s, g) => s + (g.opp_elo - g.elo), 0) / total) : 0,
    expectedPercentage,
    performance: total ? round1(scorePercentage - expectedPercentage) : 0,
  };
};

/** Absolute opponent-ELO bands. `max` is inclusive. */
export const OPPONENT_ELO_BANDS = [
  { label: 'Menos de 1600', min: -Infinity, max: 1599, color: 'rgb(var(--cat-3))' },
  { label: '1600–1799', min: 1600, max: 1799, color: 'rgb(var(--cat-6))' },
  { label: '1800–1999', min: 1800, max: 1999, color: 'rgb(var(--cat-1))' },
  { label: '2000 o más', min: 2000, max: Infinity, color: 'rgb(var(--cat-2))' },
] as const;

export type OpponentEloBand = BracketStats & { label: string; min: number; max: number; color: string };

export interface OpponentEloBandResult {
  bands: OpponentEloBand[];
  /** Games left out because the opponent has no ELO (0 or missing). */
  excluded: number;
}

/**
 * Group games by the opponent's absolute ELO. Games whose opponent has no
 * ELO (`opp_elo` 0, null or undefined) are left out and counted in `excluded`.
 * Every band is returned, including empty ones, in ascending order.
 */
export const groupByOpponentElo = (games: Game[]): OpponentEloBandResult => {
  const withOpp = games.filter(g => (g.opp_elo ?? 0) > 0);
  const bands = OPPONENT_ELO_BANDS.map(band => ({
    label: band.label,
    min: band.min,
    max: band.max,
    color: band.color,
    ...summarizeBracket(withOpp.filter(g => g.opp_elo >= band.min && g.opp_elo <= band.max)),
  }));
  return { bands, excluded: games.length - withOpp.length };
};
