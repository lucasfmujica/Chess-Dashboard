import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUpDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, CardHeader, ResultMark } from '../ui';
import { useSourceFilteredGames } from '../../context/GamesContext';
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
type SortKey = 'order' | 'date' | 'opponent' | 'result' | 'accuracy';

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

/** Spanish result words, so the search box finds "tablas" or "derrota". */
const RESULT_META: Record<Game['result'], { label: string }> = {
  W: { label: 'Victoria' },
  L: { label: 'Derrota' },
  D: { label: 'Tablas' },
};

/** 3.5 → "3½", 0.5 → "½": points the way a crosstable writes them. */
const formatPoints = (pts: number): string => {
  const whole = Math.floor(pts);
  const half = pts - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

const RESULT_RANK: Record<Game['result'], number> = { W: 0, D: 1, L: 2 };

const GamesAnalysisList = ({ onLoad, loadedIndex, onAnalyzed }: GamesAnalysisListProps) => {
  const games = useSourceFilteredGames();
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
    sourceFilter,
    setSourceFilter,
    speedFilter,
    setSpeedFilter,
    hasActiveFilters,
    clearFilters,
    filteredItems: searchedRows,
  } = useGameFilters(rows, {
    date: r => r.g.date,
    result: r => r.g.result,
    source: r => r.g.source,
    speed: r => r.g.speed,
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
        case 'date': {
          // Undated games sort last whichever way the column is pointing —
          // flipping the direction shouldn't park them on top.
          if (!a.g.date || !b.g.date) return a.g.date ? -1 : b.g.date ? 1 : 0;
          const byDay = a.g.date.localeCompare(b.g.date);
          // Same day: fall back to the array order, which fetchGames already
          // sorted by time of day.
          return dir * (byDay !== 0 ? byDay : a.index - b.index);
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
      setSortDir(key === 'accuracy' || key === 'date' ? 'desc' : 'asc');
    }
  };

  const SortableTh = ({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <th
      scope="col"
      aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`whitespace-nowrap px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`text-label inline-flex items-center gap-1 !text-fg-muted hover:!text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <ChevronUpDownIcon className={`h-3.5 w-3.5 ${sortKey === k ? 'text-accent' : 'text-fg-subtle/50'}`} />
      </button>
    </th>
  );

  // Rows grouped by tournament, the way a scorebook files them. Only while the
  // list keeps its own order: sorted by rival or result, consecutive rows no
  // longer share a tournament and a group row per game would be noise.
  const grouped = sortKey === 'order' || sortKey === 'date';
  const groupScore = useMemo(() => {
    const out = new Map<string, { pts: number; n: number }>();
    filtered.forEach(r => {
      const key = r.g.tournament || '';
      const cur = out.get(key) ?? { pts: 0, n: 0 };
      cur.pts += r.g.result === 'W' ? 1 : r.g.result === 'D' ? 0.5 : 0;
      cur.n += 1;
      out.set(key, cur);
    });
    return out;
  }, [filtered]);

  return (
    <Card>
      <CardHeader
        title="Tus partidas"
        subtitle={
          <span className="font-mono tabular-nums">
            {record.total} {record.total === 1 ? 'partida' : 'partidas'} · +{record.w} ={record.d} −{record.l} ·{' '}
            {record.winRate} % de los puntos
          </span>
        }
        actions={
          batch ? (
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 overflow-hidden rounded-sm bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.round((batch.done / batch.total) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-fg-muted">
                {batch.done}/{batch.total} · {batch.name}
              </span>
              <Button variant="ghost" size="sm" onClick={cancelBatch}>
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Button
                  size="sm"
                  icon={ArrowDownTrayIcon}
                  onClick={() => setShowExportMenu(s => !s)}
                  disabled={filtered.length === 0}
                  aria-expanded={showExportMenu}
                >
                  Exportar
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded border border-hairline bg-surface py-1">
                    <button
                      onClick={() => {
                        downloadFile(gamesToPGN(filtered.map(r => r.g)), 'games.pgn', 'application/x-chess-pgn');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-app"
                    >
                      PGN <span className="font-mono tabular-nums text-fg-subtle">({filtered.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        downloadFile(gamesToCSV(filtered.map(r => r.g)), 'games.csv', 'text/csv');
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-app"
                    >
                      CSV <span className="font-mono tabular-nums text-fg-subtle">({filtered.length})</span>
                    </button>
                  </div>
                )}
              </div>
              <Button variant="primary" size="sm" onClick={analyzeAll} disabled={pendingCount === 0}>
                {pendingCount > 0 ? `Analizar todas (${pendingCount})` : 'Todas analizadas'}
              </Button>
            </>
          )
        }
      />

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
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          speedFilter={speedFilter}
          onSpeedFilterChange={setSpeedFilter}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          searchPlaceholder="Rival, apertura o torneo"
        />
      </div>

      <div className="mt-4 max-h-[480px] overflow-auto rounded border border-hairline">
        <table className="w-full min-w-[760px] text-sm tabular-nums">
          <thead className="sticky top-0 z-10 border-b border-hairline-strong bg-surface-2">
            <tr>
              <SortableTh label="#" k="order" />
              <SortableTh label="Fecha" k="date" />
              <SortableTh label="Rival" k="opponent" />
              <th scope="col" className="text-label whitespace-nowrap px-3 py-2 text-right !text-fg-muted">ELO</th>
              <th scope="col" className="text-label whitespace-nowrap px-3 py-2 text-left !text-fg-muted">Color</th>
              <th scope="col" className="text-label whitespace-nowrap px-3 py-2 text-left !text-fg-muted">Apertura</th>
              <SortableTh label="Res." k="result" align="right" />
              <SortableTh label="Análisis" k="accuracy" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, pos) => {
              const isLoaded = r.index === loadedIndex;
              const tournament = r.g.tournament || '';
              const newGroup = grouped && (pos === 0 || (filtered[pos - 1].g.tournament || '') !== tournament);
              const score = groupScore.get(tournament);
              return (
                <Fragment key={r.index}>
                  {newGroup && (
                    <tr className="border-b border-hairline-strong bg-app">
                      <td colSpan={6} className="px-3 pb-2 pt-5">
                        <span className="font-serif text-[17px] font-semibold leading-snug text-fg">
                          {tournament || 'Sin torneo'}
                        </span>
                      </td>
                      <td colSpan={2} className="px-3 pb-2 pt-5 text-right font-mono text-xs text-fg-muted">
                        {score && `${formatPoints(score.pts)} / ${score.n}`}
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => r.hasMoves && onLoad(r.index)}
                    onKeyDown={e => {
                      if (r.hasMoves && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onLoad(r.index);
                      }
                    }}
                    tabIndex={r.hasMoves ? 0 : undefined}
                    aria-selected={isLoaded || undefined}
                    title={
                      !r.hasMoves
                        ? 'Sin jugadas: agregalas arriba para analizarla'
                        : r.playable
                          ? 'Cargar en el tablero'
                          : 'Tiene PGN pero las jugadas no se pueden leer: probá pegarlo de nuevo'
                    }
                    className={`border-b border-hairline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                      r.hasMoves ? 'cursor-pointer hover:bg-app' : 'text-fg-muted'
                    } ${isLoaded ? 'bg-accent/10' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-fg-subtle">{r.index + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-fg-muted">
                      {r.g.date ?? '—'}
                      {r.g.time && <span className="ml-1 text-fg-subtle">{r.g.time}</span>}
                    </td>
                    <td className={`px-3 py-2 ${isLoaded ? 'text-accent' : 'text-fg'}`}>{r.g.opp}</td>
                    <td className="px-3 py-2 text-right font-mono text-fg-muted">{r.g.opp_elo > 0 ? r.g.opp_elo : '—'}</td>
                    <td className="px-3 py-2 text-fg-muted">{r.g.color === 'W' ? 'Blancas' : 'Negras'}</td>
                    <td className="max-w-[260px] px-3 py-2" title={r.opening}>
                      <span className="flex items-baseline gap-2">
                        {r.g.eco && (
                          <span className="shrink-0 rounded-sm border border-hairline px-1.5 font-mono text-xs text-fg-muted">
                            {r.g.eco}
                          </span>
                        )}
                        <span className="truncate font-serif text-fg">{r.opening}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ResultMark result={r.g.result} outline />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {!r.hasMoves ? (
                        <Badge>Sin jugadas</Badge>
                      ) : !r.playable ? (
                        <Badge tone="alert">PGN ilegible</Badge>
                      ) : r.accuracy !== null ? (
                        <Badge>
                          Analizada · <span className="font-mono tabular-nums">{r.accuracy} %</span>
                        </Badge>
                      ) : (
                        <Badge tone="today">Sin analizar</Badge>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-fg-muted">Ninguna partida coincide con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {failed.length > 0 && (
        <p className="mt-2 text-xs text-loss">
          No se {failed.length === 1 ? 'pudo analizar 1 partida' : `pudieron analizar ${failed.length} partidas`} (jugadas
          ilegibles): {failed.join(', ')}. Volvé a pegar su PGN arriba.
        </p>
      )}
      <p className="mt-2 text-xs text-fg-subtle">
        Tocá una partida para cargarla en el tablero. «Analizar todas» corre Stockfish sobre cada partida con
        jugadas: puede tardar un rato y alimenta la precisión por partida.
      </p>
    </Card>
  );
};

export default GamesAnalysisList;
