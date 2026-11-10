import { useMemo } from 'react';
import { Card, CardHeader, ResultMark } from '../../../ui';
import type { Game } from '../../../../types/chess';

const fmtPoints = (n: number): string => {
  const whole = Math.floor(n);
  if (n - whole < 0.5) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

const roundKey = (g: Game) => {
  const n = parseFloat(g.round ?? '');
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
};

/**
 * Every result in order, one line per tournament, the way a crosstable reads.
 * Games arrive oldest first; tournaments are listed most recent on top.
 */
const ResultsSheet = ({ games }: { games: Game[] }) => {
  const rows = useMemo(() => {
    const byTournament = new Map<string, { g: Game; i: number }[]>();
    games.forEach((g, i) => {
      const key = g.tournament || 'Sin torneo';
      const list = byTournament.get(key) ?? [];
      list.push({ g, i });
      byTournament.set(key, list);
    });
    return [...byTournament.entries()]
      .map(([name, list]) => {
        const sorted = [...list].sort((a, b) => roundKey(a.g) - roundKey(b.g) || a.i - b.i).map(x => x.g);
        const pts = sorted.reduce((s, g) => s + (g.result === 'W' ? 1 : g.result === 'D' ? 0.5 : 0), 0);
        return { name, games: sorted, pts };
      })
      .reverse();
  }, [games]);

  if (rows.length === 0) return null;

  return (
    <Card flush>
      <div className="p-5 pb-3 sm:p-6 sm:pb-3">
        <CardHeader title="Planilla de resultados" subtitle="Más reciente arriba" />
      </div>
      <ul className="border-t border-hairline">
        {rows.map(row => (
          <li
            key={row.name}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-hairline px-5 py-3 last:border-b-0 sm:grid-cols-[minmax(150px,220px)_1fr_64px] sm:px-6"
          >
            <span className="min-w-0 font-serif text-base leading-[22px] text-fg">{row.name}</span>
            <span className="order-last col-span-2 flex flex-wrap gap-1 sm:order-none sm:col-span-1">
              {row.games.map((g, i) => (
                <ResultMark key={g.id ?? i} result={g.result} outline />
              ))}
            </span>
            <span className="text-right font-mono text-sm tabular-nums text-fg">
              {fmtPoints(row.pts)} / {row.games.length}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default ResultsSheet;
