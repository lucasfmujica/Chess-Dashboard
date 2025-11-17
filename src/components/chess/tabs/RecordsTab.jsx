import React, { useMemo } from 'react';
import { TrophyIcon, StarIcon, FireIcon, UserGroupIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';

const RecordsTab = ({ games, eloHistory }) => {
  // Calculate personal records
  const records = useMemo(() => {
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
    const tournamentStats = {};
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

    let bestTournament = null;
    Object.values(tournamentStats).forEach(t => {
      t.score = ((t.wins + t.draws * 0.5) / t.total * 100).toFixed(1);
      if (!bestTournament || parseFloat(t.score) > parseFloat(bestTournament.score)) {
        bestTournament = t;
      }
    });

    // Highest Rated Opponent Defeated
    let highestRatedOpponent = null;
    games.forEach(game => {
      if (game.result === 'W' && game.opp_elo) {
        if (!highestRatedOpponent || parseInt(game.opp_elo) > parseInt(highestRatedOpponent.opp_elo)) {
          highestRatedOpponent = game;
        }
      }
    });

    // Most Wins vs Same Opponent
    const opponentWins = {};
    games.forEach(game => {
      if (game.result === 'W' && game.opp) {
        opponentWins[game.opp] = (opponentWins[game.opp] || 0) + 1;
      }
    });

    let mostWinsVsOpponent = null;
    Object.entries(opponentWins).forEach(([opponent, wins]) => {
      if (!mostWinsVsOpponent || wins > mostWinsVsOpponent.wins) {
        mostWinsVsOpponent = { opponent, wins };
      }
    });

    // Quickest Win (fewest moves)
    let quickestWin = null;
    games.forEach(game => {
      if (game.result === 'W' && game.moves) {
        const moveCount = game.moves.length;
        if (!quickestWin || moveCount < quickestWin.moves.length) {
          quickestWin = game;
        }
      }
    });

    // Longest Game (most moves)
    let longestGame = null;
    games.forEach(game => {
      if (game.moves) {
        const moveCount = game.moves.length;
        if (!longestGame || moveCount > longestGame.moves.length) {
          longestGame = game;
        }
      }
    });

    // Favorite Opening (most played)
    const openingCounts = {};
    games.forEach(game => {
      if (game.opening) {
        openingCounts[game.opening] = (openingCounts[game.opening] || 0) + 1;
      }
    });

    let favoriteOpening = null;
    Object.entries(openingCounts).forEach(([opening, count]) => {
      if (!favoriteOpening || count > favoriteOpening.count) {
        favoriteOpening = { opening, count };
      }
    });

    // Best Performance Rating
    let bestPerformance = null;
    games.forEach(game => {
      if (game.performanceRating) {
        if (!bestPerformance || game.performanceRating > bestPerformance.performanceRating) {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <StarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Personal Records</h2>
              <p className="text-purple-100">Your greatest chess achievements and milestones</p>
            </div>
          </div>

          {/* Top Records Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm font-medium mb-1">Peak Rating</p>
              <p className="text-4xl font-bold text-white">{records.highestRating}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm font-medium mb-1">Win Streak</p>
              <p className="text-4xl font-bold text-white">{records.longestWinStreak}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm font-medium mb-1">Unbeaten</p>
              <p className="text-4xl font-bold text-white">{records.longestUnbeatenStreak}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm font-medium mb-1">Rating Gain</p>
              <p className="text-4xl font-bold text-white">+{records.highestRating - records.lowestRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Rating Milestones</h3>
          <p className="text-gray-600">Your journey through the rating ladder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <TrophyIcon className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Highest Rating</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-amber-600 mb-2">{records.highestRating}</p>
                <p className="text-sm text-gray-600">Achieved on</p>
                <p className="text-sm font-medium text-gray-900">{records.highestRatingDate}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <ChartBarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Starting Rating</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-blue-600 mb-2">{records.lowestRating}</p>
                <p className="text-sm text-gray-600">Initial rating</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <SparklesIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Total Improvement</h4>
              </div>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-emerald-600 mb-2">
                  +{records.highestRating - records.lowestRating}
                </p>
                <p className="text-sm text-gray-600">points gained</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Performance Records</h3>
          <p className="text-gray-600">Your most impressive competitive achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best Tournament */}
          {records.bestTournament && (
            <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <TrophyIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Best Tournament</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Tournament</p>
                    <p className="text-lg font-bold text-gray-900">{records.bestTournament.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Record</p>
                      <p className="text-md font-semibold text-gray-900">
                        {records.bestTournament.wins}-{records.bestTournament.draws}-{records.bestTournament.losses}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Score</p>
                      <p className="text-md font-semibold text-purple-600">{records.bestTournament.score}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Longest Win Streak */}
          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <FireIcon className="w-6 h-6 text-rose-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Win Streak Record</h4>
              </div>
              <div className="text-center py-6">
                <p className="text-6xl font-bold text-rose-600 mb-2">{records.longestWinStreak}</p>
                <p className="text-gray-600">consecutive victories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Records */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Notable Games</h3>
          <p className="text-gray-600">Memorable individual game achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Highest Rated Opponent */}
          {records.highestRatedOpponent && (
            <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500"></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <UserGroupIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Highest Rated Opponent Defeated</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-red-600 mb-1">{records.highestRatedOpponent.opp_elo}</p>
                    <p className="text-sm text-gray-600">{records.highestRatedOpponent.opp}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">{records.highestRatedOpponent.opening}</p>
                    <p className="text-xs text-gray-500 mt-1">{records.highestRatedOpponent.tournament}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quickest Win */}
          {records.quickestWin && (
            <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-50 rounded-xl">
                    <FireIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Quickest Victory</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-yellow-600 mb-1">{records.quickestWin.moves.length}</p>
                    <p className="text-sm text-gray-600">moves to victory</p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">vs {records.quickestWin.opp}</p>
                    <p className="text-xs text-gray-500 mt-1">{records.quickestWin.opening}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Longest Game */}
          {records.longestGame && (
            <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <ChartBarIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Longest Battle</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-center py-3">
                    <p className="text-4xl font-bold text-indigo-600 mb-1">{records.longestGame.moves.length}</p>
                    <p className="text-sm text-gray-600">moves played</p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">vs {records.longestGame.opp}</p>
                    <p className="text-xs text-gray-500 mt-1">
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
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Opening Preferences</h3>
              <p className="text-gray-600">Your most-played opening systems</p>
            </div>

            <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
              <div className="p-4 bg-teal-100 rounded-xl">
                <span className="text-4xl">📚</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Most Played Opening</h4>
                <p className="text-2xl font-bold text-teal-900">{records.favoriteOpening.opening}</p>
                <p className="text-sm text-teal-700 mt-2">
                  Played {records.favoriteOpening.count} times
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hall of Fame */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg border-2 border-amber-200">
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-amber-100 rounded-full mb-4">
              <StarIcon className="w-12 h-12 text-amber-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Hall of Fame</h3>
            <p className="text-gray-600">Your legacy in numbers</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-3xl font-bold text-amber-600">{records.highestRating}</p>
              <p className="text-sm text-gray-600 mt-1">Peak Rating</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-3xl font-bold text-emerald-600">{records.longestWinStreak}</p>
              <p className="text-sm text-gray-600 mt-1">Win Streak</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-3xl font-bold text-blue-600">{records.longestUnbeatenStreak}</p>
              <p className="text-sm text-gray-600 mt-1">Unbeaten</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-3xl font-bold text-purple-600">
                {records.bestTournament ? records.bestTournament.score + '%' : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Best Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsTab;
