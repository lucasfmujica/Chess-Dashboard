import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../boardTheme';
import BoardFrame from '../BoardFrame';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEndgameDrills } from '../../../hooks/useEndgameDrills';
import { formatMaterialDelta } from '../../../engine/mineEndgames';
import { isDue, nextReviewAt } from '../../../utils/srs';
import { Card } from '../../ui/Card';
import Badge from '../../ui/Badge';
import ResultMark from '../../ui/ResultMark';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard, { ClockBar } from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';
import { ecoNames } from '../../../constants/ecoNames';
import EndgameContinuationReplay from '../EndgameContinuationReplay';
import PlayoutBoard from '../PlayoutBoard';
import type { EndgameDrill, EndgameType } from '../../../types/endgames';

type ColorFilter = 'all' | 'W' | 'B';
type ListFilter = 'due' | 'all';
type TypeFilter = 'all' | EndgameType;
type EndgameMode = 'repaso' | 'jugar';

const MODE_SEGMENTS: { value: EndgameMode; label: string }[] = [
  { value: 'jugar', label: 'Jugar vs motor' },
  { value: 'repaso', label: 'Repaso' },
];

const TYPE_LABEL: Record<EndgameType, string> = {
  pawn: 'Final de peones',
  rook: 'Final de torres',
  minor: 'Final de piezas menores',
  queen: 'Final de damas',
  mixed: 'Final mixto',
};

const drillTitle = (drill: EndgameDrill) =>
  drill.game.openingName || (drill.game.eco ? ecoNames[drill.game.eco] || drill.game.eco : TYPE_LABEL[drill.endgameType]);

