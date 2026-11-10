import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from './boardTheme';
import BoardFrame from './BoardFrame';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/solid';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useGameReplay } from '../../hooks/useGameReplay';
import { useGameAnalysis } from '../../hooks/useGameAnalysis';
import { useEngineSettings } from '../../hooks/useEngineSettings';
import { useLocalEngine } from '../../hooks/useLocalEngine';
import { useMyRepertoireMoves } from '../../hooks/useMyRepertoireMoves';
import { useOpeningName } from '../../utils/openings';
import { downloadFile } from '../../utils/exportUtils';
import type { MoveQuality } from '../../engine/analyzeGame';
import { winPct, formatEval } from '../../utils/evalFormat';
import MovesExplorer from './MovesExplorer';
import EngineLines from './EngineLines';
import PersonalMoves from './PersonalMoves';
import EvalGraph from '../charts/EvalGraph';
import { Button, ResultMark } from '../ui';

/**
 * What the board is showing right now, handed to the `capture` slot.
 *
 * The whole point is that a caller can record a position without mirroring any
 * of this in its own state: it reads the values at the moment the user clicks.
 */
export interface BoardPosition {
  /** FEN on the board — the position `playedSan` was played *from*. */
  fen: string;
  ply: number;
  /** SAN actually played from `fen`; absent at the final position. */
  playedSan?: string;
  /** Engine's move from `fen`: the live engine when on, else the batch analysis. */
  bestSan?: string;
  /** The batch verdict on `playedSan`. Mainline only. */
  playedQuality?: MoveQuality;
  /** Centipawn loss of `playedSan`. Mainline only. */
  cpLoss?: number;
  /** Ply of your own worst move — the position to jump to before capturing. */
  worstPly?: number;
  goTo: (ply: number) => void;
  isVariation: boolean;
}

interface GameViewerProps {
  pgn?: string;
  orientation?: 'white' | 'black';
  white?: string;
  black?: string;
  result?: string;
  /** Show the Lichess masters explorer + your own opening tree. */
  showExplorer?: boolean;
  /** Show the live Stockfish engine panel + best-move arrow. */
  showEngine?: boolean;
  /**
   * Panel rendered at the top of the analysis column, fed the current position.
   * A render slot rather than a change callback on purpose: the live engine
   * re-emits on every depth tick, so a pushed callback would re-render the
   * caller continuously for a value it only needs when the user clicks.
   */
  capture?: (position: BoardPosition) => ReactNode;
  /**
   * Marcas que pone el slot `capture` sobre el tablero.
   *
   * Las flechas del visor son suyas (mejor jugada del motor + la jugada real) y
   * se siguen calculando acá; esto se suma. Existe porque el diagnóstico sabe
   * cosas que el tablero no puede deducir — por ejemplo qué pieza rival se
   * volvió peligrosa, que sale de una ablación con Stockfish, no de la posición.
   *
   * Va como prop y no como estado interno porque quien lo sabe es el panel, y
   * el panel se renderiza adentro de este componente: la única forma de que la
   * información suba es que el padre la tenga.
   */
  marks?: {
    arrows?: { from: string; to: string; color: string }[];
    /** Casillas a destacar, con el color del recuadro. */
    squares?: { square: string; color: string }[];
  };
  /**
   * Grow the board on large viewports instead of staying fixed at 460px.
   * Only safe when the parent gives the board room to grow (the full
   * Analysis Board page) — the game-replay modal stays at the compact size.
   */
  wide?: boolean;
}

/** NAGs on the score sheet: the symbol and its ink. */
const QUALITY_META: Partial<Record<MoveQuality, { sym: string; cls: string }>> = {
  blunder: { sym: '??', cls: 'text-loss' },
  mistake: { sym: '?', cls: 'text-loss' },
  inaccuracy: { sym: '?!', cls: 'text-cat-2' },
};

