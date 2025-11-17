import React from 'react';
import { getWeekDates } from '../../../utils/chessHelpers';
import { useModal } from '../../modals/ModalContext';

const QuickTemplates = ({ currentWeek, weeklyHours, setWeeklyHours, setWeeklyPlans }) => {
  const modal = useModal();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="mb-4 text-lg font-semibold">Quick Templates</h3>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Weekly Study Hours
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(Number(e.target.value))}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="ml-2 text-sm text-gray-600">hours/week ({Math.round(weeklyHours * 60 / 6)} min/day)</span>
      </div>
      <p className="mb-4 text-sm text-gray-600">Following GM Noah's advice: 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames/Openings/Strategy (this week: Endgames)</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => {
            const dates = getWeekDates(currentWeek);
            const totalMinutes = weeklyHours * 60;
            const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
            const newPlan = {};
            dates.forEach(({ date }, idx) => {
              if (idx === 6) { // Sunday - rest day
                newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
              } else {
                // 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames (this week's focus)
                const cycle = idx % 3;
                if (cycle === 0) {
                  newPlan[date] = [{ id: 'tactics', minutes: dailyMinutes, details: 'Tactical puzzles and pattern recognition' }];
                } else if (cycle === 1) {
                  const playTime = Math.round(dailyMinutes * 0.5);
                  const analysisTime = dailyMinutes - playTime;
                  newPlan[date] = [
                    { id: 'games', minutes: playTime, details: 'Play rated games with focus, no distractions' },
                    { id: 'analysis', minutes: analysisTime, details: 'Deep analysis of games played' }
                  ];
                } else {
                  newPlan[date] = [{ id: 'endgame', minutes: dailyMinutes, details: 'Endgame study and practice' }];
                }
              }
            });
            setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
          }}
          className="p-4 transition-colors border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50"
        >
          <p className="font-semibold text-blue-900">⚡ Noah's Method</p>
          <p className="mt-1 text-xs text-gray-600">1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames</p>
        </button>

        <button
          onClick={() => {
            const dates = getWeekDates(currentWeek);
            const totalMinutes = weeklyHours * 60;
            const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
            const tacticsTime = Math.round(dailyMinutes / 3);
            const gamesTime = Math.round(dailyMinutes / 2);
            const endgameTime = dailyMinutes - tacticsTime - gamesTime;
            const newPlan = {};
            dates.forEach(({ date }, idx) => {
              if (idx === 6) { // Sunday
                newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
              } else {
                newPlan[date] = [
                  { id: 'tactics', minutes: tacticsTime, details: '' },
                  { id: 'games', minutes: gamesTime, details: '' },
                  { id: 'endgame', minutes: endgameTime, details: '' }
                ];
              }
            });
            setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
          }}
          className="p-4 transition-colors border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50"
        >
          <p className="font-semibold text-green-900">🎯 Balanced Daily</p>
          <p className="mt-1 text-xs text-gray-600">All three elements every day</p>
        </button>

        <button
          onClick={() => {
            const dates = getWeekDates(currentWeek);
            const totalMinutes = weeklyHours * 60;
            const tacticsDaily = Math.round(totalMinutes / 3 / 3); // 1/3 of total, spread over 3 days
            const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2); // 1/3 of total, spread over 2 days
            const endgameDaily = Math.round(totalMinutes / 3); // 1/3 of total on 1 day
            const newPlan = {};
            dates.forEach(({ date }, idx) => {
              if (idx === 6) { // Sunday
                newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
              } else if (idx <= 2) {
                // First 3 days: Tactics focus
                newPlan[date] = [{ id: 'tactics', minutes: tacticsDaily, details: 'Intensive tactical training' }];
              } else if (idx === 3 || idx === 4) {
                // Next 2 days: Play and analyze
                const playTime = Math.round(playAnalyzeDaily * 0.67);
                const analysisTime = playAnalyzeDaily - playTime;
                newPlan[date] = [
                  { id: 'games', minutes: playTime, details: 'Multiple rated games' },
                  { id: 'analysis', minutes: analysisTime, details: 'Deep game review' }
                ];
              } else {
                // Saturday: Endgames
                newPlan[date] = [{ id: 'endgame', minutes: endgameDaily, details: 'Deep endgame study' }];
              }
            });
            setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
          }}
          className="p-4 transition-colors border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50"
        >
          <p className="font-semibold text-purple-900">📚 Block Focus</p>
          <p className="mt-1 text-xs text-gray-600">Multi-day blocks: Tactics → Play → Endgames</p>
        </button>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={async () => {
            const confirmed = await modal.confirm('Clear this week\'s plan?', 'Clear Weekly Plan');
            if (confirmed) {
              setWeeklyPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[currentWeek];
                return newPlans;
              });
            }
          }}
          className="px-4 py-2 text-sm font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
        >
          Clear Week
        </button>
      </div>
    </div>
  );
};

export default QuickTemplates;
