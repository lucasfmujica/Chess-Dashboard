import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
  LightBulbIcon,
  EyeIcon,
  TrophyIcon,
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
import EvalBar from './EvalBar';
import type { PositionEval } from '../../engine/stockfishEngine';

/**
 * A puzzle you actually play, the way Lichess and ChessTempo play: you move a
 * piece, the move is graded, the rival answers on the board, and you keep
 * finding moves until the line is done.
 *
 * Three things this needs that a single-move board could not give:
 *
 * 1. **A continuation.** Finding one move and being told "correcta" teaches
 *    the move, not the idea. After a correct move the engine plays its best
 *    reply and hands the position back, so the line gets played out.
 * 2. **A guide.** Stockfish evaluates the position you are looking at *before*
 *    you move, so the eval bar, the hint and the solution are all available
 *    while you think rather than only as a post-mortem.
 * 3. **A retry that means something.** Going wrong on move three rewinds to
 *    move three, not to the start of the puzzle.
 *
 * Grading stays centipawn-based: a move as good as the engine's is correct
 * even when it isn't the same move, and promotions grade correctly because
 * `moveToUci` carries the piece suffix.
 */

interface PuzzleBoardProps {
  /** Position to solve, with the player to move. */
  fen: string;
  /** The drill's stored best move for the FIRST move — a fast path around the engine. */
  bestMoveUci?: string;
  orientation: 'white' | 'black';
  /**
   * Fires once, on the FIRST graded attempt of the FIRST move, so retries and
   * the continuation don't inflate the training statistics.
   */
  onFirstResult: (correct: boolean, grade: Grade) => void;
  /** Fires when the whole line has been played out correctly. Drives auto-advance. */
  onSolved?: () => void;
  /** Remounts interaction state for a new puzzle. */
  resetKey: string;
  /** How many moves of yours the puzzle asks for before it counts as finished. */
  maxSolverMoves?: number;
  /** Rendered under the verdict — e.g. a "this is a concept" action. */
  footer?: React.ReactNode;
}

/**
 * `thinking`  — solving; the next move gets graded.
 * `grading`   — engine is scoring the move.
 * `wrong`     — the move was bad. The refutation is on the board; retry or play on.
 * `exploring` — free play after a wrong answer, no further grading.
 * `solved`    — the line is complete.
 */
type Phase = 'thinking' | 'grading' | 'wrong' | 'exploring' | 'solved';

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

/** One half-move of the line built while solving. */
interface LineMove {
  san: string;
  uci: string;
  by: 'you' | 'rival';
  verdict?: Verdict;
}

const applyUci = (fen: string, uci: string): { fen: string; san: string } | null => {
  const chess = new Chess(fen);
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move ? { fen: chess.fen(), san: move.san } : null;
  } catch {
    return null;
  }
};

