import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { usePuzzleEngine } from '../../hooks/usePuzzleEngine';
import {
  gradeMove,
  moveToUci,
  formatCpLoss,
  type Grade,
  type Verdict,
} from '../../utils/puzzleGrading';
import { Button } from '../ui';
import type { PositionEval } from '../../engine/stockfishEngine';

/**
 * Interactive puzzle board: play a move, get graded, and — when you are wrong —
 * play out the engine's refutation to see what actually happens to you.
 *
 * Two deliberate departures from the old solve board:
 *
 * 1. **Grading is by centipawn loss, not string equality.** A move that is as
 *    good as the engine's is correct even when it isn't the same move. The old
 *    exact-match grader also failed every promotion, because it built the UCI
 *    without the piece suffix.
 * 2. **Your move is actually played.** The old board simulated the move on a
 *    throwaway position and left the piece where it started, so a wrong answer
 *    taught you nothing about why.
 */

interface PuzzleBoardProps {
  /** Position to solve, with the player to move. */
  fen: string;
  /** The drill's stored best move, used as a fast path to skip the engine. */
  bestMoveUci?: string;
  orientation: 'white' | 'black';
  /**
   * Fires once, on the FIRST graded attempt, so retries don't inflate the
   * training statistics. Later attempts still update the board and verdict.
   */
  onFirstResult: (correct: boolean, grade: Grade) => void;
  /** Remounts interaction state for a new puzzle. */
  resetKey: string;
  /** Rendered under the verdict — e.g. a "this is a concept" action. */
  footer?: React.ReactNode;
}

/**
 * `thinking` — solving; the next move gets graded.
 * `grading`  — engine is scoring the move.
 * `graded`   — verdict shown. If wrong, the refutation is on the board and the
 *              phase moves to `exploring` so the line can be played out.
 * `exploring`— free play against the engine, no further grading.
 */
type Phase = 'thinking' | 'grading' | 'graded' | 'exploring';

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;

const GLYPHS: Record<string, { w: string; b: string }> = {
  q: { w: '♕', b: '♛' },
  r: { w: '♖', b: '♜' },
  b: { w: '♗', b: '♝' },
  n: { w: '♘', b: '♞' },
};

const VERDICT_STYLE: Record<Verdict, { cls: string; label: string; Icon: typeof CheckCircleIcon }> =
  {
    correcta: {
      cls: 'border-win/30 bg-win/10 text-win',
      label: 'Correcta',
      Icon: CheckCircleIcon,
    },
    imprecisa: {
      cls: 'border-draw/30 bg-draw/10 text-draw',
      label: 'Imprecisa',
      Icon: ExclamationTriangleIcon,
    },
    mala: { cls: 'border-loss/30 bg-loss/10 text-loss', label: 'Mala', Icon: XCircleIcon },
  };

const uciSquares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

