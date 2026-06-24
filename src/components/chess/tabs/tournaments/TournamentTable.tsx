import type { TournamentStat } from '../../../../types/chess';

interface TournamentTableProps {
  tournamentStats: TournamentStat[];
}

const TournamentTable = ({ tournamentStats }: TournamentTableProps) => {
  return (
    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Performance</h3>
          <p className="text-gray-600">Detailed breakdown of all tournament results</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th scope="col" className="px-6 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Tournament</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Games</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">W-D-L</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Avg Opp</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Performance</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">White</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Black</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">ELO Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tournamentStats.map((t, idx) => (
                <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800 dark:hover:to-transparent transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{t.tournament}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {t.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-center text-gray-900">{t.score}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold text-xs">{t.wins}</span>
                      <span className="text-gray-400">-</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold text-xs">{t.draws}</span>
                      <span className="text-gray-400">-</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-rose-100 text-rose-700 font-semibold text-xs">{t.losses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.avgOppElo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold">
                      {t.performanceRating}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.whitePerformance}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.blackPerformance}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold ${
                      t.eloChange > 0 ? 'bg-emerald-100 text-emerald-700' :
                      t.eloChange < 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TournamentTable;
