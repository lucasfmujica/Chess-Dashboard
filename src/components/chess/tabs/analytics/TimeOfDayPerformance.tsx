import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

/** Per time-of-day-slot aggregate row. */
interface TimeOfDayStat {
  time: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

interface TimeOfDayPerformanceProps {
  timeOfDayStats: TimeOfDayStat[];
}

const TimeOfDayPerformance = ({ timeOfDayStats }: TimeOfDayPerformanceProps) => {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-600"></div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-xl">
            <ClockIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">⏰ Time of Day Performance</h3>
            <p className="text-sm text-slate-600">Analyze when you perform best during the day</p>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          {timeOfDayStats.slice(0, 3).map((slot, idx) => {
            const isTopPerformer = idx === 0;
            return (
              <div key={idx} className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                isTopPerformer
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">{slot.time}</span>
                  {isTopPerformer && (
                    <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-200 rounded-full">
                      🏆 BEST
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{slot.score}%</span>
                  <span className="text-sm text-slate-600">score</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <span className="text-emerald-600 font-medium">{slot.wins}W</span> -
                  <span className="text-amber-600 font-medium">{slot.draws}D</span> -
                  <span className="text-rose-600 font-medium">{slot.losses}L</span>
                  <span className="ml-2 text-slate-500">({slot.total} games)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Table */}
        <div className="overflow-hidden border border-slate-200 rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold text-left text-slate-700 uppercase tracking-wider">Time Slot</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Games</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">W-D-L</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Score %</th>
                  <th scope="col" className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Win Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {timeOfDayStats.map((slot, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{slot.time}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-700">{slot.total}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="text-emerald-600 font-medium">{slot.wins}</span>
                      <span className="text-slate-400 mx-1">-</span>
                      <span className="text-amber-600 font-medium">{slot.draws}</span>
                      <span className="text-slate-400 mx-1">-</span>
                      <span className="text-rose-600 font-medium">{slot.losses}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="px-3 py-1 font-bold text-slate-900 bg-slate-100 rounded-lg">
                        {slot.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-3 py-1 font-bold rounded-lg ${
                        parseFloat(slot.winRate) >= 50
                          ? 'text-emerald-700 bg-emerald-100'
                          : 'text-rose-700 bg-rose-100'
                      }`}>
                        {slot.winRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Visual Chart */}
        <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200">
          <h4 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            Performance Distribution
          </h4>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timeOfDayStats}>
              <defs>
                <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorDraws" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
              <Bar dataKey="wins" fill="url(#colorWins)" name="Wins" radius={[8, 8, 0, 0]} />
              <Bar dataKey="draws" fill="url(#colorDraws)" name="Draws" radius={[8, 8, 0, 0]} />
              <Bar dataKey="losses" fill="url(#colorLosses)" name="Losses" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TimeOfDayPerformance;