const PuzzleBoard = ({
  fen,
  bestMoveUci,
  orientation,
  onFirstResult,
  resetKey,
  footer,
}: PuzzleBoardProps) => {
  const { evaluate } = usePuzzleEngine();

  /** Position currently on the board — advances as the line is played out. */
  const [position, setPosition] = useState(fen);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [playedUci, setPlayedUci] = useState<string | null>(null);
  const [refutationUci, setRefutationUci] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPosition(fen);
    setPhase('thinking');
    setGrade(null);
    setPlayedUci(null);
    setRefutationUci(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setError(null);
  }, [fen]);

  // New puzzle: clear everything including the attempt counter.
  useEffect(() => {
    reset();
    setAttempts(0);
  }, [resetKey, reset]);

  const sideToMove: 'w' | 'b' = position.split(' ')[1] === 'b' ? 'b' : 'w';
  /** The side the solver is playing, fixed for the whole puzzle. */
  const solverSide: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const isSolverTurn = sideToMove === solverSide;
  /** Pieces are draggable while solving, and again while playing out a refutation. */
  const canMove = isSolverTurn && (phase === 'thinking' || phase === 'exploring');

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      return new Chess(position)
        .moves({ square: selectedSquare as Square, verbose: true })
        .map(m => m.to as string);
    } catch {
      return [];
    }
  }, [selectedSquare, position]);

  /** Does this from→to land a pawn on the back rank? */
  const isPromotion = useCallback(
    (from: string, to: string): boolean => {
      try {
        return new Chess(position)
          .moves({ square: from as Square, verbose: true })
          .some(m => m.to === to && !!m.promotion);
      } catch {
        return false;
      }
    },
    [position]
  );

  /**
   * Play the move, grade it, and on a wrong answer let the engine hit back so
   * the refutation is on the board rather than described in prose.
   */
  const commit = useCallback(
    async (from: string, to: string, promotion?: string) => {
      if (phase !== 'thinking') return false;

      const chess = new Chess(fen);
      let move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return false;
      }
      if (!move) return false;

      const uci = moveToUci(move);
      const afterFen = chess.fen();
      setPlayedUci(uci);
      setPosition(afterFen);
      setSelectedSquare(null);
      setPhase('grading');
      setError(null);

      const attemptNumber = attempts + 1;
      setAttempts(attemptNumber);

      // Fast path: the stored best move needs no search.
      if (bestMoveUci && uci === bestMoveUci) {
        const perfect: Grade = { cpLoss: 0, verdict: 'correcta' };
        setGrade(perfect);
        setPhase('graded');
        if (attemptNumber === 1) onFirstResult(true, perfect);
        return true;
      }

      try {
        const [beforeEval, afterEval] = await Promise.all([
          evaluate(fen),
          evaluate(afterFen),
        ]);
        const result = gradeMove(beforeEval, afterEval);
        setGrade(result);
        setPhase('graded');

        // Wrong: play the engine's reply so the punishment lands on the board,
        // then hand the move back so the line can be played out.
        if (result.verdict !== 'correcta') {
          const reply = (afterEval as PositionEval).bestMove;
          if (reply && reply !== '(none)') {
            const withReply = new Chess(afterFen);
            try {
              const replyMove = withReply.move({
                from: reply.slice(0, 2),
                to: reply.slice(2, 4),
                promotion: reply.length > 4 ? reply[4] : undefined,
              });
              if (replyMove) {
                setRefutationUci(reply);
                setPosition(withReply.fen());
                setPhase('exploring');
              }
            } catch {
              // No refutation to show; the verdict still stands.
            }
          }
        }

        if (attemptNumber === 1) onFirstResult(result.verdict === 'correcta', result);
      } catch {
        setError('El motor no respondió. Probá de nuevo.');
        setPhase('thinking');
        setPosition(fen);
        setPlayedUci(null);
      }
      return true;
    },
    [phase, fen, bestMoveUci, attempts, evaluate, onFirstResult]
  );

  /**
   * Play out the refutation. No grading here — the verdict is already in, and
   * the point is to see concretely what the punishment looks like.
   */
  const explore = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const chess = new Chess(position);
      try {
        if (!chess.move({ from, to, promotion })) return;
      } catch {
        return;
      }
      setPosition(chess.fen());
      setSelectedSquare(null);
      if (chess.isGameOver()) return;

      const reply = await evaluate(chess.fen());
      if (!reply.bestMove || reply.bestMove === '(none)') return;
      const withReply = new Chess(chess.fen());
      try {
        withReply.move({
          from: reply.bestMove.slice(0, 2),
          to: reply.bestMove.slice(2, 4),
          promotion: reply.bestMove.length > 4 ? reply.bestMove[4] : undefined,
        });
        setRefutationUci(reply.bestMove);
        setPosition(withReply.fen());
      } catch {
        // Engine gave an unplayable move; leave the position as-is.
      }
    },
    [position, evaluate]
  );

  const attempt = useCallback(
    (from: string, to: string): boolean => {
      if (!canMove) return false;
      if (isPromotion(from, to)) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        return false;
      }
      if (phase === 'exploring') void explore(from, to);
      else void commit(from, to);
      return true;
    },
    [canMove, phase, isPromotion, commit, explore]
  );

  const handleSquareClick = ({
    square,
    piece,
  }: {
    square: string;
    piece: { pieceType: string } | null;
  }) => {
    if (!canMove) return;
    const isMovable = !!piece && piece.pieceType[0] === sideToMove;
    if (!selectedSquare) {
      if (isMovable) setSelectedSquare(square);
      return;
    }
    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }
    if (legalTargets.includes(square)) {
      attempt(selectedSquare, square);
      return;
    }
    setSelectedSquare(isMovable ? square : null);
  };

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      boxShadow: 'inset 0 0 0 3px rgb(var(--board-highlight) / 0.75)',
    };
    legalTargets.forEach(sq => {
      squareStyles[sq] = {
        background: 'radial-gradient(circle, rgb(var(--board-highlight) / 0.5) 22%, transparent 25%)',
      };
    });
  }

  const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
  if (phase === 'graded' || phase === 'exploring') {
    if (playedUci) {
      const played = uciSquares(playedUci);
      arrows.push({
        startSquare: played.from,
        endSquare: played.to,
        color:
          grade?.verdict === 'correcta' ? 'rgb(var(--win) / 0.7)' : 'rgb(var(--loss) / 0.7)',
      });
    }
    if (refutationUci) {
      const refutation = uciSquares(refutationUci);
      arrows.push({
        startSquare: refutation.from,
        endSquare: refutation.to,
        color: 'rgb(var(--draw) / 0.8)',
      });
    }
  }

  const style = grade ? VERDICT_STYLE[grade.verdict] : null;

  return (
    <div>
      <div className="rounded-lg overflow-hidden border border-hairline">
        <Chessboard
          options={{
            position,
            boardOrientation: orientation,
            allowDragging: canMove,
            showNotation: true,
            animationDurationInMs: 150,
            arrows,
            squareStyles,
            lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
            darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
            onSquareClick: handleSquareClick,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              return attempt(sourceSquare, targetSquare);
            },
          }}
        />
      </div>

      {pendingPromotion && (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 p-3">
          <p className="text-label mb-2">¿Con qué pieza coronás?</p>
          <div className="flex gap-2">
            {PROMOTION_PIECES.map(code => (
              <button
                key={code}
                onClick={() => {
                  const { from, to } = pendingPromotion;
                  setPendingPromotion(null);
                  if (phase === 'exploring') void explore(from, to, code);
                  else void commit(from, to, code);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-hairline bg-surface text-3xl leading-none text-fg hover:border-accent"
                aria-label={code}
              >
                {GLYPHS[code][sideToMove]}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'grading' && (
        <p className="mt-3 text-sm text-fg-muted">Evaluando tu jugada…</p>
      )}

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}

      {(phase === 'graded' || phase === 'exploring') && grade && style && (
        <div className={`mt-3 rounded-lg border p-3 ${style.cls}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <style.Icon className="w-5 h-5 shrink-0" />
            {style.label}
            {grade.cpLoss > 0 && (
              <span className="nums font-normal">· {formatCpLoss(grade.cpLoss)}</span>
            )}
          </div>
          {grade.verdict !== 'correcta' && refutationUci && (
            <p className="text-xs mt-1 opacity-90">
              La respuesta del rival está en el tablero. Seguí jugando la línea para ver
              cómo sigue.
            </p>
          )}
          {attempts > 1 && (
            <p className="text-xs mt-1 opacity-75 nums">
              Intento {attempts} · sólo cuenta el primero para la estadística
            </p>
          )}
        </div>
      )}

      {(phase === 'graded' || phase === 'exploring') && grade && grade.verdict !== 'correcta' && (
        <Button variant="secondary" size="sm" icon={ArrowUturnLeftIcon} className="mt-3" onClick={reset}>
          Probar otra jugada
        </Button>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
};

export default PuzzleBoard;
