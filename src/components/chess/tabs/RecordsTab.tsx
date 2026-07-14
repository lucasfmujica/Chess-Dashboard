import { useMemo } from 'react';
import { TrophyIcon, StarIcon, FireIcon, UserGroupIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Game } from '../../../types/chess';

/** Game enriched with optional per-game fields used for record-keeping. */
type RecordGame = Game & {
  moves?: unknown[];
  performanceRating?: number;
};

/** A single ELO-history datapoint. */
interface EloHistoryEntry {
  elo: number;
  date?: string;
  game?: number;
}

/** Best-performing tournament aggregate. */
interface TournamentRecord {
  name: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
  score: string | number;
}

/** Most wins against a single opponent. */
interface MostWinsRecord {
  opponent: string;
  wins: number;
}

/** Favourite (most-played) opening. */
interface FavoriteOpeningRecord {
  opening: string;
  count: number;
}

/** Computed hall-of-fame records. */
interface Records {
  highestRating: number;
  highestRatingDate: string;
  lowestRating: number;
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  bestTournament: TournamentRecord | null;
  highestRatedOpponent: RecordGame | null;
  mostWinsVsOpponent: MostWinsRecord | null;
  quickestWin: RecordGame | null;
  longestGame: RecordGame | null;
  favoriteOpening: FavoriteOpeningRecord | null;
  bestPerformance: RecordGame | null;
}

interface RecordsTabProps {
  games: RecordGame[];
  eloHistory?: EloHistoryEntry[];
}

