import { useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { useGameReplay } from '../../hooks/useGameReplay';
import { useGameAnalysis } from '../../hooks/useGameAnalysis';
import type { MoveQuality } from '../../engine/analyzeGame';

interface GameViewerProps {
  pgn?: string;
  orientation?: 'white' | 'black';
  white?: string;
  black?: string;
  result?: string;
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

const GameViewer = ({ pgn, orientation = 'white', white, black, result }: GameViewerProps) => {
  const replay = useGameReplay(pgn);
  const { fen, fens, sans, ply, totalPlies, isValid, error, goTo, next, prev, first, last } = replay;
  const { analysis, analyzing, progress, error: analysisError, analyze, cancel } = useGameAnalysis(pgn, fens);
  const moveListRef = useRef<HTMLDivElement>(null);

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

  // Eval bar: white advantage fraction for the current position.
  const currentEval = analysis ? analysis.evals[ply] ?? 0 : 0;
  const whiteFraction = analysis ? winPct(currentEval) / 100 : 0.5;
  const barWhitePct = orientation === 'white' ? whiteFraction * 100 : (1 - whiteFraction) * 100;

  const moveButton = (san: string, plyNum: number) => {
    const q = analysis?.moves[plyNum - 1]?.quality;
    const meta = q ? QUALITY_META[q] : undefined;
    return (
      <button
        data-active={ply === plyNum}
        onClick={() => goTo(plyNum)}
        className={`px-2 py-0.5 rounded font-medium tabular-nums transition-colors ${
          ply === plyNum ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-surface-2'
        }`}
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
            className="relative w-3 rounded-full overflow-hidden border border-hairline bg-slate-900"
            title={analysis ? `Eval ${formatEval(currentEval)}` : 'Run analysis to see evaluation'}
          >
            <div className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-200" style={{ height: `${barWhitePct}%` }} />
          </div>

          <div className="flex-1 rounded-lg overflow-hidden border border-hairline">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: orientation,
                allowDragging: false,
                showNotation: true,
                animationDurationInMs: 150,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <ControlButton onClick={first} disabled={ply === 0} label="First move">
            <ChevronDoubleLeftIcon className="w-4 h-4" />
          </ControlButton>
          <ControlButton onClick={prev} disabled={ply === 0} label="Previous move">
            <ChevronLeftIcon className="w-4 h-4" />
          </ControlButton>
          <span className="min-w-[70px] text-center text-sm text-fg-muted tabular-nums">
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

      {/* Move list / analysis */}
      <div className="flex-1 min-w-0">
        {(white || black) && (
          <div className="mb-3 text-sm">
            <span className="font-semibold text-fg">{white || 'White'}</span>
            <span className="text-fg-subtle"> vs </span>
            <span className="font-semibold text-fg">{black || 'Black'}</span>
            {result && <span className="ml-2 text-fg-muted tabular-nums">{result}</span>}
          </div>
        )}

        {/* Analysis panel */}
        {isValid && (
          <div className="mb-3 rounded-lg border border-hairline bg-surface-2 p-3">
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

        {!isValid ? (
          <div className="rounded-lg border border-hairline bg-surface-2 p-4 text-sm text-fg-muted">
            {error || 'This game has no recorded moves to replay.'}
          </div>
        ) : (
          <div ref={moveListRef} className="rounded-lg border border-hairline bg-surface max-h-[420px] overflow-y-auto">
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
