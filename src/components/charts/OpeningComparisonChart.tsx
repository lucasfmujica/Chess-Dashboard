import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { OPENING_THRESHOLDS } from '../../constants/chessConstants';
import { getChartHeight } from '../../utils/chartUtils';

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
    label: `${color === 'white' ? '⚪' : '⚫'} ${o.name}`,
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
    <div className="p-6 bg-surface rounded-lg border border-hairline">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-fg">Opening Comparison</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-md border border-hairline bg-surface p-1">
            {(['both', 'white', 'black'] as ColorScope[]).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={`px-2.5 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  scope === s ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="rounded-md border border-hairline bg-surface text-fg text-xs px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
            aria-label="Sort by"
          >
            <option value="winRate">Sort: win rate</option>
            <option value="games">Sort: games played</option>
            <option value="alphabetical">Sort: A–Z</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            Min games
            <input
              type="number"
              min={1}
              value={minGames}
              onChange={e => setMinGames(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 rounded-md border border-hairline bg-surface text-fg text-xs px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted py-8 text-center">
          No openings with at least {minGames} game{minGames === 1 ? '' : 's'} yet.
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
                  <div className="p-3 bg-surface border border-hairline rounded shadow text-sm">
                    <p className="font-semibold text-fg">{r.label}</p>
                    <p className="text-fg-muted">{r.eco} · {r.games} games</p>
                    <p className="text-fg">{r.wins}W {r.draws}D {r.losses}L · {r.winRate}% win rate</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
              {rows.map(r => (
                <Cell key={r.key} fill={r.winRate >= 50 ? 'rgb(var(--win))' : 'rgb(var(--loss))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default OpeningComparisonChart;
