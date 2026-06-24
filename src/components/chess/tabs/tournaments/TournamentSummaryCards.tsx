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
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <StarIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Wins</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.totalWins}</p>
        </div>
      </div>

      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <ChartBarIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Draws</p>
          <p className="text-3xl font-bold text-amber-600">{stats.totalDraws}</p>
        </div>
      </div>

      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600"></div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-rose-50 rounded-xl">
              <UsersIcon className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Losses</p>
          <p className="text-3xl font-bold text-rose-600">{stats.totalLosses}</p>
        </div>
      </div>
    </div>
  );
};

export default TournamentSummaryCards;
