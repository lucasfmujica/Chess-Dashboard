import { useEffect, useState } from 'react';

interface ExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
}

interface ExplorerData {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  opening?: { eco: string; name: string } | null;
}

interface MovesExplorerProps {
  fen: string;
  /** SAN actually played from this position (highlighted if present). */
  playedMove?: string;
  /** Play a master move (uci) into the line. */
  onPlayMove?: (uci: string) => void;
}

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/**
 * Lichess masters opening explorer for the current position: what masters play,
 * with white/draw/black result rates. Public API, no key required.
 */
const MovesExplorer = ({ fen, playedMove, onPlayMove }: MovesExplorerProps) => {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&moves=12&topGames=0`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Explorer error ${res.status}`);
        const json = (await res.json()) as ExplorerData;
        setData(json);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Could not load master games.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [fen]);

  const totalGames = data ? data.white + data.draws + data.black : 0;

  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Masters</h3>
        {data?.opening && <span className="text-xs text-fg-muted truncate ml-2">{data.opening.name}</span>}
      </div>

      {loading && <p className="px-4 py-3 text-xs text-fg-muted">Loading master games…</p>}
      {error && <p className="px-4 py-3 text-xs text-loss">{error}</p>}
      {!loading && !error && data && data.moves.length === 0 && (
        <p className="px-4 py-3 text-xs text-fg-muted">No master games from this position.</p>
      )}

      {!loading && !error && data && data.moves.length > 0 && (
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 sticky top-0">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-left text-[11px] font-medium uppercase text-fg-subtle">Move</th>
                <th scope="col" className="px-3 py-1.5 text-right text-[11px] font-medium uppercase text-fg-subtle">Games</th>
                <th scope="col" className="px-3 py-1.5 text-left text-[11px] font-medium uppercase text-fg-subtle">White / Draw / Black</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.moves.map(m => {
                const g = m.white + m.draws + m.black;
                const isPlayed = playedMove && m.san === playedMove;
                return (
                  <tr
                    key={m.uci}
                    onClick={() => onPlayMove?.(m.uci)}
                    className={`${onPlayMove ? 'cursor-pointer' : ''} hover:bg-surface-2 ${isPlayed ? 'bg-accent/10' : ''}`}
                  >
                    <td className="px-3 py-1.5">
                      <span className={`font-medium tabular-nums ${isPlayed ? 'text-accent' : 'text-fg'}`}>{m.san}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-fg-muted tabular-nums">
                      {g.toLocaleString()}
                      <span className="ml-1 text-fg-subtle">({pct(g, totalGames)}%)</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex h-3.5 w-full max-w-[180px] overflow-hidden rounded-sm border border-hairline tabular-nums text-[9px] leading-[14px] text-center">
                        <div className="bg-white text-slate-900" style={{ width: `${pct(m.white, g)}%` }}>{pct(m.white, g) >= 12 ? pct(m.white, g) : ''}</div>
                        <div className="bg-slate-400 text-slate-900" style={{ width: `${pct(m.draws, g)}%` }}>{pct(m.draws, g) >= 12 ? pct(m.draws, g) : ''}</div>
                        <div className="bg-slate-900 text-white" style={{ width: `${pct(m.black, g)}%` }}>{pct(m.black, g) >= 12 ? pct(m.black, g) : ''}</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MovesExplorer;
