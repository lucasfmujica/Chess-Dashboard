import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CpuChipIcon, ChevronUpDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../context/GamesContext';
import { getCachedAnalysis, analyzeAndCacheGame } from '../../hooks/useGameAnalysis';
import { useGameFilters } from '../../hooks/useGameFilters';
import { loadOpeningsBook, deepestOpening } from '../../utils/openings';
import { fensFromPgn } from '../../utils/chessReplay';
import { ecoNames } from '../../constants/ecoNames';
import { gamesToPGN, gamesToCSV, downloadFile } from '../../utils/exportUtils';
import GameFiltersBar from './GameFiltersBar';
import type { Game } from '../../types/chess';

interface GamesAnalysisListProps {
  /** Load a game (by its index in `games`) onto the board. */
  onLoad: (index: number) => void;
  /** Index of the currently-loaded game, to highlight its row. */
  loadedIndex: number | null;
  /** Called after each game finishes analysing (to refresh the accuracy trend). */
  onAnalyzed?: () => void;
}

type Book = Record<string, string>;
type SortKey = 'order' | 'opponent' | 'result' | 'accuracy';

interface Row {
  index: number;
  g: Game;
  opening: string;
  accuracy: number | null;
  /** Has a PGN at all. */
  hasMoves: boolean;
  /** PGN parses into at least one move (false = present but unreadable). */
  playable: boolean;
}

const RESULT_META: Record<Game['result'], { label: string; cls: string }> = {
  W: { label: 'Win', cls: 'text-win' },
  L: { label: 'Loss', cls: 'text-loss' },
  D: { label: 'Draw', cls: 'text-draw' },
};

const RESULT_RANK: Record<Game['result'], number> = { W: 0, D: 1, L: 2 };

