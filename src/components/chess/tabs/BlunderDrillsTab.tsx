import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../boardTheme';
import BoardFrame from '../BoardFrame';
import { Chess } from 'chess.js';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useBlunderDrills } from '../../../hooks/useBlunderDrills';
import { isDue, nextReviewAt } from '../../../utils/srs';
import { Card } from '../../ui/Card';
import Badge from '../../ui/Badge';
import ResultMark from '../../ui/ResultMark';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard, { ClockBar } from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';
import { ecoNames } from '../../../constants/ecoNames';
import { isEngineOnly } from '../../../constants/maia';
import PuzzleBoard from '../PuzzleBoard';
import CalculationExercise from '../CalculationExercise';
import ConceptQuickAdd from '../ConceptQuickAdd';
import type { BlunderDrill } from '../../../types/blunders';

/**
 * `calculo` is the coached exercise: sit on the position, write candidates,
 * then play. `solve` is the ChessTempo loop — fast, good for volume, and the
 * wrong reflex to train exclusively. `review` is reading, not training.
 */
type Mode = 'solve' | 'calculo' | 'review';
type ColorFilter = 'all' | 'W' | 'B';
type ListFilter = 'due' | 'all';
/** Ver constants/maia: el mismo umbral filtra la cola diaria. */
type FindFilter = 'all' | 'human' | 'engine';

/** How long the "Resuelto" banner stays up before the next puzzle loads. */
const AUTO_ADVANCE_MS = 1400;

const fmtEval = (cp: number) => (Math.abs(cp) >= 9000 ? '#' : (cp / 100).toFixed(1));

const uciSquares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/** UCI of the move actually played, derived from its stored SAN (for the "reveal" arrow). */
const playedUciFor = (drill: BlunderDrill): string | undefined => {
  try {
    const move = new Chess(drill.fenBefore).move(drill.playedSan);
    return move ? move.from + move.to : undefined;
  } catch {
    return undefined;
  }
};

const drillTitle = (drill: BlunderDrill) =>
  drill.game.openingName || (drill.game.eco ? ecoNames[drill.game.eco] || drill.game.eco : 'Blunder');

