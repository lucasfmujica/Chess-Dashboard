import React from 'react';
import { ACTIVE_TRAINING_DAYS, MINUTES_PER_HOUR } from '../../../constants/chessConstants';
import { applyTemplate, generateBalancedDailyPlan, generateBlockFocusPlan, generateNoahsMethodPlan } from '../../../utils/trainingPlanTemplates';

const QuickTemplates = ({ currentWeek, weeklyHours, setWeeklyHours, setWeeklyPlans }) => {
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
        <span className="ml-2 text-sm text-gray-600">
          hours/week ({Math.round(weeklyHours * MINUTES_PER_HOUR / ACTIVE_TRAINING_DAYS)} min/day)
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Following GM Noah's advice: 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames/Openings/Strategy (this week: Endgames)
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          onClick={() => applyTemplate(currentWeek, weeklyHours, setWeeklyPlans, generateNoahsMethodPlan)}
          className="p-4 transition-colors border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50"
        >
          <p className="font-semibold text-blue-900">⚡ Noah's Method</p>
          <p className="mt-1 text-xs text-gray-600">1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames</p>
        </button>

        <button
          onClick={() => applyTemplate(currentWeek, weeklyHours, setWeeklyPlans, generateBalancedDailyPlan)}
          className="p-4 transition-colors border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50"
        >
          <p className="font-semibold text-green-900">🎯 Balanced Daily</p>
          <p className="mt-1 text-xs text-gray-600">All three elements every day</p>
        </button>

        <button
          onClick={() => applyTemplate(currentWeek, weeklyHours, setWeeklyPlans, generateBlockFocusPlan)}
          className="p-4 transition-colors border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50"
        >
          <p className="font-semibold text-purple-900">📚 Block Focus</p>
          <p className="mt-1 text-xs text-gray-600">Multi-day blocks: Tactics → Play → Endgames</p>
        </button>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => {
            if (window.confirm('Clear this week\'s plan?')) {
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
