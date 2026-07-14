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

/** Cache explorer results per position so stepping back/forth never refetches. */
const explorerCache = new Map<string, ExplorerData>();

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Lichess masters opening explorer for the current position: what masters play,
 * with white/draw/black result rates. Lichess now requires an OAuth2 token on
 * this endpoint, so requests go through our `/api/explorer` proxy, which holds
 * the token server-side.
 *
 * The explorer host is aggressively rate-limited (and occasionally returns
 * auth/availability errors), so results are cached per position and rate-limit
 * responses are retried with backoff before giving up.
 */
const MovesExplorer = ({ fen, playedMove, onPlayMove }: MovesExplorerProps) => {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Serve cached positions instantly, with no spinner or network call.
    const cached = explorerCache.get(fen);
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const url = `/api/explorer?fen=${encodeURIComponent(fen)}&moves=12&topGames=0`;

    const run = async () => {
      setLoading(true);
      setError(null);
      // Retry a few times with backoff when Lichess rate-limits the explorer.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (res.status === 429) {
            await wait(800 * (attempt + 1));
            continue;
          }
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as ExplorerData;
          explorerCache.set(fen, json);
          if (!cancelled) {
            setData(json);
            setLoading(false);
          }
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          if (attempt < 3) {
            await wait(800 * (attempt + 1));
            continue;
          }
          if (!cancelled) {
            setError('Masters explorer is unavailable right now (Lichess). It’ll load when the service responds.');
            setLoading(false);
          }
          return;
        }
      }
      // Exhausted retries while being rate-limited.
      if (!cancelled) {
        setError('Masters explorer is busy (rate-limited) — try again in a moment.');
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => {
      cancelled = true;
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
        <div className="max-h-[260px] overflow-auto">
          <table className="w-full text-sm min-w-[420px]">
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
                        <div className="bg-zinc-100 text-zinc-900" style={{ width: `${pct(m.white, g)}%` }}>{pct(m.white, g) >= 12 ? pct(m.white, g) : ''}</div>
                        <div className="bg-zinc-400 text-zinc-900" style={{ width: `${pct(m.draws, g)}%` }}>{pct(m.draws, g) >= 12 ? pct(m.draws, g) : ''}</div>
                        <div className="bg-zinc-800 text-zinc-100" style={{ width: `${pct(m.black, g)}%` }}>{pct(m.black, g) >= 12 ? pct(m.black, g) : ''}</div>
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