const ControlButton = ({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="flex h-9 w-11 items-center justify-center rounded border border-hairline bg-surface text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45"
  >
    {children}
  </button>
);

/** '1-0' / '0-1' / '½-½' seen from one side, as the arbiter writes it. */
const sideResult = (result: string | undefined, side: 'white' | 'black'): 'W' | 'D' | 'L' | undefined => {
  const r = (result ?? '').replace(/\s/g, '');
  if (r === '1-0') return side === 'white' ? 'W' : 'L';
  if (r === '0-1') return side === 'white' ? 'L' : 'W';
  if (r === '1/2-1/2' || r === '½-½') return 'D';
  return undefined;
};

/** One player's line above or below the board: result, name, colour. */
const PlayerLine = ({ name, side, result }: { name?: string; side: 'white' | 'black'; result?: string }) => {
  const mark = sideResult(result, side);
  const colour = side === 'white' ? 'Blancas' : 'Negras';
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        {mark && <ResultMark result={mark} outline />}
        <span className="truncate font-medium text-fg">{name || colour}</span>
      </span>
      {name && <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">{colour.toLowerCase()}</span>}
    </div>
  );
};

const GameViewer = ({
  pgn,
  orientation = 'white',
  white,
  black,
  result,
  showExplorer = false,
  showEngine = false,
  wide = false,
  capture,
  marks,
}: GameViewerProps) => {
  const replay = useGameReplay(pgn);
  const {
    fen, fens, sans, ply, totalPlies, isValid, error,
    goTo, next, prev, first, last, playMove, reset, isVariation, variationStart,
  } = replay;
  const { analysis, analyzing, progress, error: analysisError, analyze, cancel } = useGameAnalysis(pgn, fens);
  const explorable = showExplorer || showEngine;

  const playUci = (uci: string): boolean =>
    playMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });

  // Click-to-move (alternative to dragging): first click selects a piece and
  // highlights its legal destinations, second click plays the move.
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  // A pawn move that reached the last rank, awaiting the player's piece choice.
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      return new Chess(fen).moves({ square: selectedSquare as Square, verbose: true }).map((m): string => m.to);
    } catch {
      return [];
    }
  }, [fen, selectedSquare]);

  const needsPromotion = (from: string, to: string): boolean => {
    try {
      return new Chess(fen).moves({ square: from as Square, verbose: true }).some(m => m.to === to && m.promotion);
    } catch {
      return false;
    }
  };

  // Clear any pending click-selection whenever the position changes from
  // elsewhere (stepping through moves, loading a new game, etc).
  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [ply, pgn]);

  // Whose turn it is right now — only pieces of this color are selectable.
  const sideToMove: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';

  const handleSquareClick = ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
    if (!explorable || pendingPromotion) return;
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
      if (needsPromotion(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
      } else {
        playMove({ from: selectedSquare, to: square });
      }
      setSelectedSquare(null);
      return;
    }
    // Not a legal destination — reselect if it's another one of your own pieces.
    setSelectedSquare(isMovable ? square : null);
  };

  const choosePromotion = (promotion: string) => {
    if (!pendingPromotion) return;
    playMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion });
    setPendingPromotion(null);
  };

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = { boxShadow: 'inset 0 0 0 3px rgb(var(--board-highlight) / 0.75)' };
      legalTargets.forEach(sq => {
        styles[sq] = { background: 'radial-gradient(circle, rgb(var(--board-highlight) / 0.5) 22%, transparent 25%)' };
      });
    }
    // Las marcas del panel van después: si el usuario tiene una casilla
    // seleccionada, lo que está haciendo ahora gana sobre el diagnóstico.
    marks?.squares?.forEach(({ square, color }) => {
      if (!styles[square]) styles[square] = { boxShadow: `inset 0 0 0 3px ${color}` };
    });
    return styles;
  }, [selectedSquare, legalTargets, marks]);

  // `sideToMove` still reflects the promoting side here — `fen` hasn't
  // changed yet while the picker is up, since the move isn't played until
  // a piece is chosen.
  const PROMOTION_CHOICES: { code: string; glyph: string; label: string }[] = [
    { code: 'q', glyph: sideToMove === 'w' ? '♕' : '♛', label: 'Dama' },
    { code: 'r', glyph: sideToMove === 'w' ? '♖' : '♜', label: 'Torre' },
    { code: 'b', glyph: sideToMove === 'w' ? '♗' : '♝', label: 'Alfil' },
    { code: 'n', glyph: sideToMove === 'w' ? '♘' : '♞', label: 'Caballo' },
  ];
  const [settings, setSettings] = useEngineSettings();
  const [engineOn, setEngineOn] = useState(false);
  const engineState = useLocalEngine(fen, settings, showEngine && engineOn);
  // Which of your games to show in the personal-moves panel: as White or Black.
  // Defaults to the side you're viewing the board from.
  const [personalColor, setPersonalColor] = useState<'W' | 'B'>(orientation === 'black' ? 'B' : 'W');
  useEffect(() => setPersonalColor(orientation === 'black' ? 'B' : 'W'), [orientation]);
  const personalMoves = useMyRepertoireMoves(fen, personalColor);
  const opening = useOpeningName(fens, ply);
  const [flipped, setFlipped] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);

  const boardOrientation: 'white' | 'black' = (orientation === 'white') !== flipped ? 'white' : 'black';

  useEffect(() => setFlipped(false), [pgn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The board can sit inside a form (the Game Library post-mortem), where
      // arrow keys belong to whatever field has focus, not to the move list.
      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Home') { e.preventDefault(); first(); }
      else if (e.key === 'End') { e.preventDefault(); last(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, first, last]);

  /**
   * Mantiene la jugada actual a la vista DENTRO de la lista, sin tocar la página.
   *
   * Antes esto era `scrollIntoView({ block: 'nearest' })`, que scrollea todos los
   * ancestros scrolleables: si la lista quedaba fuera del viewport, avanzar con
   * la flecha derecha saltaba la página entera y se llevaba el tablero de la
   * pantalla. Mover el scroll del contenedor a mano es lo único que garantiza
   * que el salto no se propague.
   */
  useEffect(() => {
    const container = moveListRef.current;
    const el = container?.querySelector<HTMLElement>('[data-active="true"]');
    if (!container || !el) return;
    const top = el.offsetTop - container.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight;
    }
  }, [ply]);

  const rows: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ num: i / 2 + 1, white: sans[i], black: sans[i + 1] });
  }

  // UCI of the move actually played from the current position (for the arrow + highlight).
  const playedMove = sans[ply];
  const playedUci = useMemo(() => {
    if (!playedMove) return undefined;
    try {
      const move = new Chess(fen).move(playedMove);
      return move ? move.from + move.to : undefined;
    } catch {
      return undefined;
    }
  }, [fen, playedMove]);

  /**
   * The position handed to the `capture` slot.
   *
   * `analysis.moves[i]` describes the move played from `fens[i]` — including
   * the engine's answer there — so the current board ply indexes it directly.
   * That fallback matters: the batch cache is seeded at startup, so a game
   * analysed before already offers a best move with the live engine off.
   */
  const batchMove = isVariation ? undefined : analysis?.moves[ply];
  const liveBestSan = showEngine && engineOn ? engineState.lines[0]?.sans[0] : undefined;
  const batchBestSan = useMemo(() => {
    const uci = batchMove?.bestMoveUci;
    if (!uci || uci.length < 4) return undefined;
    try {
      return new Chess(fen).move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      })?.san;
    } catch {
      return undefined;
    }
  }, [fen, batchMove?.bestMoveUci]);

  /**
   * Your own worst move by centipawn loss. Even ply indices are White's, so
   * which half of the list counts depends on the side you're viewing from.
   */
  const worstPly = useMemo(() => {
    if (!analysis) return undefined;
    let worst: number | undefined;
    let loss = 0;
    analysis.moves.forEach((m, i) => {
      const isMine = (i % 2 === 0) === (orientation === 'white');
      if (isMine && m.cpLoss > loss) {
        loss = m.cpLoss;
        worst = i;
      }
    });
    return worst;
  }, [analysis, orientation]);

  const capturePosition: BoardPosition = {
    fen,
    ply,
    playedSan: playedMove,
    bestSan: liveBestSan ?? batchBestSan,
    playedQuality: batchMove?.quality,
    cpLoss: batchMove?.cpLoss,
    worstPly,
    goTo,
    isVariation,
  };

  // Board arrows: engine best (green) + your move (muted).
  const arrows = useMemo(() => {
    const list: { startSquare: string; endSquare: string; color: string }[] = [];
    const best = engineState.lines[0]?.firstUci;
    if (showEngine && engineOn && best && best.length >= 4) {
      list.push({ startSquare: best.slice(0, 2), endSquare: best.slice(2, 4), color: 'rgb(var(--board-highlight) / 0.65)' });
    }
    if (playedUci) {
      list.push({ startSquare: playedUci.slice(0, 2), endSquare: playedUci.slice(2, 4), color: 'rgb(var(--fg-muted) / 0.55)' });
    }
    marks?.arrows?.forEach(a =>
      list.push({ startSquare: a.from, endSquare: a.to, color: a.color })
    );
    return list;
  }, [engineState.lines, showEngine, engineOn, playedUci, marks]);

  // Eval bar — prefer the live engine (reflects the exact position you're on,
  // including variations); fall back to the full-game batch analysis, which
  // only covers mainline positions.
  const liveEvalCp = showEngine && engineOn ? engineState.lines[0]?.evalCp : undefined;
  const batchEvalAvailable = !!analysis && (!isVariation || ply <= variationStart) && analysis.evals[ply] !== undefined;
  const evalAvailable = liveEvalCp !== undefined || batchEvalAvailable;
  const currentEval = liveEvalCp !== undefined ? liveEvalCp : batchEvalAvailable ? analysis!.evals[ply] : 0;
  const whiteFraction = evalAvailable ? winPct(currentEval) / 100 : 0.5;
  const flip = boardOrientation === 'black';
  const whiteWinning = currentEval >= 0;
  const labelAtBottom = whiteWinning !== flip;
  const isMate = Math.abs(currentEval) >= 9000;
  const evalLabel = isMate ? '#' : (Math.abs(currentEval) / 100).toFixed(1);

  /** One move cell on the score sheet. */
  const moveCell = (san: string | undefined, plyNum: number) => {
    if (!san) return <span className="border-b border-l border-hairline" aria-hidden="true" />;
    const isVar = isVariation && plyNum - 1 >= variationStart;
    const q = isVar ? undefined : analysis?.moves[plyNum - 1]?.quality;
    const meta = q ? QUALITY_META[q] : undefined;
    const active = ply === plyNum;
    const tone = active
      ? 'bg-carbon text-fg'
      : q === 'blunder'
        ? 'bg-carbon-pink text-fg'
        : isVar
          ? 'italic text-fg-muted hover:bg-app'
          : 'text-fg hover:bg-app';
    return (
      <button
        data-active={active}
        aria-current={active ? 'true' : undefined}
        onClick={() => goTo(plyNum)}
        className={`border-b border-l border-hairline px-3 py-1 text-left font-serif text-base leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${tone}`}
        title={isVar ? 'Jugada de una variante' : undefined}
      >
        {san}
        {meta && <span className={`ml-0.5 font-sans font-semibold ${meta.cls}`}>{meta.sym}</span>}
      </button>
    );
  };

  const whiteName = white;
  const blackName = black;
  const topSide: 'white' | 'black' = boardOrientation === 'white' ? 'black' : 'white';
  const bottomSide: 'white' | 'black' = topSide === 'white' ? 'black' : 'white';
  const showPlayers = !!(white || black || result);

  // In `wide` mode (the Analysis Board) the board gets its own capped grid
  // track and the analysis panel absorbs the rest; the modal and inline
  // viewers keep a fixed board column beside a fluid panel.
  return (
    <div
      className={
        wide
          ? 'grid gap-6 xl:grid-cols-[minmax(0,calc(var(--board-user,var(--board-fit))+var(--board-gutter)))_minmax(380px,1fr)]'
          : 'flex flex-col xl:flex-row gap-6'
      }
      style={
        {
          '--board-fit': 'calc(100dvh - 260px)',
          // The eval bar shares the track with the board, so the track has to
          // be that much wider for the board itself to end up the size the
          // user dragged it to.
          '--board-gutter': '28px',
        } as CSSProperties
      }
    >
      <div className={`w-full min-w-0 space-y-2 ${wide ? '' : 'xl:w-[520px] xl:flex-shrink-0'}`}>
        {showPlayers && (
          <PlayerLine name={topSide === 'white' ? whiteName : blackName} side={topSide} result={result} />
        )}

        <div className="flex justify-center gap-2">
          {/* Eval bar. Its two halves are the board's own squares, which keep
              their colour in both themes: white's share is the light square. */}
          <div
            className="relative w-5 shrink-0 overflow-hidden rounded-sm bg-board-dark"
            title={
              evalAvailable
                ? `Evaluación ${formatEval(currentEval)} (desde Blancas)${liveEvalCp !== undefined ? ' · en vivo' : ''}`
                : 'Prendé el motor o analizá la partida para ver la evaluación'
            }
          >
            <div
              className="absolute left-0 right-0 bg-board-light transition-all duration-200"
              style={flip ? { top: 0, height: `${whiteFraction * 100}%` } : { bottom: 0, height: `${whiteFraction * 100}%` }}
            />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-fg/30" aria-hidden="true" />
            {evalAvailable && (
              <span
                className="absolute left-0 right-0 bg-surface py-0.5 text-center font-mono text-[9px] font-medium leading-none tabular-nums text-fg"
                style={labelAtBottom ? { bottom: 0 } : { top: 0 }}
              >
                {evalLabel}
              </span>
            )}
          </div>

          <BoardFrame className="flex-1 min-w-0">
            <Chessboard
              options={{
                position: fen,
                boardOrientation,
                allowDragging: explorable,
                showNotation: true,
                animationDurationInMs: 150,
                arrows,
                squareStyles,
                ...boardSquareStyles,
                onSquareClick: handleSquareClick,
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!targetSquare) return false;
                  if (needsPromotion(sourceSquare, targetSquare)) {
                    setPendingPromotion({ from: sourceSquare, to: targetSquare });
                    return false;
                  }
                  return playMove({ from: sourceSquare, to: targetSquare });
                },
              }}
            />

            {pendingPromotion && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-fg/40">
                <div className="rounded border border-hairline bg-surface p-3">
                  <p className="text-label mb-2 text-center">Coronar</p>
                  <div className="flex gap-1.5">
                    {PROMOTION_CHOICES.map(({ code, glyph, label }) => (
                      <button
                        key={code}
                        onClick={() => choosePromotion(code)}
                        aria-label={`Coronar ${label}`}
                        title={label}
                        className="flex h-11 w-11 items-center justify-center rounded border border-hairline bg-surface-2 text-3xl leading-none transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {glyph}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPendingPromotion(null)}
                    className="mt-2 w-full text-center text-xs text-fg-muted hover:text-fg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </BoardFrame>
        </div>

        {showPlayers && (
          <PlayerLine name={bottomSide === 'white' ? whiteName : blackName} side={bottomSide} result={result} />
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <ControlButton onClick={() => setFlipped(f => !f)} label="Girar tablero">
            <ArrowsUpDownIcon className="w-4 h-4" />
          </ControlButton>
          {pgn && (
            <ControlButton
              onClick={() => {
                const headers = [
                  `[White "${white || '?'}"]`,
                  `[Black "${black || '?'}"]`,
                  `[Result "${result || '*'}"]`,
                ].join('\n');
                downloadFile(`${headers}\n\n${pgn.trim()}`, 'game.pgn', 'application/x-chess-pgn');
              }}
              label="Descargar PGN"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </ControlButton>
          )}
          <ControlButton onClick={first} disabled={ply === 0} label="Primera jugada">
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={prev} disabled={ply === 0} label="Jugada anterior">
            <ChevronLeftIcon className="w-4 h-4" />
          </ControlButton>
          <span className="min-w-[64px] text-center font-mono text-sm tabular-nums text-fg-muted">
            {ply} / {totalPlies}
          </span>
          <ControlButton onClick={next} disabled={ply >= totalPlies} label="Jugada siguiente">
            <ChevronRightIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={last} disabled={ply >= totalPlies} label="Última jugada">
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </ControlButton>
        </div>
        <p className="text-center text-xs text-fg-subtle">
          ← → para avanzar, Inicio y Fin para saltar{explorable && ' · tocá o arrastrá una pieza para explorar una línea'}
        </p>
      </div>

      {/* Right column: capture, opening, engine, evaluation, score sheet */}
      <div className={`min-w-0 space-y-4 ${wide ? '' : 'flex-1'}`}>
        {capture?.(capturePosition)}

        {/* Live opening name for the current position (offline dataset). */}
        {opening && (
          <p className="flex flex-wrap items-baseline gap-2">
            {opening.eco && (
              <span className="rounded-sm border border-hairline px-1.5 font-mono text-xs tabular-nums text-fg-muted">
                {opening.eco}
              </span>
            )}
            <span className="font-serif text-base text-fg">{opening.name}</span>
          </p>
        )}

        {/* Live engine: the engine's panel on paper, under a thick ink rule. */}
        {showEngine && (
          <div className="[&>*]:rounded-t-none [&>*]:border-t-[3px] [&>*]:border-t-hairline-strong">
            <EngineLines
              state={engineState}
              enabled={engineOn}
              onToggle={() => setEngineOn(o => !o)}
              settings={settings}
              setSettings={setSettings}
              onPlay={playUci}
            />
          </div>
        )}

        {/* Full-game analysis (accuracy / blunders) */}
        {isValid && (
          <section className="rounded border border-hairline border-t-[3px] border-t-hairline-strong bg-surface p-4" aria-label="Análisis de la partida">
            {!analysis && !analyzing && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-muted">Stockfish revisa cada jugada y marca los errores en la planilla.</p>
                <Button variant="primary" size="sm" onClick={analyze}>
                  Analizar con Stockfish
                </Button>
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-surface-2">
                  <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <span className="font-mono text-xs tabular-nums text-fg-muted">{Math.round(progress * 100)} %</span>
                <Button variant="ghost" size="sm" onClick={cancel}>Cancelar</Button>
              </div>
            )}
            {analysisError && <p className="text-xs text-loss">{analysisError}</p>}
            {analysis && !analyzing && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-label">Precisión</span>
                  <span className="font-mono text-xs tabular-nums text-fg-subtle">prof. {analysis.depth}</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-sm text-fg-muted">
                    Blancas <span className="font-mono text-xl font-medium tabular-nums text-fg">{analysis.accuracyWhite} %</span>
                  </span>
                  <span className="text-sm text-fg-muted">
                    Negras <span className="font-mono text-xl font-medium tabular-nums text-fg">{analysis.accuracyBlack} %</span>
                  </span>
                </div>
                <p className="font-mono text-xs tabular-nums text-fg-muted">
                  <span className="text-loss">{analysis.blunders} ??</span> · {analysis.mistakes} ? · {analysis.inaccuracies} ?!
                  <span className="font-sans text-fg-subtle"> · blunders, errores e imprecisiones</span>
                </p>
              </div>
            )}
          </section>
        )}

        {/* Whole-game evaluation curve (mainline only) */}
        {analysis && !isVariation && <EvalGraph evals={analysis.evals} ply={ply} onSelect={goTo} />}

        {isVariation && (
          <div className="flex items-center justify-between gap-2 rounded border border-hairline bg-accent/10 px-3 py-2 text-sm">
            <span className="text-accent">Estás explorando una variante.</span>
            <Button variant="ghost" size="sm" onClick={reset}>Volver a la partida</Button>
          </div>
        )}

        {!isValid ? (
          <div className={`rounded border p-4 text-sm ${error ? 'border-hairline bg-carbon-pink text-fg' : 'border-hairline bg-surface-2 text-fg-muted'}`}>
            {error
              ? `No se pudieron leer las jugadas: ${error}. Puede haber un error de transcripción en el PGN: volvé a pegarlo en «Agregar jugadas».`
              : explorable
                ? 'Arrastrá una pieza o tocá una jugada de los paneles para empezar a explorar una línea.'
                : 'Esta partida no tiene jugadas guardadas para reproducir.'}
          </div>
        ) : (
          <section className="overflow-hidden rounded border border-hairline bg-surface" aria-label="Planilla">
            <header className="flex items-baseline justify-between gap-3 border-b border-hairline-strong px-4 py-3">
              <h3 className="font-serif text-xl font-semibold text-fg">Planilla</h3>
              <span className="font-mono text-xs tabular-nums text-fg-subtle">
                {totalPlies ? `jugada ${Math.ceil(Math.max(ply, 1) / 2)} de ${Math.ceil(totalPlies / 2)}` : 'sin jugadas'}
              </span>
            </header>
            <div ref={moveListRef} className="grid max-h-[320px] grid-cols-[40px_1fr_1fr] overflow-auto">
              {rows.map(row => {
                const whitePly = (row.num - 1) * 2 + 1;
                const blackPly = whitePly + 1;
                return (
                  <Fragment key={row.num}>
                    <span className="select-none border-b border-hairline bg-surface-2 px-2 py-1 text-right font-mono text-[13px] leading-6 tabular-nums text-fg-muted">
                      {row.num}.
                    </span>
                    {moveCell(row.white, whitePly)}
                    {moveCell(row.black, blackPly)}
                  </Fragment>
                );
              })}
            </div>
          </section>
        )}

        {/* You vs Masters — give Masters more room when you barely have any
            games of your own from this position, instead of a half-empty box. */}
        {showExplorer && (
          <div className={`grid grid-cols-1 gap-3 ${personalMoves.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]'}`}>
            <PersonalMoves
              moves={personalMoves}
              playedMove={playedMove}
              onPlay={playMove}
              color={personalColor}
              onColorChange={setPersonalColor}
            />
            <MovesExplorer fen={fen} playedMove={playedMove} onPlayMove={playUci} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameViewer;
