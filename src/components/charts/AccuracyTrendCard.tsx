import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../context/GamesContext';
import { getCachedAnalysis } from '../../hooks/useGameAnalysis';

interface TrendPoint {
  idx: number;
  accuracy: number;
  elo: number;
  label: string;
}

interface AccuracyTrendCardProps {
  /** Bump to force a re-read of cached analyses (e.g. after a batch analyze). */
  refreshKey?: number;
}

/**
 * Trend of your move accuracy across games that have been analysed with
 * Stockfish, plotted alongside your ELO at the time. Reads cached analyses.
 */
const AccuracyTrendCard = ({ refreshKey = 0 }: AccuracyTrendCardProps) => {
  const { games } = useGames();

  const points = useMemo<TrendPoint[]>(() => {
    const out: TrendPoint[] = [];
    games.forEach((g, i) => {
      if (!g.pgn) return;
      const a = getCachedAnalysis(g.pgn);
      if (!a) return;
      out.push({
        idx: i + 1,
        accuracy: g.color === 'W' ? a.accuracyWhite : a.accuracyBlack,
        elo: g.elo,
        label: g.tournament,
      });
    });
    return out.map((p, i) => ({ ...p, idx: i + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, refreshKey]);

  const avg = points.length
    ? Math.round((points.reduce((s, p) => s + p.accuracy, 0) / points.length) * 10) / 10
    : 0;

  return (
    <div className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold text-fg">Accuracy trend</h3>
        </div>
        {points.length > 0 && (
          <span className="text-sm text-fg-muted tabular-nums">avg {avg}% · {points.length} analysed</span>
        )}
      </div>

      {points.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">
          Analyse games that have moves (with the “Analyze with Stockfish” button) and your accuracy
          over time will appear here, alongside your ELO.
        </p>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="idx" tickLine={false} />
              <YAxis yAxisId="acc" domain={[0, 100]} tickLine={false} width={36} />
              <YAxis yAxisId="elo" orientation="right" domain={['dataMin - 30', 'dataMax + 30']} tickLine={false} width={44} />
              <Tooltip />
              <Line yAxisId="elo" type="monotone" dataKey="elo" stroke="#64748b" strokeWidth={1.5} dot={false} name="ELO" />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default AccuracyTrendCard;