const RecordsTab = ({ games, eloHistory }: RecordsTabProps) => {
  // Calculate personal records
  const records = useMemo<Records>(() => {
    if (!games || games.length === 0) {
      return {
        highestRating: 0,
        highestRatingDate: 'N/A',
        lowestRating: 0,
        longestWinStreak: 0,
        longestUnbeatenStreak: 0,
        bestTournament: null,
        highestRatedOpponent: null,
        mostWinsVsOpponent: null,
        quickestWin: null,
        longestGame: null,
        favoriteOpening: null,
        bestPerformance: null
      };
    }

    // Highest Rating
    let highestRating = 0;
    let highestRatingDate = '';
    let lowestRating = Infinity;

    if (eloHistory && eloHistory.length > 0) {
      eloHistory.forEach(entry => {
        if (entry.elo > highestRating) {
          highestRating = entry.elo;
          highestRatingDate = entry.date || `Game ${entry.game}`;
        }
        if (entry.elo < lowestRating) {
          lowestRating = entry.elo;
        }
      });
    }

    // Longest Win Streak
    let longestWinStreak = 0;
    let currentWinStreak = 0;
    let longestUnbeatenStreak = 0;
    let currentUnbeatenStreak = 0;

    games.forEach(game => {
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

    // Best Tournament Performance
    const tournamentStats: Record<string, TournamentRecord> = {};
    games.forEach(game => {
      if (game.tournament) {
        if (!tournamentStats[game.tournament]) {
          tournamentStats[game.tournament] = {
            name: game.tournament,
            wins: 0,
            draws: 0,
            losses: 0,
            total: 0,
            score: 0
          };
        }
        tournamentStats[game.tournament].total++;
        if (game.result === 'W') tournamentStats[game.tournament].wins++;
        if (game.result === 'D') tournamentStats[game.tournament].draws++;
        if (game.result === 'L') tournamentStats[game.tournament].losses++;
      }
    });

    let bestTournament: TournamentRecord | null = null;
    Object.values(tournamentStats).forEach(t => {
      t.score = ((t.wins + t.draws * 0.5) / t.total * 100).toFixed(1);
      if (!bestTournament || parseFloat(String(t.score)) > parseFloat(String(bestTournament.score))) {
        bestTournament = t;
      }
    });

    // Highest Rated Opponent Defeated
    let highestRatedOpponent: RecordGame | null = null;
    games.forEach(game => {
      if (game.result === 'W' && game.opp_elo) {
        if (!highestRatedOpponent || parseInt(String(game.opp_elo)) > parseInt(String(highestRatedOpponent.opp_elo))) {
          highestRatedOpponent = game;
        }
      }
    });

    // Most Wins vs Same Opponent
    const opponentWins: Record<string, number> = {};
    games.forEach(game => {
      if (game.result === 'W' && game.opp) {
        opponentWins[game.opp] = (opponentWins[game.opp] || 0) + 1;
      }
    });

    let mostWinsVsOpponent: MostWinsRecord | null = null;
    Object.entries(opponentWins).forEach(([opponent, wins]) => {
      if (!mostWinsVsOpponent || wins > mostWinsVsOpponent.wins) {
        mostWinsVsOpponent = { opponent, wins };
      }
    });

    // Quickest Win (fewest moves)
    let quickestWin: RecordGame | null = null;
    games.forEach(game => {
      if (game.result === 'W' && game.moves) {
        const moveCount = game.moves.length;
        if (!quickestWin || moveCount < (quickestWin.moves?.length ?? Infinity)) {
          quickestWin = game;
        }
      }
    });

    // Longest Game (most moves)
    let longestGame: RecordGame | null = null;
    games.forEach(game => {
      if (game.moves) {
        const moveCount = game.moves.length;
        if (!longestGame || moveCount > (longestGame.moves?.length ?? 0)) {
          longestGame = game;
        }
      }
    });

    // Favorite Opening (most played)
    const openingCounts: Record<string, number> = {};
    games.forEach(game => {
      if (game.opening) {
        openingCounts[game.opening] = (openingCounts[game.opening] || 0) + 1;
      }
    });

    let favoriteOpening: FavoriteOpeningRecord | null = null;
    Object.entries(openingCounts).forEach(([opening, count]) => {
      if (!favoriteOpening || count > favoriteOpening.count) {
        favoriteOpening = { opening, count };
      }
    });

    // Best Performance Rating
    let bestPerformance: RecordGame | null = null;
    games.forEach(game => {
      if (game.performanceRating) {
        if (!bestPerformance || game.performanceRating > (bestPerformance.performanceRating ?? 0)) {
          bestPerformance = game;
        }
      }
    });

    return {
      highestRating,
      highestRatingDate,
      lowestRating: lowestRating === Infinity ? 0 : lowestRating,
      longestWinStreak,
      longestUnbeatenStreak,
      bestTournament,
      highestRatedOpponent,
      mostWinsVsOpponent,
      quickestWin,
      longestGame,
      favoriteOpening,
      bestPerformance
    };
  }, [games, eloHistory]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <StarIcon className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">Personal Records</h2>
              <p className="text-fg-muted">Your greatest chess achievements and milestones</p>
            </div>
          </div>

          {/* Top Records Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-2 rounded-lg p-4">
              <p className="text-fg-muted text-sm font-medium mb-1">Peak Rating</p>
              <p className="text-4xl font-bold text-fg tabular-nums">{records.highestRating}</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-4">
              <p className="text-fg-muted text-sm font-medium mb-1">Win Streak</p>
              <p className="text-4xl font-bold text-fg tabular-nums">{records.longestWinStreak}</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-4">
              <p className="text-fg-muted text-sm font-medium mb-1">Unbeaten</p>
              <p className="text-4xl font-bold text-fg tabular-nums">{records.longestUnbeatenStreak}</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-4">
              <p className="text-fg-muted text-sm font-medium mb-1">Rating Gain</p>
              <p className="text-4xl font-bold text-fg tabular-nums">+{records.highestRating - records.lowestRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-fg mb-2">Rating Milestones</h3>
          <p className="text-fg-muted">Your journey through the rating ladder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <TrophyIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-base font-semibold text-fg">Highest Rating</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{records.highestRating}</p>
                <p className="text-sm text-fg-muted">Achieved on</p>
                <p className="text-sm font-medium text-fg">{records.highestRatingDate}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-base font-semibold text-fg">Starting Rating</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{records.lowestRating}</p>
                <p className="text-sm text-fg-muted">Initial rating</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <SparklesIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-base font-semibold text-fg">Total Improvement</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-fg mb-2 tabular-nums">
                  +{records.highestRating - records.lowestRating}
                </p>
                <p className="text-sm text-fg-muted">points gained</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-fg mb-2">Performance Records</h3>
          <p className="text-fg-muted">Your most impressive competitive achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best Tournament */}
          {records.bestTournament && (
            <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <TrophyIcon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-base font-semibold text-fg">Best Tournament</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-fg-muted">Tournament</p>
                    <p className="text-lg font-bold text-fg">{records.bestTournament.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-fg-muted">Record</p>
                      <p className="text-md font-semibold text-fg">
                        {records.bestTournament.wins}-{records.bestTournament.draws}-{records.bestTournament.losses}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-fg-muted">Score</p>
                      <p className="text-md font-semibold text-accent">{records.bestTournament.score}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Longest Win Streak */}
          <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <FireIcon className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-base font-semibold text-fg">Win Streak Record</h4>
              </div>
              <div className="text-center py-6">
                <p className="text-6xl font-bold text-fg mb-2 tabular-nums">{records.longestWinStreak}</p>
                <p className="text-fg-muted">consecutive victories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-fg mb-2">Notable Games</h3>
          <p className="text-fg-muted">Memorable individual game achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Highest Rated Opponent */}
          {records.highestRatedOpponent && (
            <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <UserGroupIcon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-fg">Highest Rated Opponent Defeated</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-fg mb-1 tabular-nums">{records.highestRatedOpponent.opp_elo}</p>
                    <p className="text-sm text-fg-muted">{records.highestRatedOpponent.opp}</p>
                  </div>
                  <div className="pt-3 border-t border-hairline">
                    <p className="text-xs text-fg-muted">{records.highestRatedOpponent.opening}</p>
                    <p className="text-xs text-fg-subtle mt-1">{records.highestRatedOpponent.tournament}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quickest Win */}
          {records.quickestWin && (
            <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <FireIcon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-fg">Quickest Victory</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-fg mb-1 tabular-nums">{records.quickestWin.moves?.length}</p>
                    <p className="text-sm text-fg-muted">moves to victory</p>
                  </div>
                  <div className="pt-3 border-t border-hairline">
                    <p className="text-xs text-fg-muted">vs {records.quickestWin.opp}</p>
                    <p className="text-xs text-fg-subtle mt-1">{records.quickestWin.opening}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Longest Game */}
          {records.longestGame && (
            <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-surface-2 rounded-lg">
                    <ChartBarIcon className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-fg">Longest Battle</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-fg mb-1 tabular-nums">{records.longestGame.moves?.length}</p>
                    <p className="text-sm text-fg-muted">moves played</p>
                  </div>
                  <div className="pt-3 border-t border-hairline">
                    <p className="text-xs text-fg-muted">vs {records.longestGame.opp}</p>
                    <p className="text-xs text-fg-subtle mt-1">
                      Result: {records.longestGame.result === 'W' ? 'Won' : records.longestGame.result === 'D' ? 'Draw' : 'Lost'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opening Records */}
      {records.favoriteOpening && (
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-fg mb-2">Opening Preferences</h3>
              <p className="text-fg-muted">Your most-played opening systems</p>
            </div>

            <div className="flex items-center gap-6 p-6 bg-surface-2 rounded-lg border border-hairline">
              <div className="p-4 bg-surface rounded-lg">
                <span className="text-4xl">📚</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-fg-muted mb-1">Most Played Opening</h4>
                <p className="text-2xl font-bold text-fg">{records.favoriteOpening.opening}</p>
                <p className="text-sm text-fg-muted mt-2">
                  Played {records.favoriteOpening.count} times
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hall of Fame */}
      <div className="relative overflow-hidden bg-surface-2 rounded-lg border border-hairline">
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-surface rounded-full mb-4">
              <StarIcon className="w-12 h-12 text-accent" />
            </div>
            <h3 className="text-base font-semibold text-fg mb-2">Hall of Fame</h3>
            <p className="text-fg-muted">Your legacy in numbers</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-surface rounded-lg border border-hairline">
              <p className="text-3xl font-bold text-fg tabular-nums">{records.highestRating}</p>
              <p className="text-sm text-fg-muted mt-1">Peak Rating</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-lg border border-hairline">
              <p className="text-3xl font-bold text-fg tabular-nums">{records.longestWinStreak}</p>
              <p className="text-sm text-fg-muted mt-1">Win Streak</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-lg border border-hairline">
              <p className="text-3xl font-bold text-fg tabular-nums">{records.longestUnbeatenStreak}</p>
              <p className="text-sm text-fg-muted mt-1">Unbeaten</p>
            </div>
            <div className="text-center p-4 bg-surface rounded-lg border border-hairline">
              <p className="text-3xl font-bold text-fg tabular-nums">
                {records.bestTournament ? records.bestTournament.score + '%' : 'N/A'}
              </p>
              <p className="text-sm text-fg-muted mt-1">Best Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsTab;
