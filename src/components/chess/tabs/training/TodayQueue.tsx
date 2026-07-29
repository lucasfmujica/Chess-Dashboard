import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../../boardTheme';
import BoardFrame from '../../BoardFrame';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useDailyQueue, type QueueItem } from '../../../../hooks/useDailyQueue';
import { useHomework } from '../../../../hooks/useHomework';
import { postTrainingSession, putTrainingSession, postTrainingAttempts } from '../../../../api/client';
import { programForWeekday, plannedMinutes } from '../../../../constants/trainingProgram';
import { weekdayIndex } from '../../../../utils/localDate';
import { formatMaterialDelta } from '../../../../engine/mineEndgames';
import { Card, Button, Badge } from '../../../ui';
import PuzzleBoard from '../../PuzzleBoard';
import ThinkTimer from '../../ThinkTimer';
import EndgameContinuationReplay from '../../EndgameContinuationReplay';
import { isHomeworkOverdue } from '../../../../types/training';
import type { TrainingAttempt, TrainingBlock } from '../../../../types/training';

/**
 * The daily queue: one screen that says what to do today and nothing else.
 *
 * The deliberate constraint is that candidates must be written down before
 * the answer can be revealed. That is the whole exercise — an unwritten
 * candidate list can be revised after the fact, which is what makes
 * self-reported "I saw that" untrustworthy and the candidate_miss statistic
 * meaningless. The textarea is the instrument, not decoration.
 */

/** Locally-accumulated attempts, flushed as one bulk insert when the session ends. */
type PendingAttempt = Omit<Partial<TrainingAttempt>, 'id' | 'createdAt'>;

const KIND_LABEL: Record<QueueItem['kind'], string> = {
  blunder: 'Cálculo',
  endgame: 'Final',
  repertoire: 'Repertorio',
};

/** Which block a queue item's time is logged against. */
const KIND_BLOCK: Record<QueueItem['kind'], TrainingBlock> = {
  blunder: 'calculation',
  endgame: 'endgame',
  repertoire: 'repertoire',
};