const GamesAnalysisList = ({ onLoad, loadedIndex, onAnalyzed }: GamesAnalysisListProps) => {
  const { games } = useGames();
  const [book, setBook] = useState<Book | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // Bumped after each game is analysed so cached accuracy re-reads.
  const [analyzedTick, setAnalyzedTick] = useState(0);
  const [batch, setBatch] = useState<{ done: number; total: number; name: string } | null>(null);
  // Games that couldn't be analysed in the last batch (unreadable/errored).
  const [failed, setFailed] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    loadOpeningsBook()
      .then(b => active && setBook(b))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Opening name + parse status per game. Parsing the moves is the expensive
  // part, so do it once per games/book change (not on every analysis tick).
  const parsed = useMemo(
    () =>
      games.map(g => {
        const fens = g.pgn ? fensFromPgn(g.pgn) : [];
        const playable = fens.length > 1;
        let opening = g.opening || ecoNames[g.eco] || g.eco || '—';
        if (book && playable) {
          const o = deepestOpening(fens, book);
          if (o) opening = o.name;
        }
        return { opening, playable };
      }),
    [games, book]
  );

  const rows = useMemo<Row[]>(() => {
    void analyzedTick; // re-read cached analyses when this changes
    return games.map((g, index) => {
      const a = getCachedAnalysis(g.pgn);
      const accuracy = a ? (g.color === 'W' ? a.accuracyWhite : a.accuracyBlack) : null;
      return {
        index,
        g,
        opening: parsed[index].opening,
        accuracy,
        hasMoves: !!g.pgn,
        playable: parsed[index].playable,
      };
    });
  }, [games, parsed, analyzedTick]);

  // Overall record across all games (independent of the search filter).
  const record = useMemo(() => {
    let w = 0,
      d = 0,
      l = 0;
    games.forEach(g => {
      if (g.result === 'W') w++;
      else if (g.result === 'D') d++;
      else l++;
    });
    const total = w + d + l;
    const winRate = total ? Math.round(((w + d * 0.5) / total) * 100) : 0;
    return { w, d, l, total, winRate };
  }, [games]);

  const {
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resultFilter,
    setResultFilter,
    hasActiveFilters,
    clearFilters,
    filteredItems: searchedRows,
  } = useGameFilters(rows, {
    date: r => r.g.date,
    result: r => r.g.result,
    searchText: r => `${r.g.opp} ${r.opening} ${r.g.tournament} ${RESULT_META[r.g.result].label}`,
  });

  const filtered = useMemo(() => {
    const base = searchedRows.slice();
    const dir = sortDir === 'asc' ? 1 : -1;
    base.sort((a, b) => {
      switch (sortKey) {
        case 'opponent':
          return dir * a.g.opp.localeCompare(b.g.opp);
        case 'result':
          return dir * (RESULT_RANK[a.g.result] - RESULT_RANK[b.g.result]);
        case 'accuracy': {
          const av = a.accuracy ?? -1;
          const bv = b.accuracy ?? -1;
          return dir * (av - bv);
        }
        default:
          return dir * (a.index - b.index);
      }
    });
    return base;
  }, [searchedRows, sortKey, sortDir]);

  // Only games whose moves actually parse can be analysed.
  const pendingCount = useMemo(() => {
    void analyzedTick;
    return games.filter((g, i) => parsed[i].playable && !getCachedAnalysis(g.pgn)).length;
  }, [games, parsed, analyzedTick]);

  const analyzeAll = useCallback(async () => {
    const list = games
      .map((g, i) => ({ g, i }))
      .filter(({ g, i }) => parsed[i].playable && !getCachedAnalysis(g.pgn));
    if (list.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setFailed([]);
    setBatch({ done: 0, total: list.length, name: list[0].g.opp });

    let done = 0;
    const failures: string[] = [];
    for (const { g } of list) {
      if (controller.signal.aborted) break;
      setBatch({ done, total: list.length, name: g.opp });
      try {
        const res = await analyzeAndCacheGame(g.pgn!, fensFromPgn(g.pgn), { signal: controller.signal });
        if (!res) failures.push(g.opp);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') break;
        failures.push(g.opp); // skip a game that errors and keep going
      }
      done++;
      setAnalyzedTick(t => t + 1);
      onAnalyzed?.();
      setBatch({ done, total: list.length, name: g.opp });
    }
    setFailed(failures);
    setBatch(null);
    abortRef.current = null;
  }, [games, parsed, onAnalyzed]);

  const cancelBatch = useCallback(() => abortRef.current?.abort(), []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'accuracy' ? 'desc' : 'asc');
    }
  };

  const SortableTh = ({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <th
      scope="col"
      onClick={() => toggleSort(k)}
      className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} text-[11px] font-medium uppercase tracking-wide text-fg-subtle cursor-pointer select-none hover:text-fg`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <ChevronUpDownIcon className={`w-3.5 h-3.5 ${sortKey === k ? 'text-accent' : 'text-fg-subtle/50'}`} />
      </span>
    </th>
  );

  return (
    <div className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-fg">Your games</h3>
          <p className="mt-0.5 text-sm text-fg-muted tabular-nums">
            {record.total} games · <span className="text-win">{record.w}W</span>{' '}
            <span className="text-draw">{record.d}D</span> <span className="text-loss">{record.l}L</span> ·{' '}
            <span className="font-medium text-fg">{record.winRate}% win rate</span>
          </p>
        </div>

        {batch ? (
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round((batch.done / batch.total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-fg-muted tabular-nums">
              {batch.done}/{batch.total} · {batch.name}
            </span>
            <button onClick={cancelBatch} className="text-xs text-fg-muted hover:text-fg">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(s => !s)}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-hairline bg-surface text-fg text-sm font-medium hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 rounded-md border border-hairline bg-surface shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      downloadFile(gamesToPGN(filtered.map(r => r.g)), 'games.pgn', 'application/x-chess-pgn');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface-2"
                  >
                    PGN ({filtered.length})
                  </button>
                  <button
                    onClick={() => {
                      downloadFile(gamesToCSV(filtered.map(r => r.g)), 'games.csv', 'text/csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-surface-2"
                  >
                    CSV ({filtered.length})
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={analyzeAll}
              disabled={pendingCount === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-fg text-app text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <CpuChipIcon className="w-4 h-4" />
              {pendingCount > 0 ? `Analyze all (${pendingCount})` : 'All analyzed'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <GameFiltersBar
          query={query}
          onQueryChange={setQuery}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          resultFilter={resultFilter}
          onResultFilterChange={setResultFilter}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          searchPlaceholder="Search opponent, opening, tournament…"
        />
      </div>

      <div className="mt-4 max-h-[420px] overflow-y-auto rounded-lg border border-hairline">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 sticky top-0 z-10">
            <tr>
              <SortableTh label="#" k="order" />
              <SortableTh label="Opponent" k="opponent" />
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Color</th>
              <SortableTh label="Result" k="result" />
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Opening</th>
              <SortableTh label="Accuracy" k="accuracy" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filtered.map(r => {
              const meta = RESULT_META[r.g.result];
              const isLoaded = r.index === loadedIndex;
              return (
                <tr
                  key={r.index}
                  onClick={() => r.hasMoves && onLoad(r.index)}
                  title={
                    !r.hasMoves
                      ? 'No moves yet — add them above to analyse'
                      : r.playable
                        ? 'Load on the board'
                        : "Has a PGN but the moves can't be read — try re-pasting it"
                  }
                  className={`${r.hasMoves ? 'cursor-pointer' : 'opacity-60'} hover:bg-surface-2 ${isLoaded ? 'bg-accent/10' : ''}`}
                >
                  <td className="px-3 py-2 text-fg-subtle tabular-nums">{r.index + 1}</td>
                  <td className="px-3 py-2">
                    <span className="text-fg">{r.g.opp}</span>
                    {r.g.opp_elo > 0 && <span className="ml-1 text-xs text-fg-subtle tabular-nums">({r.g.opp_elo})</span>}
                    {!r.hasMoves && <span className="ml-2 text-[10px] uppercase tracking-wide text-fg-subtle">no moves</span>}
                    {r.hasMoves && !r.playable && <span className="ml-2 text-[10px] uppercase tracking-wide text-loss">bad PGN</span>}
                  </td>
                  <td className="px-3 py-2 text-fg-muted">{r.g.color === 'W' ? '⚪' : '⚫'}</td>
                  <td className={`px-3 py-2 font-medium ${meta.cls}`}>{meta.label}</td>
                  <td className="px-3 py-2 text-fg-muted truncate max-w-[260px]" title={r.opening}>{r.opening}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.accuracy !== null ? (
                      <span className="text-fg">{r.accuracy}%</span>
                    ) : (
                      <span className="text-fg-subtle">{r.hasMoves ? '—' : ''}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-fg-muted">No games match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {failed.length > 0 && (
        <p className="mt-2 text-xs text-loss">
          Couldn’t analyse {failed.length} game{failed.length === 1 ? '' : 's'} (unreadable moves): {failed.join(', ')}. Re-paste their PGN above.
        </p>
      )}
      <p className="mt-2 text-xs text-fg-subtle">
        Click a game to load it on the board. “Analyze all” runs Stockfish 18 over every game with moves — it can take a while and fills the accuracy trend.
      </p>
    </div>
  );
};

export default GamesAnalysisList;
