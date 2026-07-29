import { useCallback, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { postTrainingAttempts } from '../../api/client';
import { Button } from '../ui';
import PuzzleBoard from './PuzzleBoard';
import ThinkTimer, { formatDuration } from './ThinkTimer';
import type { Grade } from '../../utils/puzzleGrading';

/**
 * One position, worked the way Juan Cruz and Studer teach it: sit on it, write
 * the candidates down, and only then touch a piece.
 *
 * The gate is the exercise. A board you can move on immediately trains the
 * opposite reflex — and an unwritten candidate list can be revised after
 * seeing the answer, which is exactly what makes "sí, la había visto"
 * worthless as a statistic. Both are why the board here is a picture until
 * something has been typed.
 *
 * Every attempt is recorded with its calculation time and the candidates as
 * written, so this feeds the same diagnostic as the daily queue. The attempts
 * carry no session: drilling here is not a scheduled block, and inventing a
 * session row for it would corrupt the minutes-per-block accounting.
 */

interface CalculationExerciseProps {
  fen: string;
  bestMoveUci?: string;
  orientation: 'white' | 'black';
  /** Remounts the whole exercise for a new position. */
  resetKey: string;
  /** The drill this came from, for the attempt record. */
  itemId?: string;
  /** Fires with the graded first move, to drive the SRS. */
  onGraded: (correct: boolean, grade: Grade) => void;
  /** Fires when the exercise is fully recorded and you asked for the next one. */
  onNext: () => void;
  /** Rendered under the board once the answer is out. */
  footer?: React.ReactNode;
}

const CalculationExercise = ({
  fen,
  bestMoveUci,
  orientation,
  resetKey,
  itemId,
  onGraded,
  onNext,
  footer,
}: CalculationExerciseProps) => {
  const [candidates, setCandidates] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [thinkSeconds, setThinkSeconds] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [pendingMiss, setPendingMiss] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const startedAtRef = useRef(Date.now());

  // New position: back to a blank sheet and a running clock.
  useEffect(() => {
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setCandidates('');
    setRevealed(false);
    setThinkSeconds(null);
    setCorrect(null);
    setPendingMiss(false);
    setRecorded(false);
  }, [resetKey]);

  const reveal = useCallback(() => {
    setThinkSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
    setRevealed(true);
  }, []);

  /** Write the attempt. `candidateMiss` is only meaningful on a failure. */
  const record = useCallback(
    async (wasCorrect: boolean, candidateMiss?: boolean) => {
      setPendingMiss(false);
      setRecorded(true);
      try {
        await postTrainingAttempts([
          {
            itemKind: 'blunder',
            itemId,
            correct: wasCorrect,
            candidateMiss,
            candidatesWritten: candidates.trim() || undefined,
            seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
            thinkSeconds: thinkSeconds ?? undefined,
          },
        ]);
      } catch {
        // The SRS write already happened; losing the diagnostic row is not
        // worth interrupting the session for.
      }
    },
    [itemId, candidates, thinkSeconds]
  );

  const handleFirstResult = useCallback(
    (wasCorrect: boolean, grade: Grade) => {
      setCorrect(wasCorrect);
      onGraded(wasCorrect, grade);
      // The one question that separates a breadth failure from a depth one.
      if (!wasCorrect) setPendingMiss(true);
      else void record(true);
    },
    [onGraded, record]
  );

  if (!revealed) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden border border-hairline">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: false,
              showNotation: true,
              lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
              darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
            }}
          />
        </div>

        <ThinkTimer startedAt={startedAt} />

        <div>
          <label className="text-label flex items-center gap-1.5" htmlFor="drill-candidates">
            <PencilSquareIcon className="w-4 h-4" />
            Tus candidatos, antes de mover
          </label>
          <textarea
            id="drill-candidates"
            value={candidates}
            onChange={e => setCandidates(e.target.value)}
            rows={5}
            placeholder="Ej: Nf3, Bb5+, d5 — y una evaluación en una palabra al final de cada línea"
            className="mt-2 w-full rounded-lg border border-hairline bg-surface-2 p-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="text-xs text-fg-subtle mt-2">
            Anotalos en papel y copialos acá, o escribilos directamente. Una lista mental se
            puede corregir después de ver la respuesta — una escrita, no.
          </p>
          <Button className="mt-3" disabled={!candidates.trim()} onClick={reveal}>
            Listo, ahora juego
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PuzzleBoard
        fen={fen}
        bestMoveUci={bestMoveUci}
        orientation={orientation}
        resetKey={resetKey}
        onFirstResult={handleFirstResult}
        footer={footer}
      />

      <div className="rounded-lg border border-hairline bg-surface-2 p-3">
        <p className="text-xs text-fg-subtle">
          Pensaste <span className="nums font-semibold text-fg">{formatDuration(thinkSeconds ?? 0)}</span>
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Tus candidatos: <span className="text-fg">{candidates}</span>
        </p>
      </div>

      {pendingMiss && (
        <div className="rounded-lg border border-hairline bg-surface-2 p-4">
          <h4 className="text-fg font-medium">¿La jugada correcta estaba en tu lista?</h4>
          <p className="text-xs text-fg-muted mt-1">
            Es la única pregunta que separa un fallo de barrido de uno de cálculo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" icon={XCircleIcon} onClick={() => void record(false, false)}>
              Sí, la descarté
            </Button>
            <Button variant="secondary" icon={CheckCircleIcon} onClick={() => void record(false, true)}>
              No, ni se me ocurrió
            </Button>
          </div>
        </div>
      )}

      {recorded && correct !== null && (
        <Button icon={ArrowRightIcon} onClick={onNext}>
          Siguiente posición
        </Button>
      )}
    </div>
  );
};

export default CalculationExercise;
