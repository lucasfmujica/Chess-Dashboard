import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface BlunderSolveBoardProps {
  fen: string;
  bestMoveUci: string;
  orientation: 'white' | 'black';
  /** Called once per attempt with whether the move played matched the best move. */
  onResult: (correct: boolean) => void;
  /** Remounts the interaction state for a new position. */
  resetKey: string;
}

const uciSquares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/**
 * Interactive "find the move" board for tactics solve mode. Accepts one legal
 * move, grades it by exact UCI match against the stored best move, then shows
 * the result (and the correct move as an arrow if wrong).
 */
const BlunderSolveBoard = ({ fen, bestMoveUci, orientation, onResult, resetKey }: BlunderSolveBoardProps) => {
  const [outcome, setOutcome] = useState<'correct' | 'incorrect' | null>(null);
  const [playedUci, setPlayedUci] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  useEffect(() => {
    setOutcome(null);
    setPlayedUci(null);
    setSelectedSquare(null);
  }, [resetKey]);

  const sideToMove: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';

  const legalTargets = (() => {
    if (!selectedSquare) return [];
    try {
      return new Chess(fen).moves({ square: selectedSquare as Square, verbose: true }).map((m): string => m.to);
    } catch {
      return [];
    }
  })();

  const attempt = (from: string, to: string): boolean => {
    if (outcome) return false;
    try {
      const chess = new Chess(fen);
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) return false;
      const uci = move.from + move.to;
      setPlayedUci(uci);
      const correct = uci === bestMoveUci;
      setOutcome(correct ? 'correct' : 'incorrect');
      onResult(correct);
      return true;
    } catch {
      return false;
    }
  };

  const handleSquareClick = ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
    if (outcome) return;
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
      setSelectedSquare(null);
      return;
    }
    setSelectedSquare(isMovable ? square : null);
  };

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = { boxShadow: 'inset 0 0 0 3px rgb(var(--board-highlight) / 0.75)' };
    legalTargets.forEach(sq => {
      squareStyles[sq] = { background: 'radial-gradient(circle, rgb(var(--board-highlight) / 0.5) 22%, transparent 25%)' };
    });
  }

  const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
  if (outcome === 'incorrect') {
    const best = uciSquares(bestMoveUci);
    arrows.push({ startSquare: best.from, endSquare: best.to, color: 'rgb(var(--win) / 0.7)' });
    if (playedUci) {
      const played = uciSquares(playedUci);
      arrows.push({ startSquare: played.from, endSquare: played.to, color: 'rgb(var(--loss) / 0.7)' });
    }
  }

  return (
    <div>
      <div className="rounded-lg overflow-hidden border border-hairline">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: !outcome,
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
      {outcome && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${
            outcome === 'correct' ? 'border-win/30 bg-win/10 text-win' : 'border-loss/30 bg-loss/10 text-loss'
          }`}
        >
          {outcome === 'correct' ? (
            <>
              <CheckCircleIcon className="w-5 h-5" /> Correct — that was the best move.
            </>
          ) : (
            <>
              <XCircleIcon className="w-5 h-5" /> Not quite — the best move is shown in green.
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BlunderSolveBoard;
