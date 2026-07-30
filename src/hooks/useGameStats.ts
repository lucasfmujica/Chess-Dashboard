import { useMemo } from 'react';
import { ecoNames } from '../constants/ecoNames';
import { hasEco } from '../utils/eco';
import { TOURNAMENT_DATA, TOURNAMENT_ORDER, type TournamentDataEntry } from '../constants/chessConstants';
import {
  calculateGameStats,
  getEloRatingBracket,
  calculateExpectedScore,
  getActualScore,
} from '../utils/eloCalculations';
import type { Game, EloRatingBracket } from '../types/chess';

interface TournamentBucket {
  games: Game[];
  wins: number;
  draws: number;
  losses: number;
}

interface EcoBucket {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  name: string;
}

interface AllEcoBucket extends EcoBucket {
  color: Record<string, number>;
}

interface BracketBucket {
  name: string;
  games: Game[];
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Custom hook for calculating comprehensive game statistics.
 */
export const useGameStats = (ratedGames: Game[]) => {
  // Overall statistics
  const overallStats = useMemo(() => calculateGameStats(ratedGames), [ratedGames]);

  /**
   * Games that move the FIDE curve.
   *
   * `rated` cannot express this on its own — it is the single filter feeding
   * every analytic surface, so excluding a team rapid event with `rated` would
   * also drop it from per-tournament performance, opponent brackets, colour
   * splits, streaks and records. `affectsElo` narrows the exclusion to the
   * rating curve alone. Older rows have no value, so undefined means true.
   */
  const eloGames = useMemo(
    () => ratedGames.filter(g => g.affectsElo !== false),
    [ratedGames]
  );

  // ELO history with expected vs actual performance
  const eloHistory = useMemo(() => {
    // Seed from the first game's own recorded rating rather than a hardcoded
    // constant: OTB and Lichess ratings live on different scales, so whichever
    // source starts the (possibly filtered) sequence sets the baseline.
    let currentElo = eloGames[0]?.elo || 1651;
    let ratedGameCount = 0; // Count of all rated games (including vs unrated opponents)

    return eloGames.map((game) => {
      ratedGameCount++;

      // Use game's kFactor if available, otherwise determine by game count
      const kFactor = game.kFactor || (ratedGameCount <= 27 ? 40 : 20);

      let expectedScore: number;
      let actualScore: number;
      let eloChange: number;
      let elo: number;
      let eloBefore: number;

      if (game.source === 'lichess' && game.elo) {
        // Lichess reports the real post-game rating and the real rating change for
        // every game — each entry is self-contained ground truth, so derive eloBefore
        // from it directly instead of chaining off the running estimate (which would
        // drift, and doesn't apply across the OTB/online rating-pool boundary anyway).
        elo = game.elo;
        eloChange = game.eloChange ?? 0;
        eloBefore = elo - eloChange;
        actualScore = getActualScore(game.result);
        expectedScore = game.opp_elo ? calculateExpectedScore(eloBefore, game.opp_elo) : 0.5;
      } else if (game.opp_elo === 0) {
        eloBefore = currentElo;
        // Game against unrated opponent - no ELO change
        expectedScore = 0.5; // Neutral expectation for display
        actualScore = getActualScore(game.result);
        eloChange = 0;
        elo = eloBefore + eloChange;
      } else {
        eloBefore = currentElo;
        // Calculate expected score using ELO formula
        expectedScore = calculateExpectedScore(eloBefore, game.opp_elo);
        actualScore = getActualScore(game.result);

        // Use actual ELO change from game data if available, otherwise calculate
        if (game.eloChange !== undefined) {
          eloChange = game.eloChange;
        } else {
          // Calculate ELO change: ΔR = K · (S - E)
          eloChange = Math.round(kFactor * (actualScore - expectedScore));
        }
        elo = eloBefore + eloChange;
      }

      currentElo = elo;

      return {
        game: ratedGameCount,
        eloBefore,
        elo,
        eloChange,
        date: game.date,
        tournament: game.tournament,
        opponent: game.opp,
        eco: game.eco,
        opening: ecoNames[game.eco] || game.eco,
        expected: expectedScore,
        actual: actualScore,
        diff: actualScore - expectedScore,
        kFactor,
      };
    });
  }, [eloGames]);

  // Tournament statistics with performance ratings
  const tournamentStats = useMemo(() => {
    const byTournament: Record<string, TournamentBucket> = {};

    ratedGames.forEach(game => {
      if (!byTournament[game.tournament]) {
        byTournament[game.tournament] = { games: [], wins: 0, draws: 0, losses: 0 };
      }
      byTournament[game.tournament].games.push(game);
      if (game.result === 'W') byTournament[game.tournament].wins++;
      if (game.result === 'D') byTournament[game.tournament].draws++;
      if (game.result === 'L') byTournament[game.tournament].losses++;
    });

    // Every tournament that has games appears. This used to be
    // `TOURNAMENT_ORDER.filter(...)` — a hardcoded allow-list of seven names,
    // which silently dropped any tournament not in it from this tab, the
    // performance chart, the monthly stats and the norm-tracker picker.
    // Order is derived from the games themselves: earliest played date first,
    // falling back to the legacy constant's order for tournaments whose games
    // have no date.
    const earliestDate = (name: string): string =>
      byTournament[name].games
        .map(g => g.date)
        .filter((d): d is string => !!d)
        .sort()[0] ?? '';

    return Object.keys(byTournament)
      .sort((a, b) => {
        const dateA = earliestDate(a);
        const dateB = earliestDate(b);
        if (dateA && dateB) return dateA.localeCompare(dateB);
        if (dateA) return -1;
        if (dateB) return 1;
        return TOURNAMENT_ORDER.indexOf(a) - TOURNAMENT_ORDER.indexOf(b);
      })
      .map(tournament => {
        const stats = byTournament[tournament];
        const gameStats = calculateGameStats(stats.games);

        // Calculate color-specific performance
        const whiteGames = stats.games.filter(g => g.color === 'W');
        const blackGames = stats.games.filter(g => g.color === 'B');
        const whiteStats = whiteGames.length > 0 ? calculateGameStats(whiteGames) : null;
        const blackStats = blackGames.length > 0 ? calculateGameStats(blackGames) : null;

        const tournamentData: Partial<TournamentDataEntry> = TOURNAMENT_DATA[tournament] || {};

        return {
          tournament,
          name: tournament,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          total: stats.games.length,
          score: gameStats.score,
          performanceRating: tournamentData.performanceRating || gameStats.performanceRating,
          avgOppElo: gameStats.avgOppElo,
          eloChange: tournamentData.eloChange || 0,
          eloBefore: tournamentData.startElo || 1651,
          eloAfter: (tournamentData.startElo || 1651) + (tournamentData.eloChange || 0),
          whitePerformance: whiteStats?.performanceRating ?? '-',
          blackPerformance: blackStats?.performanceRating ?? '-',
        };
      });
  }, [ratedGames]);

  // Best and worst results
  const bestResults = useMemo(() => {
    return ratedGames
      .filter(g => g.result === 'W' && g.opp_elo > 0)
      .sort((a, b) => (b.opp_elo - a.elo) - (a.opp_elo - a.elo))
      .slice(0, 3)
      .map(g => ({
        opponent: g.opp,
        elo: g.elo,
        oppElo: g.opp_elo,
        diff: g.opp_elo - g.elo,
        eco: g.eco,
        opening: ecoNames[g.eco] || g.eco,
        color: g.color,
        tournament: g.tournament,
      }));
  }, [ratedGames]);

  const worstResults = useMemo(() => {
    return ratedGames
      .filter(g => g.result === 'L' && g.opp_elo > 0)
      .sort((a, b) => (b.elo - b.opp_elo) - (a.elo - a.opp_elo))
      .slice(0, 3)
      .map(g => ({
        opponent: g.opp,
        elo: g.elo,
        oppElo: g.opp_elo,
        diff: g.elo - g.opp_elo,
        eco: g.eco,
        opening: ecoNames[g.eco] || g.eco,
        color: g.color,
        tournament: g.tournament,
      }));
  }, [ratedGames]);

  // Opponent bracket statistics
  const opponentBracketStats = useMemo(() => {
    const brackets: Record<EloRatingBracket, BracketBucket> = {
      lower: { name: 'Lower rated (-100+)', games: [], wins: 0, draws: 0, losses: 0 },
      similar: { name: 'Similar (±100)', games: [], wins: 0, draws: 0, losses: 0 },
      higher: { name: 'Higher rated (+100+)', games: [], wins: 0, draws: 0, losses: 0 },
    };

    ratedGames.filter(g => g.opp_elo > 0).forEach(game => {
      const bracket = getEloRatingBracket(game.elo, game.opp_elo);

      brackets[bracket].games.push(game);
      if (game.result === 'W') brackets[bracket].wins++;
      if (game.result === 'D') brackets[bracket].draws++;
      if (game.result === 'L') brackets[bracket].losses++;
    });

    return Object.values(brackets).map(b => ({
      bracket: b.name,
      total: b.games.length,
      wins: b.wins,
      draws: b.draws,
      losses: b.losses,
      winRate: b.games.length > 0 ? ((b.wins / b.games.length) * 100).toFixed(1) : '0.0',
      score: `${(b.wins + b.draws * 0.5).toFixed(1)}/${b.games.length}`,
    }));
  }, [ratedGames]);

  // Helper to build per-ECO opening stats for a set of single-color games.
  // The record (`stats`) covers every game; only the per-opening breakdown
  // drops the unclassified ones, since they have no opening to break down by.
  const buildColorStats = (colorGames: Game[]) => {
    const stats = calculateGameStats(colorGames);

    const ecoStats: Record<string, EcoBucket> = {};
    colorGames.filter(g => hasEco(g.eco)).forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = { games: 0, wins: 0, draws: 0, losses: 0, name: ecoNames[game.eco] || game.eco };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;
    });

