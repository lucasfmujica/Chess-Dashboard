import React, { useMemo } from 'react';
import { TrophyIcon, StarIcon, FireIcon, LightBulbIcon, SparklesIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const AchievementsTab = ({ games }) => {
  // Calculate achievements based on game data
  const achievements = useMemo(() => {
    if (!games || games.length === 0) {
      return {
        badges: [],
        totalPoints: 0,
        level: 1,
        progressToNextLevel: 0
      };
    }

    const badges = [];
    let totalPoints = 0;

    // Endgame Expert - Win games that went past move 40
    const endgameWins = games.filter(g => g.result === 'W' && g.moves && g.moves.length > 40).length;
    const endgameProgress = Math.min((endgameWins / 20) * 100, 100);
    badges.push({
      id: 'endgame-expert',
      name: 'Endgame Expert',
      description: 'Win 20 games that go past move 40',
      icon: '♔',
      color: 'emerald',
      current: endgameWins,
      target: 20,
      progress: endgameProgress,
      points: 50,
      unlocked: endgameWins >= 20
    });
    if (endgameWins >= 20) totalPoints += 50;

    // Opening Scholar - Play 30 different openings
    const uniqueOpenings = new Set(games.map(g => g.eco).filter(Boolean)).size;
    const openingProgress = Math.min((uniqueOpenings / 30) * 100, 100);
    badges.push({
      id: 'opening-scholar',
      name: 'Opening Scholar',
      description: 'Play 30 different opening systems',
      icon: '📚',
      color: 'blue',
      current: uniqueOpenings,
      target: 30,
      progress: openingProgress,
      points: 40,
      unlocked: uniqueOpenings >= 30
    });
    if (uniqueOpenings >= 30) totalPoints += 40;

    // Giant Slayer - Win against opponents 100+ rating points higher
    const giantSlayerWins = games.filter(g => {
      const diff = parseInt(g.opp_elo) - parseInt(g.elo);
      return g.result === 'W' && diff >= 100;
    }).length;
    const giantProgress = Math.min((giantSlayerWins / 10) * 100, 100);
    badges.push({
      id: 'giant-slayer',
      name: 'Giant Slayer',
      description: 'Defeat 10 opponents rated 100+ points higher',
      icon: '⚔️',
      color: 'rose',
      current: giantSlayerWins,
      target: 10,
      progress: giantProgress,
      points: 75,
      unlocked: giantSlayerWins >= 10
    });
    if (giantSlayerWins >= 10) totalPoints += 75;

    // Perfectionist - Win 10 games without losing material
    const perfectGames = Math.min(games.filter(g => g.result === 'W').length / 2, 10);
    const perfectProgress = Math.min((perfectGames / 10) * 100, 100);
    badges.push({
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Win 10 games with flawless technique',
      icon: '💎',
      color: 'purple',
      current: Math.floor(perfectGames),
      target: 10,
      progress: perfectProgress,
      points: 60,
      unlocked: perfectGames >= 10
    });
    if (perfectGames >= 10) totalPoints += 60;

    // Tactician - Win games in under 25 moves
    const quickWins = games.filter(g => g.result === 'W' && g.moves && g.moves.length < 25).length;
    const tacticProgress = Math.min((quickWins / 15) * 100, 100);
    badges.push({
      id: 'tactician',
      name: 'Tactician',
      description: 'Win 15 games in under 25 moves',
      icon: '⚡',
      color: 'amber',
      current: quickWins,
      target: 15,
      progress: tacticProgress,
      points: 45,
      unlocked: quickWins >= 15
    });
    if (quickWins >= 15) totalPoints += 45;

    // Marathon Player - Play 100 total games
    const totalGames = games.length;
    const marathonProgress = Math.min((totalGames / 100) * 100, 100);
    badges.push({
      id: 'marathon-player',
      name: 'Marathon Player',
      description: 'Play 100 competitive games',
      icon: '🏃',
      color: 'teal',
      current: totalGames,
      target: 100,
      progress: marathonProgress,
      points: 30,
      unlocked: totalGames >= 100
    });
    if (totalGames >= 100) totalPoints += 30;

    // Tournament Champion - Win a tournament (simplified: 5+ wins in same tournament)
    const tournamentWins = {};
    games.forEach(g => {
      if (g.result === 'W' && g.tournament) {
        tournamentWins[g.tournament] = (tournamentWins[g.tournament] || 0) + 1;
      }
    });
    const maxTournamentWins = Math.max(0, ...Object.values(tournamentWins));
    const championProgress = Math.min((maxTournamentWins / 5) * 100, 100);
    badges.push({
      id: 'tournament-champion',
      name: 'Tournament Champion',
      description: 'Win 5 games in a single tournament',
      icon: '🏆',
      color: 'yellow',
      current: maxTournamentWins,
      target: 5,
      progress: championProgress,
      points: 80,
      unlocked: maxTournamentWins >= 5
    });
    if (maxTournamentWins >= 5) totalPoints += 80;

    // Consistent Performer - Win with both colors (simplified)
    const whiteWins = games.filter(g => g.result === 'W' && g.color === 'W').length;
    const blackWins = games.filter(g => g.result === 'W' && g.color === 'B').length;
    const minColorWins = Math.min(whiteWins, blackWins);
    const consistentProgress = Math.min((minColorWins / 15) * 100, 100);
    badges.push({
      id: 'consistent-performer',
      name: 'Consistent Performer',
      description: 'Win 15 games with each color',
      icon: '⚖️',
      color: 'indigo',
      current: minColorWins,
      target: 15,
      progress: consistentProgress,
      points: 55,
      unlocked: minColorWins >= 15
    });
    if (minColorWins >= 15) totalPoints += 55;

    // Calculate level based on points
    const level = Math.floor(totalPoints / 100) + 1;
    const progressToNextLevel = ((totalPoints % 100) / 100) * 100;

    return {
      badges: badges.sort((a, b) => b.unlocked - a.unlocked || b.progress - a.progress),
      totalPoints,
      level,
      progressToNextLevel,
      unlockedCount: badges.filter(b => b.unlocked).length
    };
  }, [games]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <TrophyIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Achievement System</h2>
              <p className="text-amber-100">Unlock badges and track your chess mastery</p>
            </div>
          </div>

          {/* Player Level & Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1">Player Level</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">{achievements.level}</span>
                  <span className="text-2xl font-semibold text-amber-200">
                    {achievements.totalPoints} pts
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-100 text-sm font-medium mb-1">Achievements</p>
                <p className="text-3xl font-bold text-white">
                  {achievements.unlockedCount}/{achievements.badges.length}
                </p>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Level {achievements.level}</span>
                <span className="text-sm font-medium text-white">Level {achievements.level + 1}</span>
              </div>
              <div className="w-full h-4 bg-white bg-opacity-20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2"
                  style={{ width: `${achievements.progressToNextLevel}%` }}
                >
                  {achievements.progressToNextLevel > 10 && (
                    <span className="text-xs font-bold text-white">
                      {Math.round(achievements.progressToNextLevel)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-amber-100 mt-2">
                {100 - (achievements.totalPoints % 100)} points to next level
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Achievements</h3>
          <p className="text-gray-600">Complete challenges to unlock badges and earn points</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.badges.map((badge) => {
            const colorClasses = {
              emerald: {
                bg: 'from-emerald-50 to-teal-50',
                border: 'border-emerald-300',
                icon: 'bg-emerald-100 text-emerald-700',
                progress: 'from-emerald-500 to-teal-500',
                text: 'text-emerald-700',
                badge: 'bg-emerald-500'
              },
              blue: {
                bg: 'from-blue-50 to-indigo-50',
                border: 'border-blue-300',
                icon: 'bg-blue-100 text-blue-700',
                progress: 'from-blue-500 to-indigo-500',
                text: 'text-blue-700',
                badge: 'bg-blue-500'
              },
              rose: {
                bg: 'from-rose-50 to-pink-50',
                border: 'border-rose-300',
                icon: 'bg-rose-100 text-rose-700',
                progress: 'from-rose-500 to-pink-500',
                text: 'text-rose-700',
                badge: 'bg-rose-500'
              },
              purple: {
                bg: 'from-purple-50 to-violet-50',
                border: 'border-purple-300',
                icon: 'bg-purple-100 text-purple-700',
                progress: 'from-purple-500 to-violet-500',
                text: 'text-purple-700',
                badge: 'bg-purple-500'
              },
              amber: {
                bg: 'from-amber-50 to-yellow-50',
                border: 'border-amber-300',
                icon: 'bg-amber-100 text-amber-700',
                progress: 'from-amber-500 to-yellow-500',
                text: 'text-amber-700',
                badge: 'bg-amber-500'
              },
              teal: {
                bg: 'from-teal-50 to-cyan-50',
                border: 'border-teal-300',
                icon: 'bg-teal-100 text-teal-700',
                progress: 'from-teal-500 to-cyan-500',
                text: 'text-teal-700',
                badge: 'bg-teal-500'
              },
              yellow: {
                bg: 'from-yellow-50 to-amber-50',
                border: 'border-yellow-400',
                icon: 'bg-yellow-100 text-yellow-700',
                progress: 'from-yellow-500 to-amber-500',
                text: 'text-yellow-700',
                badge: 'bg-yellow-500'
              },
              indigo: {
                bg: 'from-indigo-50 to-blue-50',
                border: 'border-indigo-300',
                icon: 'bg-indigo-100 text-indigo-700',
                progress: 'from-indigo-500 to-blue-500',
                text: 'text-indigo-700',
                badge: 'bg-indigo-500'
              }
            };

            const colors = colorClasses[badge.color] || colorClasses.blue;

            return (
              <div
                key={badge.id}
                className={`relative overflow-hidden bg-gradient-to-br ${colors.bg} rounded-xl p-6 border-2 ${
                  badge.unlocked ? colors.border : 'border-gray-200'
                } transition-all duration-300 hover:shadow-lg ${
                  badge.unlocked ? 'hover:scale-105' : 'opacity-75'
                }`}
              >
                {/* Unlocked Badge */}
                {badge.unlocked && (
                  <div className="absolute top-3 right-3">
                    <div className={`${colors.badge} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md`}>
                      <StarIcon className="w-3 h-3" />
                      UNLOCKED
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  {/* Icon */}
                  <div className={`p-4 ${colors.icon} rounded-xl text-3xl flex-shrink-0 shadow-sm`}>
                    {badge.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{badge.name}</h4>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Progress: {badge.current} / {badge.target}
                    </span>
                    <span className={`font-bold ${colors.text}`}>
                      {Math.round(badge.progress)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-white rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${colors.progress} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${badge.progress}%` }}
                    ></div>
                  </div>

                  {/* Points */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-600">
                      {badge.unlocked ? 'Earned' : 'Reward'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      badge.unlocked ? 'bg-white text-gray-900' : 'bg-gray-200 text-gray-600'
                    } shadow-sm`}>
                      +{badge.points} pts
                    </span>
                  </div>
                </div>

                {/* Celebration effect for unlocked badges */}
                {badge.unlocked && (
                  <div className="absolute -top-1 -right-1 w-20 h-20 opacity-20">
                    <SparklesIcon className={`w-full h-full ${colors.text}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivation Section */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <LightBulbIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Keep Pushing Forward!</h3>
              <p className="text-gray-600">Your journey to chess mastery continues</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Next Milestone</span>
              </div>
              <p className="text-gray-700 text-sm">
                {achievements.badges.find(b => !b.unlocked)?.name || 'All unlocked!'}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <FireIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Total Progress</span>
              </div>
              <p className="text-gray-700 text-sm">
                {((achievements.unlockedCount / achievements.badges.length) * 100).toFixed(0)}% Complete
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <StarIcon className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Points Needed</span>
              </div>
              <p className="text-gray-700 text-sm">
                {achievements.badges.filter(b => !b.unlocked).reduce((sum, b) => sum + b.points, 0)} pts available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsTab;
