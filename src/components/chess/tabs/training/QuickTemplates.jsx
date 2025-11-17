import React from 'react';
import PropTypes from 'prop-types';

const QuickTemplates = ({
  weeklyHours,
  setWeeklyHours,
  onApplyGMNoahMethod,
  onApplyBalancedDaily,
  onApplyBlockFocus,
  onClearWeek,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Quick Templates</h3>
          <p className="text-sm text-slate-600">Apply proven training methods instantly</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-bold text-slate-700">
          Weekly Study Hours
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="20"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="px-4 py-2 bg-indigo-100 rounded-xl border border-indigo-200">
            <span className="text-2xl font-bold text-indigo-600">{weeklyHours}</span>
            <span className="text-sm text-indigo-700 ml-1">hrs</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">≈ {Math.round(weeklyHours * 60 / 6)} minutes per day (6 training days)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onApplyGMNoahMethod}
          className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300"
        >
          <div className="text-4xl mb-3">⚡</div>
          <p className="font-bold text-blue-900 text-lg mb-2">GM Noah&apos;s Method</p>
          <p className="text-sm text-slate-600">Rotating focus: Tactics → Games → Endgames</p>
        </button>

        <button
          onClick={onApplyBalancedDaily}
          className="group p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300"
        >
          <div className="text-4xl mb-3">🎯</div>
          <p className="font-bold text-emerald-900 text-lg mb-2">Balanced Daily</p>
          <p className="text-sm text-slate-600">All elements every day for consistency</p>
        </button>

        <button
          onClick={onApplyBlockFocus}
          className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300"
        >
          <div className="text-4xl mb-3">📚</div>
          <p className="font-bold text-purple-900 text-lg mb-2">Block Focus</p>
          <p className="text-sm text-slate-600">Multi-day deep dives on each topic</p>
        </button>
      </div>

      <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">Pro Tip:</span> Following the 1/3 rule - Tactics, Play+Analyze, Endgames/Openings
        </p>
        <button
          onClick={onClearWeek}
          className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
        >
          Clear Week
        </button>
      </div>
    </div>
  );
};

QuickTemplates.propTypes = {
  weeklyHours: PropTypes.number.isRequired,
  setWeeklyHours: PropTypes.func.isRequired,
  onApplyGMNoahMethod: PropTypes.func.isRequired,
  onApplyBalancedDaily: PropTypes.func.isRequired,
  onApplyBlockFocus: PropTypes.func.isRequired,
  onClearWeek: PropTypes.func.isRequired,
};

export default QuickTemplates;
