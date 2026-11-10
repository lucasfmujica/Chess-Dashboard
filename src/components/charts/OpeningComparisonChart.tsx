import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OPENING_THRESHOLDS } from '../../constants/chessConstants';
import { getChartHeight } from '../../utils/chartUtils';
import { Card, CardHeader, SegmentedControl, type Segment } from '../ui';

interface AnalyzedOpening {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  isMain: boolean;
  needsWork: boolean;
}

interface OpeningComparisonChartProps {
  white: AnalyzedOpening[];
  black: AnalyzedOpening[];
}

type ColorScope = 'white' | 'black' | 'both';
type SortMode = 'winRate' | 'games' | 'alphabetical';

const SCOPES: Segment<ColorScope>[] = [
  { value: 'both', label: 'Ambos' },
  { value: 'white', label: 'Blancas' },
  { value: 'black', label: 'Negras' },
];

interface Row {
  key: string;
  label: string;
  color: 'white' | 'black';
  eco: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}

const toRows = (openings: AnalyzedOpening[], color: 'white' | 'black'): Row[] =>
  openings.map(o => ({
    key: `${color}-${o.eco}`,
    label: `${color === 'white' ? 'B' : 'N'} · ${o.name}`,
    color,
    eco: o.eco,
    games: o.games,
    wins: o.wins,
    draws: o.draws,
    losses: o.losses,
    winRate: o.winRate,
  }));

const OpeningComparisonChart = ({ white, black }: OpeningComparisonChartProps) => {
  const [scope, setScope] = useState<ColorScope>('both');
  const [sortMode, setSortMode] = useState<SortMode>('winRate');
  const [minGames, setMinGames] = useState(OPENING_THRESHOLDS.MIN_GAMES_FOR_ANALYSIS);

  const rows = useMemo(() => {
    const all =
      scope === 'white' ? toRows(white, 'white') : scope === 'black' ? toRows(black, 'black') : [...toRows(white, 'white'), ...toRows(black, 'black')];

    const filtered = all.filter(r => r.games >= minGames);

    const sorted = filtered.sort((a, b) => {
      if (sortMode === 'winRate') return b.winRate - a.winRate;
      if (sortMode === 'games') return b.games - a.games;
      return a.label.localeCompare(b.label);
    });
    return sorted;
  }, [white, black, scope, sortMode, minGames]);

  return (
    <Card>
      <CardHeader
        title="Comparación de aperturas"
        subtitle="Puntaje por apertura, B = Blancas · N = Negras"
        className="mb-4"
        actions={
          <>
            <SegmentedControl options={SCOPES} value={scope} onChange={setScope} size="sm" aria-label="Color" />
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="h-8 rounded border border-hairline bg-surface px-2 text-xs text-fg focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              aria-label="Ordenar por"
            >
              <option value="winRate">Ordenar: puntaje</option>
              <option value="games">Ordenar: partidas</option>
              <option value="alphabetical">Ordenar: A–Z</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-fg-muted">
              Mín. partidas
              <input
                type="number"
                min={1}
                value={minGames}
                onChange={e => setMinGames(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-14 rounded border border-hairline bg-surface px-2 font-mono text-xs tabular-nums text-fg focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              />
            </label>
          </>
        }
      />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">
          Todavía no hay aperturas con al menos {minGames} partida{minGames === 1 ? '' : 's'}.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(getChartHeight('small'), rows.length * 32)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="rgb(var(--fg-subtle))" unit="%" />
            <YAxis
              type="category"
              dataKey="label"
              width={180}
              tick={{ fontSize: 11 }}
              stroke="rgb(var(--fg-subtle))"
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgb(var(--surface-2))' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const r = payload[0].payload as Row;
                return (
                  <div className="rounded border border-hairline bg-surface p-3 text-sm">
                    <p className="font-serif font-semibold text-fg">{r.label}</p>
                    <p className="text-fg-muted">{r.eco} · {r.games} partidas</p>
                    <p className="font-mono tabular-nums text-fg">+{r.wins} ={r.draws} −{r.losses} · {r.winRate}%</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="winRate" radius={[0, 2, 2, 0]}>
              {rows.map(r => (
                <Cell key={r.key} fill={r.winRate >= 50 ? 'rgb(var(--win))' : 'rgb(var(--loss))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default OpeningComparisonChart;
