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
    <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
      <div className="relative px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-surface-2 rounded-lg">
            <ChartBarIcon className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-fg">Performance Analytics</h2>
            <p className="text-fg-muted">Deep dive into your chess performance patterns</p>
          </div>
        </div>

        {/* Insight Cards Grid */}
        <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-4">
          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-accent" />
              <p className="text-sm font-medium text-fg-muted">Best Time Slot</p>
            </div>
            <p className="text-2xl font-bold text-fg">{insights.bestTimeSlot?.time || 'N/A'}</p>
            <p className="text-sm text-fg-muted">{insights.bestTimeSlot?.score}% score</p>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-5 h-5 text-accent" />
              <p className="text-sm font-medium text-fg-muted">Best Tournament</p>
            </div>
            <p className="text-lg font-bold text-fg leading-tight">{insights.bestTournament?.name?.slice(0, 20) || 'N/A'}</p>
            <p className="text-sm text-fg-muted">{insights.bestTournament?.performance || 'N/A'} perf rating</p>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-accent" />
              <p className="text-sm font-medium text-fg-muted">Games Analyzed</p>
            </div>
            <p className="text-2xl font-bold text-fg">{insights.totalTimeGames}</p>
            <p className="text-sm text-fg-muted">by time of day</p>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-5 h-5 text-accent" />
              <p className="text-sm font-medium text-fg-muted">Avg Performance</p>
            </div>
            <p className="text-2xl font-bold text-fg">{insights.avgPerformance}</p>
            <p className="text-sm text-fg-muted">across tournaments</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHero;
