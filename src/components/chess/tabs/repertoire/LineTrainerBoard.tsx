import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import BoardFrame from '../../BoardFrame';
import { boardSquareStyles } from '../../boardTheme';
import { Button } from '../../../ui';
import type { RepertoireMove } from '../../../../types/chess';

/**
 * Plays one prepared line, move by move, the way Chessable does.
 *
 * The grading is exact SAN, not centipawns, and that is the whole point: this
 * trains the preparation, not the position. `PuzzleBoard` asks "what is the
 * best move here" and accepts anything Stockfish rates as equal — correct for
 * a blunder drill, wrong for a repertoire where the answer is "the move I
 * decided on, in the move order I decided on". Chapter 09 exists precisely
 * because objectively-playable moves in the wrong order lose the game.
 *
 * A sibling of `PuzzleBoard` rather than a fork of it: they share the board
 * chrome and the interaction idiom, and nothing else.
 */

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;

const GLYPHS: Record<string, { w: string; b: string }> = {
  q: { w: '♕', b: '♛' },
  r: { w: '♖', b: '♜' },
  b: { w: '♗', b: '♝' },
  n: { w: '♘', b: '♞' },
};

/** How long a correct move with nothing to read stays on screen before advancing. */
const AUTO_ADVANCE_MS = 550;

type Phase = 'thinking' | 'right' | 'wrong' | 'done';

interface Feedback {
  playedSan: string;
  /** The study's text — the golden rule on a right move, the refutation on a trap. */
  note?: string;
  /** Set when the move played was a recorded trap rather than just wrong. */
  trap: boolean;
  /** Set when the move is one the study also endorses, just not the main one. */
  alt: boolean;
}

interface LineTrainerBoardProps {
  /** The line to play, in order. Each move's `fenBefore` follows from the previous. */
  line: RepertoireMove[];
  /** Traps and alternates for this chapter, indexed by `pathSan`. */
  byPath: Map<string, RepertoireMove[]>;
  orientation: 'white' | 'black';
  /**
   * Fires once per move, on its FIRST attempt, so retries don't inflate the
   * statistics — the same rule `PuzzleBoard.onFirstResult` follows.
   */
  onGraded: (move: RepertoireMove, correct: boolean) => void;
  /** Fires when the last move of the line has been answered. */
  onFinished?: () => void;
  /** Remounts interaction state for a new line. */
  resetKey: string;
  /**
   * Drops the progress header and the advance button, for the daily queue —
   * there the line is a single move and the queue owns "what comes next", so
   * a second Seguir button and a "Jugada 1 de 1" bar are noise.
   */
  compact?: boolean;
}

