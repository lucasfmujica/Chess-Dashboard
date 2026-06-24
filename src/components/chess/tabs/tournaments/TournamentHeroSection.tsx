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
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 rounded-2xl shadow-xl">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative px-8 py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
            <TrophyIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Tournament History</h2>
            <p className="text-orange-100">Complete record of your competitive performance</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-orange-100 text-sm font-medium mb-1">Tournaments</p>
            <p className="text-3xl font-bold text-white">{stats.totalTournaments}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-orange-100 text-sm font-medium mb-1">Games Played</p>
            <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-orange-100 text-sm font-medium mb-1">Best Rating</p>
            <p className="text-3xl font-bold text-white">{stats.bestPerformance}</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-orange-100 text-sm font-medium mb-1">Avg Score</p>
            <p className="text-3xl font-bold text-white">{stats.averageScore}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHeroSection;
