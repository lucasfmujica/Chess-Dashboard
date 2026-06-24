import { ClockIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/outline';

interface ConsistencyInsightsData {
  consistency: number;
  currentWinStreak: number;
  currentUnbeatenStreak: number;
  currentLossStreak: number;
  gamesThisWeek: number;
}

interface ConsistencyInsightsProps {
  streaksData: ConsistencyInsightsData;
}

const ConsistencyInsights = ({ streaksData }: ConsistencyInsightsProps) => {
  const getFrequencyMessage = () => {
    if (streaksData.consistency >= 75) return 'Excellent! Very consistent player';
    if (streaksData.consistency >= 50) return 'Good! Playing regularly';
    if (streaksData.consistency >= 25) return 'Fair. Try to play more often';
    return 'Low activity. Increase frequency for improvement';
  };

  const getMomentumMessage = () => {
    if (streaksData.currentWinStreak >= 3) return '🔥 Hot streak! Keep it going!';
    if (streaksData.currentUnbeatenStreak >= 5) return '💪 Solid performance!';
    if (streaksData.currentLossStreak >= 3) return '⚠️ Rough patch - stay focused!';
    return 'Steady as she goes';
  };

  const getGoalMessage = () => {
    if (streaksData.gamesThisWeek < 5) return 'Try to play 5+ games this week';
    if (streaksData.currentWinStreak === 0) return 'Focus on winning your next game';
    return `Extend your win streak to ${streaksData.currentWinStreak + 1}!`;
  };

  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-fg mb-2">Consistency Insights</h3>
          <p className="text-fg-muted">Keep your practice regular for best improvement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-fg">Play Frequency</span>
            </div>
            <p className="text-fg-muted text-sm">{getFrequencyMessage()}</p>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-fg">Current Momentum</span>
            </div>
            <p className="text-fg-muted text-sm">{getMomentumMessage()}</p>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-fg">Goal Suggestion</span>
            </div>
            <p className="text-fg-muted text-sm">{getGoalMessage()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsistencyInsights;