const LineTrainerBoard = ({
  line,
  byPath,
  orientation,
  onGraded,
  onFinished,
  resetKey,
  compact = false,
}: LineTrainerBoardProps) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  const [revealed, setRevealed] = useState(false);
  /** Position shown after a right move, so the opponent's answer is visible. */
  const [afterFen, setAfterFen] = useState<string | null>(null);

  /**
   * Which moves have already been graded. Retrying must not re-report an
   * outcome, and the set is keyed by id so it survives moving back and forth.
   */
  const gradedRef = useRef<Set<string>>(new Set());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current: RepertoireMove | undefined = line[index];

  const reset = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    gradedRef.current = new Set();
    setIndex(0);
    setPhase('thinking');
    setFeedback(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setRevealed(false);
    setAfterFen(null);
  }, []);

  useEffect(reset, [resetKey, reset]);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const position = afterFen ?? current?.fenBefore ?? line[line.length - 1]?.fenBefore ?? '';
  const canMove = phase === 'thinking' && !!current;

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !position) return [];
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

  /** Step to the next move, or end the line. */
  const advance = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setFeedback(null);
    setAfterFen(null);
    setRevealed(false);
    setSelectedSquare(null);
    if (index + 1 >= line.length) {
      setPhase('done');
      onFinished?.();
      return;
    }
    setIndex(i => i + 1);
    setPhase('thinking');
  }, [index, line.length, onFinished]);

  /**
   * Grades a move against the prepared one.
   *
   * `alt` rows are accepted: they are moves this same study endorses, so
   * refusing them would mark the user's own preparation wrong. They still
   * report the main move, because the line continues down that one.
   */
  const submit = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!current) return;

      const chess = new Chess(current.fenBefore);
      let played;
      try {
        played = chess.move({ from, to, promotion });
      } catch {
        return;
      }
      if (!played) return;

      const siblings = byPath.get(current.pathSan) ?? [];
      const matchedAlt = siblings.find(s => s.role === 'alt' && s.expectedSan === played.san);
      const matchedTrap = siblings.find(s => s.role === 'trap' && s.expectedSan === played.san);
      const correct = played.san === current.expectedSan || !!matchedAlt;

      // Only the first attempt on a move counts, and a revealed answer is not
      // a recall — grading it as one would inflate the SRS interval.
      if (!gradedRef.current.has(current.id)) {
        gradedRef.current.add(current.id);
        onGraded(current, correct && !revealed);
      }

      if (correct) {
        // Show the position after the prepared move and the scripted reply, so
        // the answer is visible before the board moves on.
        const board = new Chess(current.fenBefore);
        try {
          board.move(current.expectedSan);
          if (current.replySan) board.move(current.replySan);
        } catch {
          // A reply the position rejects means the import drifted from the
          // study; showing the move alone is better than showing nothing.
        }
        setAfterFen(board.fen());
        setPhase('right');
        setFeedback({
          playedSan: played.san,
          note: matchedAlt
            ? `También jugable, pero tu línea principal acá es ${current.expectedSan}.`
            : current.comment,
          trap: false,
          alt: !!matchedAlt,
        });

        // Nothing to read → keep the line moving. Something to read → wait.
        if (!matchedAlt && !current.comment) {
          advanceTimer.current = setTimeout(advance, AUTO_ADVANCE_MS);
        }
        return;
      }

      setPhase('wrong');
      setFeedback({
        playedSan: played.san,
        note: matchedTrap?.comment,
        trap: !!matchedTrap,
        alt: false,
      });
      setSelectedSquare(null);
    },
    [current, byPath, onGraded, revealed, advance]
  );

  const attempt = useCallback(
    (from: string, to: string): boolean => {
      if (!canMove) return false;
      if (isPromotion(from, to)) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        return false;
      }
      submit(from, to);
      return true;
    },
    [canMove, isPromotion, submit]
  );

  /** Back to the same position to try again — the move is already graded. */
  const retry = useCallback(() => {
    setPhase('thinking');
    setFeedback(null);
    setSelectedSquare(null);
  }, []);

  const sideToMove = orientation === 'white' ? 'w' : 'b';

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

  const arrows: { startSquare: string; endSquare: string; color: string }[] = [];
  if (revealed && current && phase === 'thinking') {
    try {
      const shown = new Chess(current.fenBefore).move(current.expectedSan);
      if (shown) {
        arrows.push({
          startSquare: shown.from,
          endSquare: shown.to,
          color: 'rgb(var(--accent) / 0.8)',
        });
      }
    } catch {
      // A move the board rejects just gets no arrow.
    }
  }

  if (line.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-5 text-sm text-fg-muted">
        Esta línea no tiene jugadas tuyas.
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-fg">
              Jugada {Math.min(index + 1, line.length)} de {line.length}
            </span>
            <span className="text-xs text-fg-subtle">
              {current?.isMainline ? 'Línea principal' : 'Variante'}
            </span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${((phase === 'done' ? line.length : index) / line.length) * 100}%`,
              }}
            />
          </div>
        </>
      )}

      <BoardFrame>
        <Chessboard
          options={{
            position,
            boardOrientation: orientation,
            allowDragging: canMove,
            showNotation: true,
            animationDurationInMs: 150,
            arrows,
            squareStyles,
            ...boardSquareStyles,
            onSquareClick: handleSquareClick,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              return attempt(sourceSquare, targetSquare);
            },
          }}
        />
      </BoardFrame>

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
                  submit(from, to, code);
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

      {phase === 'thinking' && (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 px-3 py-2">
          <p className="text-sm font-medium text-fg">
            {revealed
              ? `Tu jugada preparada es ${current?.expectedSan}. Jugala para seguir.`
              : 'Jugá tu línea preparada.'}
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Arrastrá una pieza o tocá origen y destino. Acá se corrige contra tu repertorio, no
            contra el motor.
          </p>
        </div>
      )}

      {feedback && phase === 'right' && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 ${
            feedback.alt ? 'border-draw/30 bg-draw/10' : 'border-win/30 bg-win/10'
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <CheckCircleIcon className={`h-5 w-5 ${feedback.alt ? 'text-draw' : 'text-win'}`} />
            {feedback.playedSan}
            {current?.replySan && (
              <span className="font-normal text-fg-muted">— responde {current.replySan}</span>
            )}
          </p>
          {feedback.note && <p className="mt-1.5 whitespace-pre-line text-sm text-fg">{feedback.note}</p>}
        </div>
      )}

      {feedback && phase === 'wrong' && (
        <div className="mt-3 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <XCircleIcon className="h-5 w-5 text-loss" />
            {feedback.playedSan}
            {feedback.trap && <span className="font-normal text-fg-muted">— está en tu estudio</span>}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-fg">
            {feedback.note ?? 'No es tu línea preparada acá.'}
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-3 rounded-lg border border-win/30 bg-win/10 px-3 py-2">
          <p className="text-sm font-semibold text-fg">Línea completa.</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {phase === 'thinking' && !revealed && (
          <Button variant="secondary" onClick={() => setRevealed(true)}>
            <LightBulbIcon className="mr-1.5 h-4 w-4" />
            Ver la jugada
          </Button>
        )}
        {phase === 'wrong' && (
          <>
            <Button variant="secondary" onClick={retry}>
              <ArrowUturnLeftIcon className="mr-1.5 h-4 w-4" />
              Probar de nuevo
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPhase('thinking');
                setFeedback(null);
                setRevealed(true);
              }}
            >
              Ver la jugada
            </Button>
          </>
        )}
        {phase === 'right' && !compact && (
          <Button onClick={advance}>
            {index + 1 >= line.length ? 'Terminar línea' : 'Seguir'}
          </Button>
        )}
        {phase === 'done' && !compact && (
          <Button variant="secondary" onClick={reset}>
            Jugar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
};

export default LineTrainerBoard;