const BlunderDrillsTab = () => {
  const {
    drills,
    loading,
    mining,
    batch,
    pendingAnalysisCount,
    error,
    mine,
    analyzeAndMine,
    cancelBatch,
    review,
    solve,
  } = useBlunderDrills();
  // Solving is the default: this tab is a puzzle trainer that happens to be
  // built from your own games, not a flashcard deck you read.
  const [mode, setMode] = useState<Mode>('solve');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [listFilter, setListFilter] = useState<ListFilter>('due');
  const [findFilter, setFindFilter] = useState<FindFilter>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  /** Puzzles solved first-try in this sitting — the only reason to keep going. */
  const [streak, setStreak] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = Date.now();

  /**
   * The queue is a frozen list of ids, not a live filter.
   *
   * Deriving it straight from `drills` made the tab unusable in solve mode:
   * grading the first move writes a new confidence, the drill stops being due,
   * it drops out of the filter, and the position you were still playing is
   * replaced by a different puzzle before you can see the continuation. Any
   * board that grades as you go has to hold its own queue still.
   *
   * It is rebuilt when the filters change or when mining adds drills — never
   * as a side effect of answering one.
   */
  const [queue, setQueue] = useState<string[]>([]);
  const drillsRef = useRef(drills);
  drillsRef.current = drills;

  const rebuildQueue = useCallback(() => {
    const at = Date.now();
    let f = drillsRef.current;
    if (colorFilter !== 'all') f = f.filter(d => d.game.color === colorFilter);
    if (listFilter === 'due') f = f.filter(d => isDue(d.lastReviewed, d.confidence, at));
    // Los drills sin policy calculada todavía se dejan pasar: no saber no es lo
    // mismo que saber que son imposibles.
    if (findFilter === 'human') f = f.filter(d => !isEngineOnly(d));
    if (findFilter === 'engine') f = f.filter(isEngineOnly);
    setQueue(
      [...f]
        .sort(
          (a, b) =>
            nextReviewAt(a.lastReviewed, a.confidence) - nextReviewAt(b.lastReviewed, b.confidence)
        )
        .map(d => d.id)
    );
    setCurrentIndex(0);
    setShowAnswer(false);
  }, [colorFilter, listFilter, findFilter]);

  // `drills.length` rather than `drills`: it changes when a scan adds drills
  // and stays put when one is graded, which is exactly the distinction the
  // queue needs.
  useEffect(rebuildQueue, [rebuildQueue, drills.length]);

  useEffect(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
  }, [mode]);

  const byId = useMemo(() => new Map(drills.map(d => [d.id, d])), [drills]);
  const filtered = useMemo(
    () => queue.map(id => byId.get(id)).filter((d): d is BlunderDrill => !!d),
    [queue, byId]
  );

  const current = filtered[currentIndex];

  const stats = useMemo(() => {
    const total = drills.length;
    const due = drills.filter(d => isDue(d.lastReviewed, d.confidence, now)).length;
    const mastered = drills.filter(d => (d.confidence ?? 0) >= 5).length;
    const scored = drills.filter(d => d.confidence);
    const avgConfidence = scored.length
      ? Math.round((scored.reduce((s, d) => s + (d.confidence ?? 0), 0) / scored.length) * 10) / 10
      : 0;
    const engineOnly = drills.filter(isEngineOnly).length;
    const human = total - engineOnly;
    return { total, due, mastered, avgConfidence, human, engineOnly };
  }, [drills, now]);

  /** Cancels a queued auto-advance so a manual click can't double-skip. */
  const clearAdvance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => clearAdvance, [clearAdvance]);

  const goPrev = () => {
    clearAdvance();
    setShowAnswer(false);
    setCurrentIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
  };
  const goNext = useCallback(() => {
    clearAdvance();
    setShowAnswer(false);
    setCurrentIndex(i => (filtered.length ? (i + 1) % filtered.length : 0));
  }, [clearAdvance, filtered.length]);

  const handleReview = async (correct: boolean) => {
    if (!current) return;
    await review(current.id, correct);
    goNext();
  };

  /**
   * A solved puzzle should feel like Lichess: the verdict lands, then the next
   * position appears. Waiting for a click after every puzzle is what turned a
   * 832-item queue into something nobody finishes.
   */
  const handleSolved = useCallback(() => {
    clearAdvance();
    advanceTimer.current = setTimeout(goNext, AUTO_ADVANCE_MS);
  }, [clearAdvance, goNext]);

  const orientation: 'white' | 'black' = current?.game.color === 'B' ? 'black' : 'white';
  const playedUci = current ? playedUciFor(current) : undefined;

  const reviewArrows = useMemo(() => {
    if (!current || !showAnswer) return [];
    const list: { startSquare: string; endSquare: string; color: string }[] = [];
    const best = uciSquares(current.bestMoveUci);
    list.push({ startSquare: best.from, endSquare: best.to, color: 'rgb(var(--win) / 0.7)' });
    if (playedUci) {
      const played = uciSquares(playedUci);
      list.push({ startSquare: played.from, endSquare: played.to, color: 'rgb(var(--loss) / 0.7)' });
    }
    return list;
  }, [current, showAnswer, playedUci]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-fg-muted">Posiciones de tus propias partidas analizadas, donde se te escapó la jugada.</p>
          {batch ? (
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 rounded-sm bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.round((batch.done / batch.total) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-fg-muted tabular-nums">
                Analizando {batch.done}/{batch.total} · {batch.name}
              </span>
              <Button variant="secondary" size="sm" onClick={cancelBatch}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {pendingAnalysisCount > 0 && (
                <Button variant="secondary" onClick={() => void mine()} disabled={mining}>
                  {mining ? 'Buscando…' : 'Revisar las ya analizadas'}
                </Button>
              )}
              <Button variant="secondary" icon={ArrowPathIcon} onClick={() => void analyzeAndMine()} disabled={mining}>
                {mining
                  ? 'Buscando…'
                  : pendingAnalysisCount > 0
                    ? `Analizar y buscar (${pendingAnalysisCount})`
                    : 'Buscar blunders nuevos'}
              </Button>
            </div>
          )}
        </div>
        {batch && (
          <p className="mt-3 text-xs text-fg-subtle">
            Primero corre Stockfish sobre las partidas sin analizar: con muchas partidas tarda un rato.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </div>

      <ClockBar>
        <StatCard title="Para hoy" value={stats.due} subtitle="vencidos" trend={stats.due > 0 ? 'down' : undefined} />
        <StatCard title="En la cola" value={stats.total} subtitle="de partidas analizadas" />
        <StatCard title="Dominados" value={stats.mastered} subtitle="confianza 5 de 5" />
        <StatCard title="Confianza media" value={stats.avgConfidence} subtitle="de 5" />
      </ClockBar>

      {/* Filters */}
      <div className="border-b border-hairline pb-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div>
            <p className="text-label mb-2">Modo</p>
            <SegmentedControl
              aria-label="Modo de ejercicio"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'solve', label: 'Resolver' },
                { value: 'calculo', label: 'Cálculo' },
                { value: 'review', label: 'Repasar' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Cola</p>
            <SegmentedControl
              aria-label="Filtro de cola"
              value={listFilter}
              onChange={setListFilter}
              options={[
                { value: 'due', label: `Para hoy (${stats.due})` },
                { value: 'all', label: 'Todos' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Encontrable</p>
            <SegmentedControl
              aria-label="Filtro por encontrable"
              value={findFilter}
              onChange={setFindFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'human', label: `Humanos (${stats.human})` },
                { value: 'engine', label: `De motor (${stats.engineOnly})` },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Color</p>
            <SegmentedControl
              aria-label="Filtro de color"
              value={colorFilter}
              onChange={setColorFilter}
              options={[
                { value: 'all', label: 'Ambos' },
                { value: 'W', label: <PieceLabel color="W" /> },
                { value: 'B', label: <PieceLabel color="B" /> },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Drill */}
      {loading ? (
        <Card className="text-center text-fg-muted">Cargando…</Card>
      ) : filtered.length > 0 && current ? (
        <Card flush className="overflow-hidden">
          <div className="px-5 py-3 bg-surface-2 border-b border-hairline sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm tabular-nums text-fg-muted">
                ejercicio {currentIndex + 1} de {filtered.length}
              </span>
              <div className="flex items-center gap-4">
                {mode !== 'review' && streak > 0 && (
                  <span className="text-sm text-fg-muted">
                    Racha <span className="font-mono font-medium tabular-nums text-accent">{streak}</span>
                  </span>
                )}
                <span className="text-sm text-fg-muted">
                  Confianza: <span className="font-mono font-medium text-accent tabular-nums">{current.confidence ?? '—'}/5</span>
                </span>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-surface rounded-sm overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Board track first, capped at the window height; the panel track
              absorbs whatever is left, so a height-limited board never leaves
              dead space beside it. See index.css. */}
          <div
            className="p-4 grid gap-6 sm:p-6 xl:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_minmax(360px,1fr)]"
            style={{ '--board-fit': 'calc(100dvh - 240px)' } as CSSProperties}
          >
            <div className="min-w-0">
              {mode === 'calculo' ? (
                <CalculationExercise
                  fen={current.fenBefore}
                  bestMoveUci={current.bestMoveUci}
                  orientation={orientation}
                  resetKey={current.id}
                  itemId={current.id}
                  onGraded={correct => {
                    setStreak(s => (correct ? s + 1 : 0));
                    void solve(current.id, correct);
                  }}
                  onNext={goNext}
                  footer={
                    <ConceptQuickAdd
                      key={current.id}
                      label="Esto es un concepto"
                      defaults={{
                        category: 'calculation',
                        exampleFens: [current.fenBefore],
                        gameIds: [current.gameId],
                        sourceType: 'drill',
                        summary: `vs ${current.game.opponent}${
                          current.game.playedDate ? ` · ${current.game.playedDate}` : ''
                        }: jugué ${current.playedSan}.`,
                      }}
                    />
                  }
                />
              ) : mode === 'solve' ? (
                <PuzzleBoard
                  fen={current.fenBefore}
                  bestMoveUci={current.bestMoveUci}
                  orientation={orientation}
                  resetKey={current.id}
                  onFirstResult={correct => {
                    setStreak(s => (correct ? s + 1 : 0));
                    void solve(current.id, correct);
                  }}
                  onSolved={handleSolved}
                  footer={
                    // A concept born where it was actually missed, carrying
                    // the position and the game it came from.
                    <ConceptQuickAdd
                      key={current.id}
                      label="Esto es un concepto"
                      defaults={{
                        category: 'calculation',
                        exampleFens: [current.fenBefore],
                        gameIds: [current.gameId],
                        sourceType: 'drill',
                        summary: `vs ${current.game.opponent}${
                          current.game.playedDate ? ` · ${current.game.playedDate}` : ''
                        }: jugué ${current.playedSan}.`,
                      }}
                    />
                  }
                />
              ) : (
                <BoardFrame>
                  <Chessboard
                    options={{
                      position: current.fenBefore,
                      boardOrientation: orientation,
                      allowDragging: false,
                      showNotation: true,
                      arrows: reviewArrows,
                      ...boardSquareStyles,
                    }}
                  />
                </BoardFrame>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral"><PieceLabel color={current.game.color} /></Badge>
                {current.game.eco && <Badge tone="neutral"><span className="font-mono">{current.game.eco}</span></Badge>}
                <Badge tone="alert">Blunder · −{(current.cpLoss / 100).toFixed(1)}</Badge>
                <ResultMark result={current.game.result} outline />
              </div>
              <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-fg text-balance">{drillTitle(current)}</h3>
              <p className="font-serif text-base text-fg-muted">
                vs {current.game.opponent}
                {current.game.playedDate && ` · ${current.game.playedDate}`}
              </p>

              {mode === 'review' && !showAnswer && (
                <div className="rounded border border-hairline bg-surface-2 p-5">
                  <p className="mb-1 font-serif text-lg font-semibold text-fg">¿Qué jugarías?</p>
                  <p className="text-sm text-fg-muted">Buscá la jugada en la cabeza y después mostrala.</p>
                </div>
              )}

              {mode === 'review' && showAnswer && (
                <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 border-t border-hairline pt-3 animate-slideUp">
                    <p className="text-label">Jugaste</p>
                    <p className="font-serif text-base text-loss">{current.playedSan}</p>
                    <p className="text-label">Evaluación</p>
                    <p className="font-mono text-sm text-fg tabular-nums">
                      {fmtEval(current.evalBefore)} → {fmtEval(current.evalAfter)}{' '}
                      <span className="text-loss">(−{(current.cpLoss / 100).toFixed(1)})</span>
                    </p>
                </div>
              )}

              {mode === 'review' && (
                <div className="flex gap-3">
                  {!showAnswer ? (
                    <Button variant="primary" onClick={() => setShowAnswer(true)} className="h-11 flex-1">
                      Mostrar la mejor jugada
                    </Button>
                  ) : (
                    <>
                      <Button variant="danger" onClick={() => void handleReview(false)} className="h-11 flex-1">
                        No la veía
                      </Button>
                      <Button variant="primary" onClick={() => void handleReview(true)} className="h-11 flex-1">
                        La veía
                      </Button>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goPrev}>← Anterior</Button>
                <Button variant="secondary" onClick={goNext}>Siguiente →</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          {drills.length === 0 ? (
            <>
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Todavía no hay ejercicios</h3>
              <p className="text-fg-muted">
                Tocá <span className="font-semibold text-fg">"Analizar y buscar"</span> arriba: Stockfish recorre tus
                partidas y saca los blunders, sin tener que analizarlas una por una.
              </p>
            </>
          ) : (
            <>
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Repaso al día</h3>
              <p className="text-fg-muted">No hay ejercicios vencidos. Pasá a "Todos" para seguir practicando.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default BlunderDrillsTab;
