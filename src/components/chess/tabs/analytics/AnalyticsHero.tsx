import {
  ClockIcon,
  TrophyIcon,
  ChartBarIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface AnalyticsInsights {
  bestTimeSlot?: {
    time?: string;
    score?: string;
  };
  bestTournament?: {
    name?: string;
    performance?: number;
  };
  totalTimeGames: number;
  avgPerformance: number;
}

interface AnalyticsHeroProps {
  insights: AnalyticsInsights;
}

const AnalyticsHero = ({ insights }: AnalyticsHeroProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }}></div>

      <div className="relative px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
            <ChartBarIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Performance Analytics</h2>
            <p className="text-indigo-100">Deep dive into your chess performance patterns</p>
          </div>
        </div>

        {/* Insight Cards Grid */}
        <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-4">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-yellow-300" />
              <p className="text-sm font-medium text-white/80">Best Time Slot</p>
            </div>
            <p className="text-2xl font-bold text-white">{insights.bestTimeSlot?.time || 'N/A'}</p>
            <p className="text-sm text-indigo-100">{insights.bestTimeSlot?.score}% score</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-5 h-5 text-yellow-300" />
              <p className="text-sm font-medium text-white/80">Best Tournament</p>
            </div>
            <p className="text-lg font-bold text-white leading-tight">{insights.bestTournament?.name?.slice(0, 20) || 'N/A'}</p>
            <p className="text-sm text-indigo-100">{insights.bestTournament?.performance || 'N/A'} perf rating</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-orange-300" />
              <p className="text-sm font-medium text-white/80">Games Analyzed</p>
            </div>
            <p className="text-2xl font-bold text-white">{insights.totalTimeGames}</p>
            <p className="text-sm text-indigo-100">by time of day</p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-5 h-5 text-emerald-300" />
              <p className="text-sm font-medium text-white/80">Avg Performance</p>
            </div>
            <p className="text-2xl font-bold text-white">{insights.avgPerformance}</p>
            <p className="text-sm text-indigo-100">across tournaments</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHero;