    const openings = Object.entries(ecoStats)
      .map(([eco, openingStats]) => ({
        eco,
        name: openingStats.name,
        games: openingStats.games,
        wins: openingStats.wins,
        draws: openingStats.draws,
        losses: openingStats.losses,
        score: `${(openingStats.wins + openingStats.draws * 0.5).toFixed(1)}/${openingStats.games}`,
        winRate: ((openingStats.wins / openingStats.games) * 100).toFixed(1),
      }))
      .sort((a, b) => b.games - a.games);

    return { ...stats, openings };
  };

  // Statistics by color
  const whiteStats = useMemo(
    () => buildColorStats(ratedGames.filter(g => g.color === 'W')),
    [ratedGames] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const blackStats = useMemo(
    () => buildColorStats(ratedGames.filter(g => g.color === 'B')),
    [ratedGames] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * All openings statistics.
   *
   * Games with no ECO are left out instead of piling into an "Unknown"
   * opening: they are crosstable imports with no movetext, and bucketing them
   * invented the biggest and worst-scoring line in the repertoire tables,
   * charts and recommendations. `gamesWithoutEco` keeps them countable.
   */
  const allOpeningsStats = useMemo(() => {
    const ecoStats: Record<string, AllEcoBucket> = {};

    ratedGames.filter(g => hasEco(g.eco)).forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          color: {},
          name: ecoNames[game.eco] || game.eco,
        };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;

      if (!ecoStats[game.eco].color[game.color]) {
        ecoStats[game.eco].color[game.color] = 0;
      }
      ecoStats[game.eco].color[game.color]++;
    });

    return Object.entries(ecoStats)
      .map(([eco, stats]) => ({
        eco,
        name: stats.name,
        games: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
        winRate: parseFloat(((stats.wins / stats.games) * 100).toFixed(1)),
        asWhite: stats.color['W'] || 0,
        asBlack: stats.color['B'] || 0,
      }))
      .sort((a, b) => b.games - a.games);
  }, [ratedGames]);

  /** How many rated games carry no ECO, so the gap can be stated rather than hidden. */
  const gamesWithoutEco = useMemo(
    () => ratedGames.filter(g => !hasEco(g.eco)).length,
    [ratedGames]
  );

  return {
    overallStats,
    eloHistory,
    tournamentStats,
    bestResults,
    worstResults,
    opponentBracketStats,
    whiteStats,
    blackStats,
    allOpeningsStats,
    gamesWithoutEco,
  };
};
