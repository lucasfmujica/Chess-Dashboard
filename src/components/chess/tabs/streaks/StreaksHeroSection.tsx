import { FireIcon } from '@heroicons/react/24/outline';

interface StreaksHeroData {
  currentWinStreak: number;
  currentUnbeatenStreak: number;
  gamesThisWeek: number;
  consistency: number;
}

interface StreaksHeroSectionProps {
  streaksData: StreaksHeroData;
}

const StreaksHeroSection = ({ streaksData }: StreaksHeroSectionProps) => {
  return (
    <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
      <div className="relative px-8 py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-surface-2 rounded-lg">
            <FireIcon className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg">Streaks & Consistency</h2>
            <p className="text-fg-muted">Track your momentum and playing habits</p>
          </div>
        </div>

        {/* Current Streak Display */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Current Win Streak</p>
            <p className="text-4xl font-bold text-fg tabular-nums">{streaksData.currentWinStreak}</p>
            <p className="text-sm text-fg-muted mt-1">
              {streaksData.currentWinStreak > 0 ? '🔥 On fire!' : 'Start winning!'}
            </p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Unbeaten Streak</p>
            <p className="text-4xl font-bold text-fg tabular-nums">{streaksData.currentUnbeatenStreak}</p>
            <p className="text-sm text-fg-muted mt-1">
              {streaksData.currentUnbeatenStreak > 0 ? '💪 Strong!' : 'Keep pushing!'}
            </p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Games This Week</p>
            <p className="text-4xl font-bold text-fg tabular-nums">{streaksData.gamesThisWeek}</p>
            <p className="text-sm text-fg-muted mt-1">Last 7 days</p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Consistency</p>
            <p className="text-4xl font-bold text-fg tabular-nums">{streaksData.consistency}%</p>
            <p className="text-sm text-fg-muted mt-1">12-week avg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreaksHeroSection;
