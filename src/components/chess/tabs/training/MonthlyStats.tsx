import { getWeekStats } from '../../../../utils/chessHelpers';
import type { WeeklyPlans } from '../../../../types/training';

interface MonthlyData {
  totalMinutes: number;
  weeksPlanned: number;
  totalActivities: number;
  monthName: string;
}

interface MonthlyStatsProps {
  weeklyPlans: WeeklyPlans;
}

const MonthlyStats = ({ weeklyPlans }: MonthlyStatsProps) => {
  // Calculate monthly stats from all weekly plans
  const monthlyData: Record<string, MonthlyData> = {};

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
    <div className="bg-surface rounded-lg border border-hairline p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-surface-2 rounded-lg">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg">Monthly Training Overview</h3>
          <p className="text-sm text-fg-muted">Aggregate stats across all your training</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedMonths.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-3">
              <svg className="w-12 h-12 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-fg-muted font-medium">No training data yet</p>
            <p className="text-sm text-fg-subtle mt-1">Start planning your weeks to see monthly stats</p>
          </div>
        ) : (
          sortedMonths.map(([monthKey, data]) => (
            <div key={monthKey} className="bg-surface-2 rounded-lg p-5 border border-hairline">
              <h4 className="font-bold text-fg mb-4">{data.monthName}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Total Training</span>
                  <span className="text-lg font-bold text-fg">{data.totalMinutes}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Weeks Planned</span>
                  <span className="text-lg font-bold text-fg">{data.weeksPlanned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Activities</span>
                  <span className="text-lg font-bold text-fg">{data.totalActivities}</span>
                </div>
                <div className="pt-3 border-t border-hairline">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-fg-subtle">Avg per week</span>
                    <span className="text-sm font-semibold text-fg">
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

export default MonthlyStats;