const TodayQueue = () => {
  const { items, loading, error, dayKey, dueTotals, resolve } = useDailyQueue();
  const homework = useHomework();
  const program = useMemo(() => programForWeekday(weekdayIndex(dayKey)), [dayKey]);

  const [index, setIndex] = useState(0);
  const [candidates, setCandidates] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [pendingMiss, setPendingMiss] = useState(false);
  const [done, setDone] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const attemptsRef = useRef<PendingAttempt[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const itemStartedAtRef = useRef<number>(Date.now());
  /**
   * Seconds spent calculating, frozen at the reveal.
   *
   * This used to be lost: `itemStartedAtRef` was restarted when the board
   * became playable, so the recorded time measured how long the move took to
   * enter and threw away the 5-10 minutes of calculation — the one number the
   * method is about. `itemStartedAtRef` now runs for the whole exercise and
   * this captures the thinking half of it.
   */
  const thinkSecondsRef = useRef<number | null>(null);
  /** Drives the live clock; `null` once the answer is out. */
  const [itemStartedAt, setItemStartedAt] = useState(() => Date.now());

  const current = items[index];

  /**
   * Create the session row lazily: on the first resolved item, or — on a day
   * with no queue at all — when the day is marked done by hand.
   *
   * `throwOnError` separates the two callers. Mid-drill a logging failure must
   * not interrupt training, so it stays silent. From the "mark the day as
   * done" button there is nothing else to show for the click, and swallowing
   * the error there is how a day that *was* trained kept reading as "sin
   * hacer" in the week view.
   */
  const ensureSession = useCallback(async (throwOnError = false): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    startedAtRef.current = Date.now();
    try {
      const session = await postTrainingSession({
        // Always send the local day: the server default is CURRENT_DATE, which
        // is UTC and rolls over mid-evening in this timezone.
        sessionDate: dayKey,
        // With a queue the block is whatever is being drilled. Without one
        // (Martes, Jueves, Viernes) the program's own first block is what the
        // day actually was — defaulting to 'blunder' logged a lie.
        block: items[0] ? KIND_BLOCK[items[0].kind] : program.blocks[0].block,
        source: 'daily-queue',
      });
      sessionIdRef.current = session.id;
      return session.id;
    } catch (err) {
      if (throwOnError) throw err;
      // The attempt is still recorded against a null session and the SRS
      // write already happened.
      return null;
    }
  }, [dayKey, items, program]);

  const advance = useCallback(() => {
    setIndex(i => i + 1);
    setCandidates('');
    setRevealed(false);
    setOutcome(null);
    setPendingMiss(false);
    const now = Date.now();
    itemStartedAtRef.current = now;
    thinkSecondsRef.current = null;
    setItemStartedAt(now);
  }, []);

  /** The answer is about to be shown: stop the calculation clock. */
  const reveal = useCallback(() => {
    thinkSecondsRef.current = Math.round((Date.now() - itemStartedAtRef.current) / 1000);
    setRevealed(true);
  }, []);

  /** Record the outcome, then either ask the candidate question or move on. */
  const record = useCallback(
    async (correct: boolean, candidateMiss?: boolean) => {
      if (!current) return;
      const sessionId = await ensureSession();
      attemptsRef.current.push({
        sessionId: sessionId ?? undefined,
        itemKind: current.kind,
        itemId: current.id,
        correct,
        candidateMiss,
        candidatesWritten: candidates.trim() || undefined,
        seconds: Math.round((Date.now() - itemStartedAtRef.current) / 1000),
        thinkSeconds: thinkSecondsRef.current ?? undefined,
      });
      setDone(d => d + 1);
      if (correct) setCorrectCount(c => c + 1);
      try {
        await resolve(current, correct);
      } catch {
        // SRS write failed; the attempt row still captures what happened.
      }
      advance();
    },
    [current, candidates, ensureSession, resolve, advance]
  );

  /**
   * A wrong answer on a calculation exercise asks the one question that
   * separates a breadth failure from a depth failure. It is only asked for
   * blunder drills: endgame and repertoire misses are knowledge gaps, and
   * folding them in would blur the very distribution this exists to measure.
   */
  const handleOutcome = useCallback(
    (correct: boolean) => {
      setOutcome(correct);
      if (!correct && current?.kind === 'blunder') {
        setPendingMiss(true);
        return;
      }
      void record(correct);
    },
    [current, record]
  );

  const finish = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    // Whether anything was actually drilled decides where the minutes come
    // from: a measured elapsed time, or the plan's own figure for the day.
    const drilled = sessionIdRef.current !== null;
    try {
      const attempts = attemptsRef.current;
      if (attempts.length > 0) {
        await postTrainingAttempts(attempts);
      }
      // Not `if (sessionIdRef.current)`. On a day with no queue nothing has
      // created the row yet, and that guard is exactly what made "Marcar el
      // día como hecho" a no-op that still announced "Sesión guardada".
      const sessionId = await ensureSession(true);
      const minutes =
        drilled && startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000))
          : plannedMinutes(program);
      if (sessionId) {
        await putTrainingSession(sessionId, {
          minutes,
          attempted: attempts.length,
          solved: attempts.filter(a => a.correct).length,
        });
      }
      attemptsRef.current = [];
      setFinished(true);
    } catch (err) {
      console.error('Failed to save training session', err);
      setSaveError('No se pudo guardar la sesión. Revisá la conexión y probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [ensureSession, program]);

  const total = items.length;
  const allResolved = index >= total;

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-fg-muted">Cargando la cola de hoy…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-loss">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-label">Hoy · {program.dayName}</div>
            <h2 className="text-h2 text-fg mt-1">{program.focus}</h2>
            <p className="text-sm text-fg-muted mt-1">
              {plannedMinutes(program)} min planificados ·{' '}
              <span className="nums">{dueTotals.total}</span> ejercicios vencidos en total
            </p>
          </div>
          {total > 0 && !finished && (
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
                />
              </div>
              <span className="text-xs text-fg-muted nums">
                {done}/{total}
              </span>
            </div>
          )}
        </div>

        {homework.open.length > 0 && (
          <div className="mt-5 border-t border-hairline pt-4">
            <div className="text-label flex items-center gap-1.5">
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Tarea de las clases
              {homework.overdue.length > 0 && (
                <span className="text-loss nums">· {homework.overdue.length} vencida</span>
              )}
            </div>
            <ul className="mt-2 space-y-1.5">
              {homework.open.slice(0, 3).map(hw => {
                const late = isHomeworkOverdue(hw, homework.todayKey);
                return (
                  <li key={hw.id} className="flex gap-2 text-sm">
                    <span
                      className={`shrink-0 nums w-20 ${late ? 'text-loss' : 'text-fg-subtle'}`}
                    >
                      {hw.dueDate ?? 'sin fecha'}
                    </span>
                    <span className={late ? 'text-fg' : 'text-fg-muted'}>{hw.task}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5 space-y-2 border-t border-hairline pt-4">
          {program.blocks.map((block, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-fg-muted nums shrink-0 w-14">{block.minutes} min</span>
              <div>
                <span className="text-fg font-medium">{block.label}</span>
                <p className="text-fg-muted">{block.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {finished ? (
        <Card>
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-h3 text-fg">Sesión guardada</h3>
              <p className="text-sm text-fg-muted">
                {done} ejercicios, {correctCount} resueltos. Queda registrado en el Registro.
              </p>
            </div>
          </div>
        </Card>
      ) : total === 0 ? (
        <Card>
          <h3 className="text-h3 text-fg">Hoy no toca cola de ejercicios</h3>
          <p className="text-sm text-fg-muted mt-1">
            Este día del programa es de {program.focus.toLowerCase()}. Seguí los bloques de arriba
            y registralo cuando termines.
          </p>
          <div className="mt-4">
            <Button onClick={() => void finish()} disabled={saving}>
              {saving ? 'Guardando…' : 'Marcar el día como hecho'}
            </Button>
            {saveError && <p className="mt-2 text-sm text-loss">{saveError}</p>}
          </div>
        </Card>
      ) : allResolved ? (
        <Card>
          <h3 className="text-h3 text-fg">Cola terminada</h3>
          <p className="text-sm text-fg-muted mt-1">
            {done} ejercicios, {correctCount} resueltos.
          </p>
          <div className="mt-4">
            <Button onClick={() => void finish()} disabled={saving}>
              {saving ? 'Guardando…' : 'Terminar sesión'}
            </Button>
            {saveError && <p className="mt-2 text-sm text-loss">{saveError}</p>}
          </div>
        </Card>
      ) : (
        current && (
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{KIND_LABEL[current.kind]}</Badge>
                <span className="text-xs text-fg-muted nums">
                  {index + 1} de {total}
                </span>
              </div>
              <QueueItemContext item={current} />
            </div>

            {/* The board is the fluid track now and the answer panel the fixed
                one: this is the view you stare at for half an hour. */}
            <div
              className="grid gap-6 xl:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_minmax(320px,1fr)]"
              style={{ '--board-fit': 'calc(100dvh - 280px)' } as CSSProperties}
            >
              <div className="min-w-0">
                <QueueItemBoard item={current} revealed={revealed} onResult={handleOutcome} />
              </div>

              <div className="space-y-4">
                {!revealed ? (
                  <div>
                    <ThinkTimer startedAt={itemStartedAt} />
                    <label className="text-label mt-4 flex items-center gap-1.5" htmlFor="candidates">
                      <PencilSquareIcon className="w-4 h-4" />
                      {current.kind === 'blunder'
                        ? 'Tus candidatos, antes de mover'
                        : current.kind === 'endgame'
                          ? 'Tu plan en esta posición'
                          : 'Las jugadas que recordás de esta línea'}
                    </label>
                    <textarea
                      id="candidates"
                      value={candidates}
                      onChange={e => setCandidates(e.target.value)}
                      rows={5}
                      placeholder={
                        current.kind === 'blunder'
                          ? 'Ej: Nf3, Bb5+, d5 — y una evaluación en una palabra al final de cada línea'
                          : 'Ej: activar la torre por la séptima, rey a e4'
                      }
                      className="mt-2 w-full rounded-lg border border-hairline bg-surface-2 p-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-xs text-fg-subtle mt-2">
                      Escribilos primero. Una lista mental se puede corregir después de ver la
                      respuesta — una escrita, no.
                    </p>
                    <Button className="mt-3" disabled={!candidates.trim()} onClick={reveal}>
                      {current.kind === 'blunder' ? 'Listo, ahora juego' : 'Ver la respuesta'}
                    </Button>
                  </div>
                ) : pendingMiss ? (
                  <div className="rounded-lg border border-hairline bg-surface-2 p-4">
                    <h4 className="text-fg font-medium">
                      ¿La jugada correcta estaba en tu lista?
                    </h4>
                    <p className="text-xs text-fg-muted mt-1">
                      Es la única pregunta que separa un fallo de barrido de uno de cálculo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => void record(false, false)}>
                        Sí, la descarté
                      </Button>
                      <Button variant="secondary" onClick={() => void record(false, true)}>
                        No, ni se me ocurrió
                      </Button>
                    </div>
                  </div>
                ) : outcome === null ? (
                  <div>
                    <ThinkTimer
                      startedAt={itemStartedAt}
                      frozen
                      frozenSeconds={thinkSecondsRef.current ?? 0}
                    />
                    <p className="mt-3 text-sm text-fg-muted">
                      Tus candidatos: <span className="text-fg">{candidates}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        icon={XCircleIcon}
                        onClick={() => handleOutcome(false)}
                      >
                        No la tenía
                      </Button>
                      <Button
                        icon={CheckCircleIcon}
                        onClick={() => handleOutcome(true)}
                      >
                        La tenía
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      icon={ArrowRightIcon}
                      onClick={() => void record(outcome)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      )}
    </div>
  );
};

/** Small right-aligned line of provenance: where this exercise came from. */
const QueueItemContext = ({ item }: { item: QueueItem }) => {
  if (item.kind === 'repertoire') {
    return (
      <span className="text-xs text-fg-muted truncate">
        {item.line.lineName ?? item.line.eco ?? 'Línea'} ·{' '}
        {item.line.color === 'W' ? 'Blancas' : 'Negras'}
      </span>
    );
  }
  const game = item.drill.game;
  return (
    <span className="text-xs text-fg-muted truncate">
      vs {game.opponent}
      {game.playedDate ? ` · ${game.playedDate}` : ''}
      {item.kind === 'endgame' ? ` · ${formatMaterialDelta(item.drill.materialDelta)}` : ''}
    </span>
  );
};

interface QueueItemBoardProps {
  item: QueueItem;
  revealed: boolean;
  onResult: (correct: boolean) => void;
}

const QueueItemBoard = ({ item, revealed, onResult }: QueueItemBoardProps) => {
  if (item.kind === 'blunder') {
    const orientation: 'white' | 'black' = item.drill.game.color === 'B' ? 'black' : 'white';
    // Static until candidates are written, then interactive — playing the
    // move before writing anything down would defeat the exercise.
    if (!revealed) {
      return <StaticBoard fen={item.drill.fenBefore} orientation={orientation} />;
    }
    return (
      <PuzzleBoard
        fen={item.drill.fenBefore}
        bestMoveUci={item.drill.bestMoveUci}
        orientation={orientation}
        onFirstResult={onResult}
        resetKey={item.id}
        // One move, not a played-out line: the daily queue is time-boxed and
        // the exercise here is the candidate list, not the continuation.
        maxSolverMoves={1}
      />
    );
  }

  if (item.kind === 'endgame') {
    const orientation: 'white' | 'black' = item.drill.game.color === 'B' ? 'black' : 'white';
    if (!revealed) {
      return <StaticBoard fen={item.drill.fen} orientation={orientation} />;
    }
    return (
      <EndgameContinuationReplay
        gameId={item.drill.gameId}
        fromPly={item.drill.ply}
        orientation={orientation}
      />
    );
  }

  const orientation: 'white' | 'black' = item.line.color === 'B' ? 'black' : 'white';
  return (
    <div>
      {item.line.keyFen ? (
        <StaticBoard fen={item.line.keyFen} orientation={orientation} />
      ) : (
        <div className="rounded-lg border border-hairline bg-surface-2 p-4 text-sm text-fg-muted">
          Esta línea no tiene posición clave guardada.
        </div>
      )}
      {revealed && (
        <div className="mt-3 space-y-2 rounded-lg border border-hairline bg-surface-2 p-3">
          {item.line.movesSan && (
            <p className="font-mono text-sm text-fg">{item.line.movesSan}</p>
          )}
          {item.line.plan && <p className="text-sm text-fg-muted">{item.line.plan}</p>}
          {item.line.goldenRule && (
            <p className="text-sm text-accent">{item.line.goldenRule}</p>
          )}
        </div>
      )}
    </div>
  );
};

const StaticBoard = ({ fen, orientation }: { fen: string; orientation: 'white' | 'black' }) => (
  <BoardFrame>
    <Chessboard
      options={{
        position: fen,
        boardOrientation: orientation,
        allowDragging: false,
        showNotation: true,
        ...boardSquareStyles,
      }}
    />
  </BoardFrame>
);

export default TodayQueue;
