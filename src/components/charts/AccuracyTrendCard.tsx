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
import { useSourceFilteredGames } from '../../context/GamesContext';
import { getCachedAnalysis } from '../../hooks/useGameAnalysis';
import { Card, CardHeader } from '../ui';

const TOOLTIP_STYLE = {
  background: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 4,
  fontSize: 12,
  color: 'rgb(var(--fg))',
};
const TICK = { fill: 'rgb(var(--fg-muted))', fontSize: 11, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' };

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
  const games = useSourceFilteredGames();

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
    <Card>
      <CardHeader
        title="Precisión por partida"
        subtitle={
          points.length > 0 ? (
            <span className="font-mono tabular-nums">
              promedio {avg} % · {points.length} {points.length === 1 ? 'partida analizada' : 'partidas analizadas'}
            </span>
          ) : (
            'Stockfish sobre las partidas con jugadas, junto a tu ELO de ese momento'
          )
        }
      />

      {points.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">
          Analizá las partidas que tienen jugadas (con «Analizar con Stockfish» o «Analizar todas») y acá
          aparece tu precisión en el tiempo, al lado de tu ELO.
        </p>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={points}>
              <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="idx" tickLine={false} axisLine={{ stroke: 'rgb(var(--border-strong))' }} tick={TICK} />
              <YAxis yAxisId="acc" domain={[0, 100]} tickLine={false} axisLine={false} width={36} tick={TICK} />
              <YAxis yAxisId="elo" orientation="right" domain={['dataMin - 30', 'dataMax + 30']} tickLine={false} axisLine={false} width={44} tick={TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line yAxisId="elo" type="monotone" dataKey="elo" stroke="rgb(var(--fg-subtle))" strokeWidth={1.5} dot={false} name="ELO" />
              <Line yAxisId="acc" type="monotone" dataKey="accuracy" stroke="rgb(var(--cat-1))" strokeWidth={2} dot={{ r: 3, fill: 'rgb(var(--cat-1))' }} name="Precisión %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default AccuracyTrendCard;
