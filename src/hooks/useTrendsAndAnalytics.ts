import { useMemo } from 'react';
import { TOURNAMENT_DATA, type TournamentDataEntry } from '../constants/chessConstants';
import { calculateGameStats } from '../utils/eloCalculations';
import type { Game, StreakState, StreakType, Tournament } from '../types/chess';

interface MonthBucket {
  tournament: string;
  order: number;
  month: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  percentage: number;
  performanceRating: number;
  elo: number;
  eloChange: number;
}

interface TimeSlotBucket {
  games: Game[];
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Chronological list of the tournaments actually present in `games`.
 *
 * Derived, not declared. This used to walk a hardcoded TOURNAMENT_ORDER of the
 * original seven events, which silently dropped every tournament played since —
 * five of them, thirty games — from the trend line: a tournament missing from
 * that list simply never got a bucket. Ordering by the earliest dated game of
 * each event keeps new tournaments appearing on their own.
 */
const tournamentsInOrder = (games: Game[]): { name: string; firstDate?: string }[] => {
  const earliest = new Map<string, string | undefined>();
  games.forEach(game => {
    if (!game.tournament) return;
    const current = earliest.get(game.tournament);
    if (!earliest.has(game.tournament)) {
      earliest.set(game.tournament, game.date);
    } else if (game.date && (!current || game.date < current)) {
      earliest.set(game.tournament, game.date);
    }
  });

  return [...earliest.entries()]
    .map(([name, firstDate]) => ({ name, firstDate }))
    // Undated events sort last rather than to the epoch, which would fake an
    // early tournament and bend the start of the curve.
    .sort((a, b) => (a.firstDate ?? '9999').localeCompare(b.firstDate ?? '9999'));
};

/**
 * Custom hook for trends, streaks, and time-based analytics.
 * Everything here derives from `ratedGames`, which the caller has already run
 * through the header's source filter — passing the raw games list for any of it
 * leaks Lichess games into panels the user filtered to OTB.
 *
 * `tournaments` carries the official record scraped from chess-results
 * (performance, ELO change). It is looked up, never required: an event with no
 * row still gets a bucket computed from its games.
 */
export const useTrendsAndAnalytics = (ratedGames: Game[], tournaments: Tournament[] = []) => {
  const officialByName = useMemo(
    () => new Map(tournaments.map(t => [t.name, t])),
    [tournaments]
  );

  // Monthly/Tournament statistics over time
  const monthlyStats = useMemo(() => {
    const buckets: MonthBucket[] = [];

    tournamentsInOrder(ratedGames).forEach(({ name, firstDate }, idx) => {
      const tournamentGames = ratedGames.filter(g => g.tournament === name);
      if (tournamentGames.length === 0) return;

      const stats = calculateGameStats(tournamentGames);
      const official = officialByName.get(name);
      const legacy: Partial<TournamentDataEntry> = TOURNAMENT_DATA[name] ?? {};

      buckets.push({
        tournament: name,
        order: idx,
        month: firstDate?.slice(0, 10) ?? legacy.date ?? name,
        games: stats.total,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        winRate: parseFloat(stats.winRate),
        percentage: parseFloat(stats.winRate), // Add percentage for compatibility
        performanceRating: stats.performanceRating,
        elo: official?.eloBefore ?? tournamentGames[0].elo,
        // A team rapid event publishes a rating change that never reached the
        // FIDE curve, so it contributes 0 here however chess-results computes it.
        eloChange:
          official && !official.affectsElo ? 0 : (official?.eloChange ?? legacy.eloChange ?? 0),
      });
    });

    return buckets;
  }, [ratedGames, officialByName]);

  // Recent form statistics
  const formStats = useMemo(() => {
    const calculateForm = (lastN: number) => {
      const recentGames = ratedGames.slice(-lastN);
      const wins = recentGames.filter(g => g.result === 'W').length;
      const draws = recentGames.filter(g => g.result === 'D').length;
      const losses = recentGames.filter(g => g.result === 'L').length;
      const score = wins + draws * 0.5;

      return {
        games: recentGames.length,
        wins,
        draws,
        losses,
        score: `${score.toFixed(1)}/${recentGames.length}`,
        percentage: recentGames.length > 0 ? ((score / recentGames.length) * 100).toFixed(1) : '0',
        results: recentGames.map(g => g.result).reverse(),
        details: recentGames.map(g => g.result).reverse(), // Keep for backward compatibility
      };
    };

    return {
      last5: calculateForm(5),
      last10: calculateForm(10),
    };
  }, [ratedGames]);

  // Win/loss streaks
  const streaks = useMemo(() => {
    const currentStreak: StreakState = { type: null, count: 0 };
    let longestWinStreak = 0;
    let longestUnbeatenStreak = 0;
    let currentWinStreak = 0;
    let currentUnbeatenStreak = 0;

    ratedGames.forEach(game => {
      if (game.result === 'W') {
        currentWinStreak++;
        currentUnbeatenStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else if (game.result === 'D') {
        currentWinStreak = 0;
        currentUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else {
        currentWinStreak = 0;
        currentUnbeatenStreak = 0;
      }
    });

    // Calculate current streak
    for (let i = ratedGames.length - 1; i >= 0; i--) {
      const game = ratedGames[i];
      const resultType: StreakType = game.result === 'L' ? 'loss' : game.result === 'W' ? 'win' : 'unbeaten';
      if (currentStreak.type === null) {
        currentStreak.type = resultType;
        currentStreak.count = 1;
      } else if (
        (currentStreak.type === 'win' && game.result === 'W') ||
        (currentStreak.type === 'loss' && game.result === 'L') ||
        (currentStreak.type === 'unbeaten' && (game.result === 'W' || game.result === 'D'))
      ) {
        currentStreak.count++;
      } else {
        break;
      }
    }

    return {
      current: currentStreak,
      longestWin: longestWinStreak,
      longestUnbeaten: longestUnbeatenStreak,
    };
  }, [ratedGames]);

  // Time of day statistics
  const timeOfDayStats = useMemo(() => {
    const timeSlots: Record<string, TimeSlotBucket> = {
      'Morning (9-12)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Afternoon (13-17)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Evening (18-20)': { games: [], wins: 0, draws: 0, losses: 0 },
    };

    // Use ratedGames instead of all games for consistency and better performance
    ratedGames.forEach(game => {
      if (!game.time) return;

      const hour = parseInt(game.time.split(':')[0]);
      let slot: string | undefined;

      if (hour >= 9 && hour <= 12) slot = 'Morning (9-12)';
      else if (hour >= 13 && hour <= 17) slot = 'Afternoon (13-17)';
      else if (hour >= 18 && hour <= 20) slot = 'Evening (18-20)';

      if (slot && timeSlots[slot]) {
        timeSlots[slot].games.push(game);
        if (game.result === 'W') timeSlots[slot].wins++;
        else if (game.result === 'D') timeSlots[slot].draws++;
        else if (game.result === 'L') timeSlots[slot].losses++;
      }
    });

    return Object.entries(timeSlots)
      .map(([time, data]) => ({
        time,
        total: data.games.length,
        wins: data.wins,
        draws: data.draws,
        losses: data.losses,
        score: data.games.length > 0 ? ((data.wins + data.draws * 0.5) / data.games.length * 100).toFixed(1) : '0',
        winRate: data.games.length > 0 ? ((data.wins / data.games.length) * 100).toFixed(1) : '0',
      }))
      .filter(slot => slot.total > 0);
  }, [ratedGames]);

  // Tournament comparison data
  const tournamentComparison = useMemo(() => {
    const ratedTournaments = ratedGames.reduce<Record<string, Game[]>>((acc, game) => {
      if (!acc[game.tournament]) {
        acc[game.tournament] = [];
      }
      acc[game.tournament].push(game);
      return acc;
    }, {});

    return Object.entries(ratedTournaments).map(([name, tournamentGames]) => {
      const wins = tournamentGames.filter(g => g.result === 'W').length;
      const draws = tournamentGames.filter(g => g.result === 'D').length;
      const losses = tournamentGames.filter(g => g.result === 'L').length;
      const score = ((wins + draws * 0.5) / tournamentGames.length * 100).toFixed(1);

      const oppElos = tournamentGames.filter(g => g.opp_elo > 0).map(g => g.opp_elo);
      const avgOppElo = oppElos.length > 0
        ? Math.round(oppElos.reduce((a, b) => a + b, 0) / oppElos.length)
        : 0;

      const official = officialByName.get(name);
      const legacy: Partial<TournamentDataEntry> = TOURNAMENT_DATA[name] || {};
      const playerElo = official?.eloBefore ?? tournamentGames[0]?.elo ?? 0;

      return {
        name,
        games: tournamentGames.length,
        wins,
        draws,
        losses,
        score: parseFloat(score),
        avgOppElo,
        playerElo,
        // "Lichess Online" is one bucket holding every online game, not an
        // event. It belongs in the table but not in a "best tournament
        // performance" figure, which it would win on volume alone.
        otb: tournamentGames.some(g => (g.source ?? 'otb') === 'otb'),
        // Zero for an event that never reached the FIDE curve, whatever figure
        // chess-results publishes for it.
        eloChange:
          official && !official.affectsElo ? 0 : (official?.eloChange ?? legacy.eloChange ?? 0),
        // Prefer the official rating, then the hardcoded legacy map, then the
        // rating computed from the games — so an event with no chess-results
        // row still shows a performance instead of an empty cell.
        performance:
          official?.officialPerformance ??
          legacy.performanceRating ??
          (avgOppElo > 0 ? calculateGameStats(tournamentGames).performanceRating : null),
      };
    });
  }, [ratedGames, officialByName]);

  return {
    monthlyStats,
    formStats,
    streaks,
    timeOfDayStats,
    tournamentComparison,
  };
};
