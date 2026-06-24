import { TrophyIcon } from '@heroicons/react/24/outline';

interface TournamentHeroStats {
  totalTournaments: number;
  totalGames: number;
  bestPerformance: number;
  averageScore: number | string;
}

interface TournamentHeroSectionProps {
  stats: TournamentHeroStats;
}

const TournamentHeroSection = ({ stats }: TournamentHeroSectionProps) => {
  return (
    <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
      <div className="relative px-8 py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-surface-2 rounded-lg">
            <TrophyIcon className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg">Tournament History</h2>
            <p className="text-fg-muted">Complete record of your competitive performance</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Tournaments</p>
            <p className="text-3xl font-bold text-fg tabular-nums">{stats.totalTournaments}</p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Games Played</p>
            <p className="text-3xl font-bold text-fg tabular-nums">{stats.totalGames}</p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Best Rating</p>
            <p className="text-3xl font-bold text-fg tabular-nums">{stats.bestPerformance}</p>
          </div>
          <div className="bg-surface-2 rounded-lg p-4">
            <p className="text-fg-muted text-sm font-medium mb-1">Avg Score</p>
            <p className="text-3xl font-bold text-fg tabular-nums">{stats.averageScore}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHeroSection;