const PuzzleBoard = ({
  fen,
  bestMoveUci,
  orientation,
  onFirstResult,
  onSolved,
  resetKey,
  maxSolverMoves = 3,
  footer,
}: PuzzleBoardProps) => {
  const { evaluate } = usePuzzleEngine();

  /** Position currently on the board — advances as the line is played out. */
  const [position, setPosition] = useState(fen);
  /** Position at the start of the current turn of yours; where "probar otra" rewinds to. */
  const [stepFen, setStepFen] = useState(fen);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [playedUci, setPlayedUci] = useState<string | null>(null);
  const [replyUci, setReplyUci] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  const [attempts, setAttempts] = useState(0);
  const [solverMoves, setSolverMoves] = useState(0);
  const [line, setLine] = useState<LineMove[]>([]);
  /**
   * The line as it stood at the start of the current turn — what "probar otra
   * jugada" restores. Popping the last move or two instead would corrupt the
   * line as soon as you played a wrong answer out for a few moves, which is
   * exactly what the board invites you to do.
   */
  const [stepLine, setStepLine] = useState<LineMove[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** Stockfish's read on `stepFen`, fetched while you think. */
  const [baseEval, setBaseEval] = useState<PositionEval | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  /** 0 = nothing, 1 = the piece to move, 2 = the whole move. */
  const [hintLevel, setHintLevel] = useState(0);
  const [showEval, setShowEval] = useState(false);

  /**
   * Guards the prefetch against a puzzle change or a rewind landing after it:
   * every `stepFen` gets a token, and a resolved evaluation is dropped unless
   * its token is still the current one.
   */
  const evalToken = useRef(0);

  /** Back to the start of the current turn — the move you just played was bad. */
  const retryStep = useCallback(() => {
    setPosition(stepFen);
    setPhase('thinking');
    setGrade(null);
    setPlayedUci(null);
    setReplyUci(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setHintLevel(0);
    setError(null);
    setLine(stepLine);
  }, [stepFen, stepLine]);

  /** Back to the very beginning of the puzzle. */
  const restart = useCallback(() => {
    setPosition(fen);
    setStepFen(fen);
    setPhase('thinking');
    setGrade(null);
    setPlayedUci(null);
    setReplyUci(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setHintLevel(0);
    setSolverMoves(0);
    setLine([]);
    setStepLine([]);
    setError(null);
  }, [fen]);

  // New puzzle: clear everything including the attempt counter.
  useEffect(() => {
    restart();
    setAttempts(0);
  }, [resetKey, restart]);

  /**
   * Evaluate the position you are about to move in, while you are still
   * thinking about it. This is what makes the hint, the solution and the eval
   * bar instant, and it means grading only has to search the position *after*
   * your move rather than both.
   */
  useEffect(() => {
    if (phase !== 'thinking') return;
    const token = ++evalToken.current;
    setBaseEval(null);
    setEvaluating(true);
    evaluate(stepFen)
      .then(result => {
        if (evalToken.current !== token) return;
        setBaseEval(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (evalToken.current === token) setEvaluating(false);
      });
  }, [stepFen, phase, evaluate]);

  const sideToMove: 'w' | 'b' = position.split(' ')[1] === 'b' ? 'b' : 'w';
  /** The side you are playing, fixed for the whole puzzle. */
  const solverSide: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const isSolverTurn = sideToMove === solverSide;
  /**
   * `wrong` is playable too. The verdict card tells you to play the line out
   * and see what the punishment actually looks like — a board that refuses
   * the next move makes that text a lie.
   */
  const canMove =
    isSolverTurn && (phase === 'thinking' || phase === 'wrong' || phase === 'exploring');

  /** The move to reveal for a hint — the drill's own on move one, the engine's after. */
  const solutionUci = solverMoves === 0 ? (bestMoveUci ?? baseEval?.bestMove) : baseEval?.bestMove;

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
   * Play the move, grade it, and either let the rival answer so the line goes
   * on, or — when the move was bad — let the engine punish it on the board.
   */
  const commit = useCallback(
    async (from: string, to: string, promotion?: string) => {
      if (phase !== 'thinking') return false;

      const chess = new Chess(stepFen);
      let move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return false;
      }
      if (!move) return false;

      const uci = moveToUci(move);
      const afterFen = chess.fen();
      const isFirstMove = solverMoves === 0;

      setPlayedUci(uci);
      setReplyUci(null);
      setPosition(afterFen);
      setSelectedSquare(null);
      setHintLevel(0);
      setPhase('grading');
      setError(null);
      // Stop the in-flight prefetch from overwriting state behind the grade.
      evalToken.current++;

      const attemptNumber = attempts + 1;
      if (isFirstMove) setAttempts(attemptNumber);

      /** Finish the half-move: record it, then either continue or close out. */
      const settle = async (result: Grade, afterEval: PositionEval) => {
        // `commit` only ever runs from `thinking`, i.e. at the start of a
        // turn, so the line right now is exactly `stepLine` — build on that
        // rather than on whatever exploring left behind.
        const afterYou: LineMove[] = [
          ...stepLine,
          { san: move.san, uci, by: 'you', verdict: result.verdict },
        ];
        setGrade(result);
        setLine(afterYou);
        if (isFirstMove && attemptNumber === 1) onFirstResult(result.verdict === 'correcta', result);

        const reply = afterEval.bestMove;
        const applied = reply && reply !== '(none)' ? applyUci(afterFen, reply) : null;
        const withReply: LineMove[] =
          applied && reply ? [...afterYou, { san: applied.san, uci: reply, by: 'rival' }] : afterYou;

        if (result.verdict !== 'correcta') {
          // Wrong: play the engine's reply so the punishment lands on the
          // board, then hand the move back so the line can be played out.
          // `stepLine` stays put, so "probar otra jugada" still rewinds here
          // however far the refutation gets played out.
          if (applied && reply) {
            setReplyUci(reply);
            setPosition(applied.fen);
            setLine(withReply);
          }
          setPhase('wrong');
          return;
        }

        const solved = solverMoves + 1;
        setSolverMoves(solved);

        const finish = () => {
          setPhase('solved');
          onSolved?.();
        };

        // Mate, stalemate, or nothing left to ask: the puzzle is done.
        if (chess.isGameOver() || solved >= maxSolverMoves) return finish();
        if (!applied || !reply) return finish();

        setReplyUci(reply);
        setPosition(applied.fen);
        setLine(withReply);

        if (new Chess(applied.fen).isGameOver()) return finish();

        // Next turn is yours: rebase the step and let the prefetch run again.
        setStepFen(applied.fen);
        setStepLine(withReply);
        setPhase('thinking');
      };

      try {
        // The fast path only holds for the drill's own stored move, which
        // describes the starting position and nothing further into the line.
        if (isFirstMove && bestMoveUci && uci === bestMoveUci) {
          const afterEval = await evaluate(afterFen);
          await settle({ cpLoss: 0, verdict: 'correcta' }, afterEval);
          return true;
        }

        const before = baseEval ?? (await evaluate(stepFen));
        const afterEval = await evaluate(afterFen);
        await settle(gradeMove(before, afterEval), afterEval);
      } catch {
        setError('El motor no respondió. Probá de nuevo.');
        setPhase('thinking');
        setPosition(stepFen);
        setPlayedUci(null);
      }
      return true;
    },
    [
      phase,
      stepFen,
      baseEval,
      bestMoveUci,
      attempts,
      solverMoves,
      maxSolverMoves,
      stepLine,
      evaluate,
      onFirstResult,
      onSolved,
    ]
  );

  /**
   * Play out the refutation. No grading here — the verdict is already in, and
   * the point is to see concretely what the punishment looks like.
   */
  const explore = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const chess = new Chess(position);
      let move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      if (!move) return;
      // Entering free play from the verdict: no more grading from here.
      setPhase('exploring');
      setPosition(chess.fen());
      setSelectedSquare(null);
      // Drop the arrow on the move that was graded — several moves later it
      // points at a position that is no longer on the board.
      setPlayedUci(null);
      setLine(prev => [...prev, { san: move.san, uci: moveToUci(move), by: 'you' }]);
      if (chess.isGameOver()) return;

      const reply = await evaluate(chess.fen());
      if (!reply.bestMove || reply.bestMove === '(none)') return;
      const applied = applyUci(chess.fen(), reply.bestMove);
      if (!applied) return;
      setReplyUci(reply.bestMove);
      setPosition(applied.fen);
      setLine(prev => [...prev, { san: applied.san, uci: reply.bestMove!, by: 'rival' }]);
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
      // Only a move made from `thinking` is graded; a move played after the
      // verdict is exploration.
      if (phase === 'thinking') void commit(from, to);
      else void explore(from, to);
      return true;
    },
    [canMove, phase, isPromotion, commit, explore]
  );

  /** Play the engine's move for you and carry on — a solved move you didn't find. */
  const playSolution = useCallback(() => {
    if (!solutionUci || phase !== 'thinking') return;
    setHintLevel(2);
    void commit(
      solutionUci.slice(0, 2),
      solutionUci.slice(2, 4),
      solutionUci.length > 4 ? solutionUci[4] : undefined
    );
  }, [solutionUci, phase, commit]);

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
  // Level-1 hint: which piece moves, and nothing about where.
  if (hintLevel === 1 && solutionUci && phase === 'thinking') {
    squareStyles[solutionUci.slice(0, 2)] = {
      boxShadow: 'inset 0 0 0 3px rgb(var(--accent) / 0.9)',
    };
  }

  const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
  if (hintLevel >= 2 && solutionUci && phase === 'thinking') {
    const hint = uciSquares(solutionUci);
    arrows.push({ startSquare: hint.from, endSquare: hint.to, color: 'rgb(var(--accent) / 0.8)' });
  }
  if (phase !== 'thinking' && playedUci) {
    const played = uciSquares(playedUci);
    arrows.push({
      startSquare: played.from,
      endSquare: played.to,
      color: grade?.verdict === 'correcta' ? 'rgb(var(--win) / 0.7)' : 'rgb(var(--loss) / 0.7)',
    });
  }
  if (replyUci) {
    const reply = uciSquares(replyUci);
    arrows.push({ startSquare: reply.from, endSquare: reply.to, color: 'rgb(var(--draw) / 0.8)' });
  }

  const style = grade ? VERDICT_STYLE[grade.verdict] : null;
  const solvedCorrectly = phase === 'solved';
  /** Moves left to find, once the first one is in. */
  const remaining = Math.max(0, maxSolverMoves - solverMoves);

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

      {showEval && (
        <div className="mt-3">
          <EvalBar
            evaluation={phase === 'thinking' ? baseEval : null}
            loading={evaluating || phase === 'grading'}
          />
        </div>
      )}

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
                  if (phase === 'thinking') void commit(from, to, code);
                  else void explore(from, to, code);
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

      {/* The prompt. A puzzle board with no prompt reads as a static diagram —
          which is exactly how this board was being misread. */}
      {phase === 'thinking' && (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 px-3 py-2">
          <p className="text-sm font-medium text-fg">
            {solverMoves === 0
              ? `Jugás con ${solverSide === 'w' ? 'blancas' : 'negras'} — encontrá la mejor jugada.`
              : `Bien. Seguí la línea: te ${remaining === 1 ? 'queda 1 jugada' : `quedan ${remaining} jugadas`}.`}
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Arrastrá una pieza o tocá origen y destino. Stockfish evalúa cada jugada tuya.
          </p>
        </div>
      )}

      {phase === 'grading' && <p className="mt-3 text-sm text-fg-muted">Evaluando tu jugada…</p>}

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}

      {solvedCorrectly && (
        <div className="mt-3 rounded-lg border border-win/30 bg-win/10 p-3 text-win">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrophyIcon className="w-5 h-5 shrink-0" />
            Resuelto
            {attempts > 1 && (
              <span className="nums font-normal opacity-75">· {attempts} intentos</span>
            )}
          </div>
        </div>
      )}

      {(phase === 'wrong' || phase === 'exploring') && grade && style && (
        <div className={`mt-3 rounded-lg border p-3 ${style.cls}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <style.Icon className="w-5 h-5 shrink-0" />
            {style.label}
            {grade.cpLoss > 0 && (
              <span className="nums font-normal">· {formatCpLoss(grade.cpLoss)}</span>
            )}
          </div>
          {replyUci && (
            <p className="text-xs mt-1 opacity-90">
              La respuesta del rival está en el tablero. Seguí jugando la línea para ver cómo
              sigue, o volvé a intentar.
            </p>
          )}
          {attempts > 1 && solverMoves === 0 && (
            <p className="text-xs mt-1 opacity-75 nums">
              Intento {attempts} · sólo cuenta el primero para la estadística
            </p>
          )}
        </div>
      )}

      {/* The line you have built, so a three-move puzzle reads as a line and
          not as three disconnected verdicts. */}
      {line.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {line.map((m, i) => (
            <span
              key={i}
              className={`nums font-mono ${
                m.by === 'rival'
                  ? 'text-fg-subtle'
                  : m.verdict === 'mala'
                    ? 'text-loss'
                    : m.verdict === 'imprecisa'
                      ? 'text-draw'
                      : 'text-fg'
              }`}
            >
              {m.san}
            </span>
          ))}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phase === 'thinking' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={LightBulbIcon}
              disabled={!solutionUci}
              onClick={() => setHintLevel(l => Math.min(2, l + 1))}
            >
              {hintLevel === 0 ? 'Pista' : hintLevel === 1 ? 'Otra pista' : 'Pista dada'}
            </Button>
            <Button variant="ghost" size="sm" disabled={!solutionUci} onClick={playSolution}>
              Ver solución
            </Button>
          </>
        )}
        {(phase === 'wrong' || phase === 'exploring') && (
          <Button variant="secondary" size="sm" icon={ArrowUturnLeftIcon} onClick={retryStep}>
            Probar otra jugada
          </Button>
        )}
        {(phase === 'wrong' || phase === 'exploring' || phase === 'solved') && solverMoves > 0 && (
          <Button variant="ghost" size="sm" onClick={restart}>
            Reiniciar puzzle
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          icon={EyeIcon}
          onClick={() => setShowEval(v => !v)}
          aria-pressed={showEval}
        >
          {showEval ? 'Ocultar evaluación' : 'Ver evaluación'}
        </Button>
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
};

export default PuzzleBoard;
