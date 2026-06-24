import { ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import FormCard from './FormCard';
import type { GameResult, MonthlyStat } from '../../../../types/chess';

interface FormPeriodStats {
  wins: number;
  draws: number;
  losses: number;
  percentage: string | number;
  results: GameResult[];
}

interface FormStats {
  last5: FormPeriodStats;
  last10: FormPeriodStats;
}

interface RecentFormSectionProps {
  formStats?: FormStats | null;
  monthlyStats?: MonthlyStat[];
}

const RecentFormSection = ({ formStats, monthlyStats }: RecentFormSectionProps) => {
  if (!formStats) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Recent Form</h3>
            <p className="text-indigo-100 text-sm">Your performance in recent games</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Last 5 Games */}
          <FormCard
            title="Last 5 Games"
            badge="L5"
            stats={{
              subtitle: "Most recent form",
              wins: formStats.last5.wins,
              draws: formStats.last5.draws,
              losses: formStats.last5.losses,
              percentage: formStats.last5.percentage,
              results: formStats.last5.results
            }}
            borderColor="border-blue-200"
            bgColor="from-blue-50 to-indigo-50"
            badgeColor="bg-blue-500"
          />

          {/* Last 10 Games */}
          <FormCard
            title="Last 10 Games"
            badge="L10"
            stats={{
              subtitle: "Extended form",
              wins: formStats.last10.wins,
              draws: formStats.last10.draws,
              losses: formStats.last10.losses,
              percentage: formStats.last10.percentage,
              results: formStats.last10.results
            }}
            borderColor="border-purple-200"
            bgColor="from-purple-50 to-pink-50"
            badgeColor="bg-purple-500"
          />

          {/* Current Month */}
          {monthlyStats && monthlyStats.length > 0 && (
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">This Month</h4>
                  <p className="text-xs text-gray-600">{monthlyStats[0].month}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Games</span>
                  <span className="text-lg font-bold text-gray-900">
                    {monthlyStats[0].games}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Score</span>
                  <span className={`text-2xl font-bold ${monthlyStats[0].percentage >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
                    {monthlyStats[0].percentage}%
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-emerald-200">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-green-600 font-bold text-lg">{monthlyStats[0].wins}</div>
                      <div className="text-gray-500">Wins</div>
                    </div>
                    <div>
                      <div className="text-yellow-600 font-bold text-lg">{monthlyStats[0].draws}</div>
                      <div className="text-gray-500">Draws</div>
                    </div>
                    <div>
                      <div className="text-red-600 font-bold text-lg">{monthlyStats[0].losses}</div>
                      <div className="text-gray-500">Losses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentFormSection;
