import { TrophyIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface StreakStatsData {
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  gamesThisMonth: number;
}

interface StreakStatsCardsProps {
  streaksData: StreakStatsData;
}

const StreakStatsCards = ({ streaksData }: StreakStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Longest Win Streak */}
      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <TrophyIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-fg">Longest Win Streak</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{streaksData.longestWinStreak}</p>
            <p className="text-fg-muted">consecutive wins</p>
          </div>
        </div>
      </div>

      {/* Longest Unbeaten Streak */}
      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-fg">Longest Unbeaten</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{streaksData.longestUnbeatenStreak}</p>
            <p className="text-fg-muted">games without loss</p>
          </div>
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-fg">Monthly Activity</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{streaksData.gamesThisMonth}</p>
            <p className="text-fg-muted">games in latest tournament</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakStatsCards;
