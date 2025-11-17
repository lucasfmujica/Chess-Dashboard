import { useMemo } from 'react';
import { ecoNames } from '../constants/ecoNames';
import { TOURNAMENT_DATA, TOURNAMENT_ORDER } from '../constants/chessConstants';
import {
  calculateGameStats,
  getEloRatingBracket,
  calculateExpectedScore,
  getActualScore,
} from '../utils/eloCalculations';

/**
 * Custom hook for calculating comprehensive game statistics
 */
export const useGameStats = (games, filteredGames, ratedGames) => {
  // Overall statistics
  const overallStats = useMemo(() => calculateGameStats(ratedGames), [ratedGames]);

  // ELO history with expected vs actual performance
  const eloHistory = useMemo(() => {
    let currentElo = 1651; // Starting ELO
    let ratedGameCount = 0; // Count of actual rated games (excluding unrated opponents)

    return ratedGames
      .filter(game => game.opp_elo > 0) // Only include games against rated opponents
      .map((game, idx) => {
        ratedGameCount++;

        // Use game's kFactor if available, otherwise determine by game count
        const kFactor = game.kFactor || (ratedGameCount <= 27 ? 40 : 20);

        // Calculate expected score using ELO formula
        const expectedScore = calculateExpectedScore(currentElo, game.opp_elo);
        const actualScore = getActualScore(game.result);

        // Use actual ELO change from game data if available, otherwise calculate
        let eloChange;
        if (game.eloChange !== undefined) {
          eloChange = game.eloChange;
        } else {
          // Calculate ELO change: ΔR = K · (S - E)
          eloChange = Math.round(kFactor * (actualScore - expectedScore));
        }

        // Store the ELO before this game
        const eloBefore = currentElo;

        // Calculate new ELO: R_new = R_old + ΔR
        currentElo = currentElo + eloChange;

        return {
          game: ratedGameCount,
          eloBefore: eloBefore,
          elo: currentElo,
          eloChange: eloChange,
          tournament: game.tournament,
          opponent: game.opp,
          eco: game.eco,
          opening: ecoNames[game.eco] || game.eco,
          expected: expectedScore,
          actual: actualScore,
          diff: actualScore - expectedScore,
          kFactor: kFactor,
        };
      });
  }, [ratedGames]);

  // Tournament statistics with performance ratings
  const tournamentStats = useMemo(() => {
    const byTournament = {};

    ratedGames.forEach(game => {
      if (!byTournament[game.tournament]) {
        byTournament[game.tournament] = {
          games: [],
          wins: 0,
          draws: 0,
          losses: 0,
        };
      }
      byTournament[game.tournament].games.push(game);
      if (game.result === 'W') byTournament[game.tournament].wins++;
      if (game.result === 'D') byTournament[game.tournament].draws++;
      if (game.result === 'L') byTournament[game.tournament].losses++;
    });

    return TOURNAMENT_ORDER
      .filter(t => byTournament[t])
      .map(tournament => {
        const stats = byTournament[tournament];
        const gameStats = calculateGameStats(stats.games);

        // Calculate color-specific performance
        const whiteGames = stats.games.filter(g => g.color === 'W');
        const blackGames = stats.games.filter(g => g.color === 'B');
        const whiteStats = whiteGames.length > 0 ? calculateGameStats(whiteGames) : null;
        const blackStats = blackGames.length > 0 ? calculateGameStats(blackGames) : null;

        const tournamentData = TOURNAMENT_DATA[tournament] || {};

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
          whitePerformance: whiteStats?.performanceRating || '-',
          blackPerformance: blackStats?.performanceRating || '-',
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
    const brackets = {
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

  // Statistics by color
  const whiteStats = useMemo(() => {
    const whiteGames = ratedGames.filter(g => g.color === 'W');
    const stats = calculateGameStats(whiteGames);

    const ecoStats = {};
    whiteGames.forEach(game => {
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
  }, [ratedGames]);

  const blackStats = useMemo(() => {
    const blackGames = ratedGames.filter(g => g.color === 'B');
    const stats = calculateGameStats(blackGames);

    const ecoStats = {};
    blackGames.forEach(game => {
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
  }, [ratedGames]);

  // All openings statistics
  const allOpeningsStats = useMemo(() => {
    const ecoStats = {};

    ratedGames.forEach(game => {
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
  };
};
