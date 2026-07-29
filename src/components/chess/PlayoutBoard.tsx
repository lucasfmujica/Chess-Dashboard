import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { FlagIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { usePuzzleEngine } from '../../hooks/usePuzzleEngine';
import { gradeMove, formatCpLoss, type Verdict } from '../../utils/puzzleGrading';
import { Button } from '../ui';

/**
 * Play a position out against Stockfish, with every one of your moves graded.
 *
 * This is what an endgame drill needs and a puzzle board can't give it: an
 * endgame has no single move to find, the question is whether you can hold or
 * convert it over many moves. It also covers the homework Toto actually set —
 * "jugá el final de torres 4v3 contra el bot, cuatro veces".
 */

interface PlayoutBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  /** Fires when the game ends or you stop. `clean` = no outright bad move. */
  onFinish: (clean: boolean, summary: PlayoutSummary) => void;
  resetKey: string;
}

export interface PlayoutSummary {
  moves: number;
  inaccuracies: number;
  mistakes: number;
  /** Set when the game reached a real conclusion rather than being stopped. */
  outcome?: string;
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
const GLYPHS: Record<string, { w: string; b: string }> = {
  q: { w: '♕', b: '♛' },
  r: { w: '♖', b: '♜' },
  b: { w: '♗', b: '♝' },
  n: { w: '♘', b: '♞' },
};

const outcomeOf = (chess: Chess, solverSide: 'w' | 'b'): string => {
  if (chess.isCheckmate()) {
    // The side to move is the one that got mated.
    return chess.turn() === solverSide ? 'Te dieron mate' : 'Diste mate';
  }
  if (chess.isStalemate()) return 'Ahogado';
  if (chess.isInsufficientMaterial()) return 'Tablas por material insuficiente';
  if (chess.isThreefoldRepetition()) return 'Tablas por repetición';
  if (chess.isDraw()) return 'Tablas';
  return 'Partida terminada';
};

const PlayoutBoard = ({ fen, orientation, onFinish, resetKey }: PlayoutBoardProps) => {
  const { evaluate } = usePuzzleEngine();

  const [position, setPosition] = useState(fen);
  const [thinking, setThinking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  const [grades, setGrades] = useState<Verdict[]>([]);
  const [lastLoss, setLastLoss] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const solverSide: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const sideToMove: 'w' | 'b' = position.split(' ')[1] === 'b' ? 'b' : 'w';
  const canMove = !thinking && !finished && sideToMove === solverSide;

  const reset = useCallback(() => {
    setPosition(fen);
    setThinking(false);
    setFinished(false);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setGrades([]);
    setLastLoss(null);
    setOutcome(null);
  }, [fen]);

  useEffect(() => reset(), [resetKey, reset]);

  const summary = useMemo<PlayoutSummary>(
    () => ({
      moves: grades.length,
      inaccuracies: grades.filter(v => v === 'imprecisa').length,
      mistakes: grades.filter(v => v === 'mala').length,
      outcome: outcome ?? undefined,
    }),
    [grades, outcome]
  );

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

  const stop = useCallback(
    (reachedEnd: string | null) => {
      setFinished(true);
      setOutcome(reachedEnd);
      const clean = grades.every(v => v !== 'mala');
      onFinish(clean, { ...summary, outcome: reachedEnd ?? undefined });
    },
    [grades, summary, onFinish]
  );

  const play = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const before = position;
      const chess = new Chess(before);
      let move;
      try {
        move = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      if (!move) return;

      setPosition(chess.fen());
      setSelectedSquare(null);
      setThinking(true);

      try {
        // Grade the move: best available before it, versus what it left.
        const [beforeEval, afterEval] = await Promise.all([
          evaluate(before),
          evaluate(chess.fen()),
        ]);
        const grade = gradeMove(beforeEval, afterEval);
        setGrades(g => [...g, grade.verdict]);
        setLastLoss(grade.cpLoss);

        if (chess.isGameOver()) {
          setThinking(false);
          stop(outcomeOf(chess, solverSide));
          return;
        }

        // Engine replies.
        const reply = afterEval.bestMove;
        if (reply && reply !== '(none)') {
          try {
            chess.move({
              from: reply.slice(0, 2),
              to: reply.slice(2, 4),
              promotion: reply.length > 4 ? reply[4] : undefined,
            });
            setPosition(chess.fen());
          } catch {
            // Unplayable engine move; leave the position after your move.
          }
        }
        if (chess.isGameOver()) {
          setThinking(false);
          stop(outcomeOf(chess, solverSide));
          return;
        }
      } catch {
        // Engine failed; let the user keep playing rather than freezing.
      }
      setThinking(false);
    },
    [position, evaluate, solverSide, stop]
  );

  const attempt = useCallback(
    (from: string, to: string): boolean => {
      if (!canMove) return false;
      if (isPromotion(from, to)) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        return false;
      }
      void play(from, to);
      return true;
    },
    [canMove, isPromotion, play]
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
        background:
          'radial-gradient(circle, rgb(var(--board-highlight) / 0.5) 22%, transparent 25%)',
      };
    });
  }

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
                  void play(from, to, code);
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

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-fg-muted nums">
          {summary.moves} jugada{summary.moves === 1 ? '' : 's'}
        </span>
        {summary.inaccuracies > 0 && (
          <span className="text-draw nums">{summary.inaccuracies} imprecisas</span>
        )}
        {summary.mistakes > 0 && (
          <span className="text-loss nums">{summary.mistakes} malas</span>
        )}
        {lastLoss !== null && lastLoss > 0 && !finished && (
          <span className="text-fg-subtle nums">última {formatCpLoss(lastLoss)}</span>
        )}
        {thinking && <span className="text-fg-muted">El motor está pensando…</span>}
      </div>

      {finished ? (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 p-3">
          <p className="text-fg font-medium">{outcome ?? 'Final interrumpido'}</p>
          <p className="text-sm text-fg-muted mt-1">
            {summary.mistakes === 0
              ? 'Lo jugaste sin errores graves.'
              : `${summary.mistakes} jugada${summary.mistakes === 1 ? '' : 's'} mala${summary.mistakes === 1 ? '' : 's'} en el camino.`}
          </p>
          <Button variant="secondary" size="sm" icon={ArrowUturnLeftIcon} className="mt-3" onClick={reset}>
            Jugarlo de nuevo
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" icon={FlagIcon} className="mt-3" onClick={() => stop(null)}>
          Terminar acá
        </Button>
      )}
    </div>
  );
};

export default PlayoutBoard;
