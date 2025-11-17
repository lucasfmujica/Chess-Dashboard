import React from 'react';
import PropTypes from 'prop-types';
import { getWeekStats } from '../../../../utils/chessHelpers';

const MonthlyStats = ({ weeklyPlans }) => {
  // Calculate monthly stats from all weekly plans
  const monthlyData = {};

  Object.entries(weeklyPlans).forEach(([weekKey, weekPlan]) => {
    const weekDate = new Date(weekKey);
    const monthKey = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        totalMinutes: 0,
        weeksPlanned: 0,
        totalActivities: 0,
        monthName: weekDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      };
    }

    const weekStats = getWeekStats({ [weekKey]: weekPlan }, weekKey);
    monthlyData[monthKey].totalMinutes += weekStats.totalPlannedMinutes;
    monthlyData[monthKey].weeksPlanned += 1;
    monthlyData[monthKey].totalActivities += Object.values(weekPlan).flat().length;
  });

  const sortedMonths = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 3);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Monthly Training Overview</h3>
          <p className="text-sm text-slate-600">Aggregate stats across all your training</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedMonths.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <div className="p-4 bg-slate-100 rounded-full inline-block mb-3">
              <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No training data yet</p>
            <p className="text-sm text-slate-400 mt-1">Start planning your weeks to see monthly stats</p>
          </div>
        ) : (
          sortedMonths.map(([monthKey, data]) => (
            <div key={monthKey} className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200">
              <h4 className="font-bold text-slate-900 mb-4">{data.monthName}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Training</span>
                  <span className="text-lg font-bold text-cyan-600">{data.totalMinutes}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Weeks Planned</span>
                  <span className="text-lg font-bold text-blue-600">{data.weeksPlanned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Activities</span>
                  <span className="text-lg font-bold text-indigo-600">{data.totalActivities}</span>
                </div>
                <div className="pt-3 border-t border-cyan-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Avg per week</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {Math.round(data.totalMinutes / data.weeksPlanned)}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

MonthlyStats.propTypes = {
  weeklyPlans: PropTypes.object.isRequired,
};

export default MonthlyStats;
