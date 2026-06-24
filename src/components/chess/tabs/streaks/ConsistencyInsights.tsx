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
    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Consistency Insights</h3>
          <p className="text-gray-600">Keep your practice regular for best improvement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-900">Play Frequency</span>
            </div>
            <p className="text-gray-700 text-sm">{getFrequencyMessage()}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Current Momentum</span>
            </div>
            <p className="text-gray-700 text-sm">{getMomentumMessage()}</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Goal Suggestion</span>
            </div>
            <p className="text-gray-700 text-sm">{getGoalMessage()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsistencyInsights;
