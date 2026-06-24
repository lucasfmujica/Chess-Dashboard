import type { TournamentStat } from '../../../../types/chess';

interface TournamentTableProps {
  tournamentStats: TournamentStat[];
}

const TournamentTable = ({ tournamentStats }: TournamentTableProps) => {
  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-fg mb-2">Tournament Performance</h3>
          <p className="text-fg-muted">Detailed breakdown of all tournament results</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="px-6 py-4 text-xs font-bold text-left text-fg-muted uppercase tracking-wider">Tournament</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">Games</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">W-D-L</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">Avg Opp</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">Performance</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">White</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">Black</th>
                <th scope="col" className="px-6 py-4 text-xs font-bold text-center text-fg-muted uppercase tracking-wider">ELO Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {tournamentStats.map((t, idx) => (
                <tr key={idx} className="hover:bg-surface-2 transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold text-fg">{t.tournament}</td>
                  <td className="px-6 py-4 text-sm text-center tabular-nums">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-fg">
                      {t.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-center text-fg tabular-nums">{t.score}</td>
                  <td className="px-6 py-4 text-sm text-center tabular-nums">
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold text-xs">{t.wins}</span>
                      <span className="text-fg-subtle">-</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold text-xs">{t.draws}</span>
                      <span className="text-fg-subtle">-</span>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-rose-100 text-rose-700 font-semibold text-xs">{t.losses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.avgOppElo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center tabular-nums">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent/10 text-accent font-bold">
                      {t.performanceRating}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.whitePerformance}</td>
                  <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.blackPerformance}</td>
                  <td className="px-6 py-4 text-sm font-bold text-center tabular-nums">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold ${
                      t.eloChange > 0 ? 'bg-emerald-100 text-emerald-700' :
                      t.eloChange < 0 ? 'bg-rose-100 text-rose-700' : 'bg-surface-2 text-fg-muted'
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