const EndgameDrillsTab = () => {
  const { drills, loading, mining, error, mine, review } = useEndgameDrills();
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [listFilter, setListFilter] = useState<ListFilter>('due');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContinuation, setShowContinuation] = useState(false);
  /**
   * Drills played to a finish in this session.
   *
   * Finishing used to jump straight to the next drill, which meant the one
   * moment you want to study — the position you just gave up in, and how the
   * game actually continued — was the one you were never shown. Keeping the ids
   * lets you finish, review the answer, and walk back to an earlier drill with
   * its answer still reachable.
   */
  const [finishedIds, setFinishedIds] = useState<Set<string>>(new Set());
  /**
   * `jugar` plays the ending out against Stockfish — what an endgame drill
   * really needs, and what Toto's 4v3 homework asks for. It leads because a
   * drill you can only watch isn't a drill; `repaso` replays how the game
   * actually went, for when you want the answer rather than the practice.
   */
  const [mode, setMode] = useState<EndgameMode>('jugar');

  const now = Date.now();

  /**
   * A frozen queue of ids, for the same reason the blunder drills need one:
   * finishing a playout writes a new confidence, which drops the drill out of
   * the "due" filter and would otherwise reshuffle the list under the board
   * you just finished playing on.
   */
  const [queue, setQueue] = useState<string[]>([]);
  const drillsRef = useRef(drills);
  drillsRef.current = drills;

  const rebuildQueue = useCallback(() => {
    const at = Date.now();
    let f = drillsRef.current;
    if (colorFilter !== 'all') f = f.filter(d => d.game.color === colorFilter);
    if (typeFilter !== 'all') f = f.filter(d => d.endgameType === typeFilter);
    if (listFilter === 'due') f = f.filter(d => isDue(d.lastReviewed, d.confidence, at));
    setQueue(
      [...f]
        .sort(
          (a, b) =>
            nextReviewAt(a.lastReviewed, a.confidence) - nextReviewAt(b.lastReviewed, b.confidence)
        )
        .map(d => d.id)
    );
    setCurrentIndex(0);
    setShowContinuation(false);
  }, [colorFilter, typeFilter, listFilter]);

  useEffect(rebuildQueue, [rebuildQueue, drills.length]);

  const byId = useMemo(() => new Map(drills.map(d => [d.id, d])), [drills]);
  const filtered = useMemo(
    () => queue.map(id => byId.get(id)).filter((d): d is EndgameDrill => !!d),
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
    return { total, due, mastered, avgConfidence };
  }, [drills, now]);

  const goPrev = () => {
    setShowContinuation(false);
    setCurrentIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
  };
  const goNext = () => {
    setShowContinuation(false);
    setCurrentIndex(i => (filtered.length ? (i + 1) % filtered.length : 0));
  };

  /**
   * Called when the playout ends, by resignation or by reaching a real result.
   *
   * Deliberately does not advance: the drill stays on screen so the answer can
   * be looked at. Only the first finish per drill is sent to the SRS — playing
   * it again with "Jugarlo de nuevo" would otherwise apply a second confidence
   * adjustment for one sitting and distort the schedule.
   */
  const handleFinish = async (correct: boolean) => {
    if (!current) return;
    const alreadyReviewed = finishedIds.has(current.id);
    setFinishedIds(prev => new Set(prev).add(current.id));
    if (!alreadyReviewed) await review(current.id, correct);
  };

  /** Grade from the `repaso` buttons, which do move on. */
  const handleReview = async (correct: boolean) => {
    if (!current) return;
    await review(current.id, correct);
    goNext();
  };

  const orientation: 'white' | 'black' = current?.game.color === 'B' ? 'black' : 'white';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-fg-muted">Los finales a los que llegaron tus propias partidas.</p>
          <Button variant="secondary" icon={ArrowPathIcon} onClick={() => void mine()} disabled={mining}>
            {mining ? 'Buscando…' : 'Buscar finales'}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </div>

      <ClockBar>
        <StatCard title="Para hoy" value={stats.due} subtitle="vencidos" trend={stats.due > 0 ? 'down' : undefined} />
        <StatCard title="En la cola" value={stats.total} subtitle="de tus partidas" />
        <StatCard title="Dominados" value={stats.mastered} subtitle="confianza 5 de 5" />
        <StatCard title="Confianza media" value={stats.avgConfidence} subtitle="de 5" />
      </ClockBar>

      {/* Filters */}
      <div className="border-b border-hairline pb-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div>
            <p className="text-label mb-2">Modo</p>
            <SegmentedControl
              aria-label="Modo de final"
              value={mode}
              onChange={setMode}
              options={MODE_SEGMENTS}
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
          <div>
            <p className="text-label mb-2">Tipo</p>
            <SegmentedControl
              aria-label="Filtro por tipo de final"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pawn', label: 'Peones' },
                { value: 'rook', label: 'Torres' },
                { value: 'minor', label: 'Menores' },
                { value: 'queen', label: 'Damas' },
                { value: 'mixed', label: 'Mixtos' },
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
              <span className="text-sm text-fg-muted">
                Confianza: <span className="font-mono font-medium text-accent tabular-nums">{current.confidence ?? '—'}/5</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-surface rounded-sm overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Same split as the calculation drills. */}
          <div
            className="p-4 grid gap-6 sm:p-6 xl:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_minmax(360px,1fr)]"
            style={{ '--board-fit': 'calc(100dvh - 240px)' } as CSSProperties}
          >
            <div className="min-w-0">
              {mode === 'jugar' ? (
                <>
                  {/* Hidden rather than unmounted: unmounting resets the playout,
                      so toggling back to it would wipe the game just played. */}
                  <div className={showContinuation ? 'hidden' : ''}>
                    <PlayoutBoard
                      fen={current.fen}
                      orientation={orientation}
                      resetKey={current.id}
                      onFinish={clean => void handleFinish(clean)}
                    />
                  </div>
                  {showContinuation && (
                    <EndgameContinuationReplay
                      gameId={current.gameId}
                      fromPly={current.ply}
                      orientation={orientation}
                    />
                  )}
                </>
              ) : showContinuation ? (
                <EndgameContinuationReplay gameId={current.gameId} fromPly={current.ply} orientation={orientation} />
              ) : (
                <BoardFrame>
                  <Chessboard
                    options={{
                      position: current.fen,
                      boardOrientation: orientation,
                      allowDragging: false,
                      showNotation: true,
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
                <Badge tone="accent">{TYPE_LABEL[current.endgameType]}</Badge>
                <ResultMark result={current.game.result} outline />
              </div>
              <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-fg text-balance">{drillTitle(current)}</h3>
              <p className="font-serif text-base text-fg-muted">
                vs {current.game.opponent}
                {current.game.playedDate && ` · ${current.game.playedDate}`}
              </p>

              <div className="rounded border border-hairline bg-surface-2 p-5">
                <p className="mb-1 font-serif text-lg font-semibold text-fg">
                  {formatMaterialDelta(current.materialDelta)}: ¿cómo seguís?
                </p>
                <p className="text-sm text-fg-muted">
                  {mode === 'jugar'
                    ? current && finishedIds.has(current.id)
                      ? 'Terminado. Mirá cómo siguió la partida real, volvé atrás con ← Anterior, o pasá al siguiente cuando quieras.'
                      : 'Jugalo contra el motor hasta el final. Cada jugada tuya se evalúa.'
                    : 'Armá un plan y después mirá cómo siguió la partida real.'}
                </p>
              </div>

              {/* Playing mode, once the ending is over: look at the answer, then
                  move on when you decide to — not the instant you resign. */}
              {mode === 'jugar' && finishedIds.has(current.id) && (
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" onClick={() => setShowContinuation(v => !v)} className="h-11 flex-1">
                    {showContinuation ? '← Volver a mi partida' : 'Ver cómo siguió la partida real'}
                  </Button>
                  <Button variant="secondary" onClick={goNext} className="h-11">
                    Siguiente ejercicio →
                  </Button>
                </div>
              )}

              <div className={`flex gap-3 ${mode === 'jugar' ? 'hidden' : ''}`}>
                {!showContinuation ? (
                  <Button variant="primary" onClick={() => setShowContinuation(true)} className="h-11 flex-1">
                    Ver cómo siguió
                  </Button>
                ) : (
                  <>
                    <Button variant="danger" onClick={() => void handleReview(false)} className="h-11 flex-1">
                      No lo tenía
                    </Button>
                    <Button variant="primary" onClick={() => void handleReview(true)} className="h-11 flex-1">
                      Lo tenía
                    </Button>
                  </>
                )}
              </div>

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
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Todavía no hay finales</h3>
              <p className="text-fg-muted">
                Tocá <span className="font-semibold text-fg">"Buscar finales"</span> arriba: recorre las jugadas de
                cada partida y toma la primera posición donde el material bajó a un final, sin análisis previo.
              </p>
            </>
          ) : (
            <>
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Repaso al día</h3>
              <p className="text-fg-muted">No hay finales vencidos. Pasá a "Todos" para seguir practicando.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default EndgameDrillsTab;
