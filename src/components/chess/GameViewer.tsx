import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/solid';
import { CpuChipIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useGameReplay } from '../../hooks/useGameReplay';
import { useGameAnalysis } from '../../hooks/useGameAnalysis';
import { useEngineSettings } from '../../hooks/useEngineSettings';
import { useLocalEngine } from '../../hooks/useLocalEngine';
import { useMyRepertoireMoves } from '../../hooks/useMyRepertoireMoves';
import { useOpeningName } from '../../utils/openings';
import { downloadFile } from '../../utils/exportUtils';
import type { MoveQuality } from '../../engine/analyzeGame';
import MovesExplorer from './MovesExplorer';
import EngineLines from './EngineLines';
import PersonalMoves from './PersonalMoves';
import EvalGraph from '../charts/EvalGraph';

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
}

const QUALITY_META: Partial<Record<MoveQuality, { sym: string; cls: string }>> = {
  blunder: { sym: '??', cls: 'text-loss' },
  mistake: { sym: '?', cls: 'text-draw' },
  inaccuracy: { sym: '?!', cls: 'text-fg-subtle' },
};

const winPct = (cp: number): number => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

const formatEval = (cp: number): string => {
  if (Math.abs(cp) >= 9000) return cp > 0 ? '#' : '-#';
  const v = cp / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
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
    className="flex items-center justify-center w-10 h-9 rounded-md border border-hairline bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

const GameViewer = ({
  pgn,
  orientation = 'white',
  white,
  black,
  result,
  showExplorer = false,
  showEngine = false,
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
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Home') { e.preventDefault(); first(); }
      else if (e.key === 'End') { e.preventDefault(); last(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, first, last]);

  useEffect(() => {
    const el = moveListRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
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

  // Board arrows: engine best (green) + your move (muted).
  const arrows = useMemo(() => {
    const list: { startSquare: string; endSquare: string; color: string }[] = [];
    const best = engineState.lines[0]?.firstUci;
    if (showEngine && engineOn && best && best.length >= 4) {
      list.push({ startSquare: best.slice(0, 2), endSquare: best.slice(2, 4), color: 'rgba(16,185,129,0.65)' });
    }
    if (playedUci) {
      list.push({ startSquare: playedUci.slice(0, 2), endSquare: playedUci.slice(2, 4), color: 'rgba(100,116,139,0.55)' });
    }
    return list;
  }, [engineState.lines, showEngine, engineOn, playedUci]);

  // Eval bar — only valid on mainline positions the full-game analysis covers.
  const evalAvailable = !!analysis && (!isVariation || ply <= variationStart) && analysis.evals[ply] !== undefined;
  const currentEval = evalAvailable ? analysis!.evals[ply] : 0;
  const whiteFraction = evalAvailable ? winPct(currentEval) / 100 : 0.5;
  const flip = boardOrientation === 'black';
  const whiteWinning = currentEval >= 0;
  const labelAtBottom = whiteWinning !== flip;
  const isMate = Math.abs(currentEval) >= 9000;
  const evalLabel = isMate ? '#' : (Math.abs(currentEval) / 100).toFixed(1);

  const moveButton = (san: string, plyNum: number) => {
    const isVar = isVariation && plyNum - 1 >= variationStart;
    const q = isVar ? undefined : analysis?.moves[plyNum - 1]?.quality;
    const meta = q ? QUALITY_META[q] : undefined;
    return (
      <button
        data-active={ply === plyNum}
        onClick={() => goTo(plyNum)}
        className={`px-2 py-0.5 rounded font-medium tabular-nums transition-colors ${
          ply === plyNum ? 'bg-accent/15 text-accent' : isVar ? 'text-fg-muted italic hover:bg-surface-2' : 'text-fg hover:bg-surface-2'
        }`}
        title={isVar ? 'Variation move' : undefined}
      >
        {san}
        {meta && <sup className={`ml-0.5 font-bold ${meta.cls}`}>{meta.sym}</sup>}
      </button>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Board + eval bar + controls */}
      <div className="w-full lg:w-[460px] flex-shrink-0">
        <div className="flex gap-2">
          {/* Eval bar */}
          <div
            className="relative w-7 rounded-md overflow-hidden border border-hairline bg-slate-900"
            title={analysis ? `Evaluation ${formatEval(currentEval)} (White's perspective)` : 'Run analysis to see the evaluation'}
          >
            <div
              className="absolute left-0 right-0 bg-white transition-all duration-200"
              style={flip ? { top: 0, height: `${whiteFraction * 100}%` } : { bottom: 0, height: `${whiteFraction * 100}%` }}
            />
            {evalAvailable && (
              <span
                className={`absolute left-0 right-0 text-center text-[10px] font-bold tabular-nums leading-none ${whiteWinning ? 'text-slate-900' : 'text-white'}`}
                style={labelAtBottom ? { bottom: 3 } : { top: 3 }}
              >
                {evalLabel}
              </span>
            )}
          </div>

          <div className="flex-1 rounded-lg overflow-hidden border border-hairline">
            <Chessboard
              options={{
                position: fen,
                boardOrientation,
                allowDragging: explorable,
                showNotation: true,
                animationDurationInMs: 150,
                arrows,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? playMove({ from: sourceSquare, to: targetSquare, promotion: 'q' }) : false,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <ControlButton onClick={() => setFlipped(f => !f)} label="Flip board">
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
              label="Download PGN"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </ControlButton>
          )}
          <ControlButton onClick={first} disabled={ply === 0} label="First move">
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={prev} disabled={ply === 0} label="Previous move">
            <ChevronLeftIcon className="w-4 h-4" />
          </ControlButton>
          <span className="min-w-[64px] text-center text-sm text-fg-muted tabular-nums">
            {ply} / {totalPlies}
          </span>
          <ControlButton onClick={next} disabled={ply >= totalPlies} label="Next move">
            <ChevronRightIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={last} disabled={ply >= totalPlies} label="Last move">
            <ChevronDoubleRightIcon className="w-4 h-4" />
          </ControlButton>
        </div>
        <p className="mt-2 text-center text-xs text-fg-subtle">Use ← → to step, Home/End to jump</p>
      </div>

      {/* Right column: analysis, engine, compare, eval graph, move list */}
      <div className="flex-1 min-w-0 space-y-3">
        {(white || black) && (
          <div className="text-sm">
            <span className="font-semibold text-fg">{white || 'White'}</span>
            <span className="text-fg-subtle"> vs </span>
            <span className="font-semibold text-fg">{black || 'Black'}</span>
            {result && <span className="ml-2 text-fg-muted tabular-nums">{result}</span>}
          </div>
        )}

        {/* Live opening name for the current position (offline dataset). */}
        {opening && (
          <div className="text-xs text-fg-muted">
            <span className="font-medium text-fg-subtle tabular-nums">{opening.eco}</span>
            {opening.eco && ' · '}
            {opening.name}
          </div>
        )}

        {/* Full-game analysis (accuracy / blunders) */}
        {isValid && (
          <div className="rounded-lg border border-hairline bg-surface-2 p-3">
            {!analysis && !analyzing && (
              <button
                onClick={analyze}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-fg text-app text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <CpuChipIcon className="w-4 h-4" />
                Analyze with Stockfish
              </button>
            )}
            {analyzing && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <span className="text-xs text-fg-muted tabular-nums">{Math.round(progress * 100)}%</span>
                <button onClick={cancel} className="text-xs text-fg-muted hover:text-fg">Cancel</button>
              </div>
            )}
            {analysisError && <p className="text-xs text-loss">{analysisError}</p>}
            {analysis && !analyzing && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="text-fg-muted">Accuracy</span>
                <span className="text-fg tabular-nums">⚪ {analysis.accuracyWhite}%</span>
                <span className="text-fg tabular-nums">⚫ {analysis.accuracyBlack}%</span>
                <span className="text-loss tabular-nums">{analysis.blunders} blunders</span>
                <span className="text-draw tabular-nums">{analysis.mistakes} mistakes</span>
                <span className="text-fg-subtle tabular-nums">{analysis.inaccuracies} inaccuracies</span>
                <span className="text-fg-subtle text-xs">depth {analysis.depth}</span>
              </div>
            )}
          </div>
        )}

        {/* Whole-game evaluation curve (mainline only) */}
        {analysis && !isVariation && <EvalGraph evals={analysis.evals} ply={ply} onSelect={goTo} />}

        {/* Live engine */}
        {showEngine && (
          <EngineLines
            state={engineState}
            enabled={engineOn}
            onToggle={() => setEngineOn(o => !o)}
            settings={settings}
            setSettings={setSettings}
            onPlay={playUci}
          />
        )}

        {/* You vs Masters */}
        {showExplorer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {isVariation && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
            <span className="text-accent">You’re exploring a variation.</span>
            <button onClick={reset} className="font-medium text-accent hover:underline">← Back to game</button>
          </div>
        )}

        {!isValid ? (
          <div className={`rounded-lg border p-4 text-sm ${error ? 'border-loss/40 bg-loss/10 text-loss' : 'border-hairline bg-surface-2 text-fg-muted'}`}>
            {error
              ? `Couldn’t read this game’s moves: ${error}. The PGN may have a transcription error — re-paste it via “Add moves to a game”.`
              : explorable
                ? 'Drag a piece or click a move from the panels above to start exploring a line.'
                : 'This game has no recorded moves to replay.'}
          </div>
        ) : (
          <div ref={moveListRef} className="rounded-lg border border-hairline bg-surface max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {rows.map(row => {
                  const whitePly = (row.num - 1) * 2 + 1;
                  const blackPly = whitePly + 1;
                  return (
                    <tr key={row.num} className="border-b border-hairline last:border-0">
                      <td className="w-10 px-3 py-1.5 text-fg-subtle tabular-nums select-none">{row.num}.</td>
                      <td className="px-2 py-1">{row.white && moveButton(row.white, whitePly)}</td>
                      <td className="px-2 py-1">{row.black && moveButton(row.black, blackPly)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameViewer;
