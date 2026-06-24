import { StarIcon, ChartBarIcon, UsersIcon } from '@heroicons/react/24/outline';

interface TournamentSummaryStats {
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
}

interface TournamentSummaryCardsProps {
  stats: TournamentSummaryStats;
}

const TournamentSummaryCards = ({ stats }: TournamentSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <StarIcon className="w-6 h-6 text-win" />
            </div>
          </div>
          <p className="text-sm font-medium text-fg-muted mb-1">Total Wins</p>
          <p className="text-3xl font-bold text-win tabular-nums">{stats.totalWins}</p>
        </div>
      </div>

      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-draw" />
            </div>
          </div>
          <p className="text-sm font-medium text-fg-muted mb-1">Total Draws</p>
          <p className="text-3xl font-bold text-draw tabular-nums">{stats.totalDraws}</p>
        </div>
      </div>

      <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <UsersIcon className="w-6 h-6 text-loss" />
            </div>
          </div>
          <p className="text-sm font-medium text-fg-muted mb-1">Total Losses</p>
          <p className="text-3xl font-bold text-loss tabular-nums">{stats.totalLosses}</p>
        </div>
      </div>
    </div>
  );
};

export default TournamentSummaryCards;
