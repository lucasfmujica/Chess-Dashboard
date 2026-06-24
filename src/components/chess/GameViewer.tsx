import { useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';
import { useGameReplay } from '../../hooks/useGameReplay';

interface GameViewerProps {
  pgn?: string;
  orientation?: 'white' | 'black';
  white?: string;
  black?: string;
  result?: string;
}

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

/**
 * Reusable board + move-list replay viewer for a single game's PGN.
 * Keyboard: Left/Right step, Home/End jump to start/end.
 */
const GameViewer = ({ pgn, orientation = 'white', white, black, result }: GameViewerProps) => {
  const replay = useGameReplay(pgn);
  const { fen, sans, ply, totalPlies, isValid, error, goTo, next, prev, first, last } = replay;
  const moveListRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
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

  // Keep the active move visible
  useEffect(() => {
    const el = moveListRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [ply]);

  // Build move-pair rows for the list
  const rows: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ num: i / 2 + 1, white: sans[i], black: sans[i + 1] });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Board + controls */}
      <div className="w-full lg:w-[420px] flex-shrink-0">
        <div className="rounded-lg overflow-hidden border border-hairline">
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

      {/* Move list / metadata */}
      <div className="flex-1 min-w-0">
        {(white || black) && (
          <div className="mb-3 text-sm">
            <span className="font-semibold text-fg">{white || 'White'}</span>
            <span className="text-fg-subtle"> vs </span>
            <span className="font-semibold text-fg">{black || 'Black'}</span>
            {result && <span className="ml-2 text-fg-muted tabular-nums">{result}</span>}
          </div>
        )}

        {!isValid ? (
          <div className="rounded-lg border border-hairline bg-surface-2 p-4 text-sm text-fg-muted">
            {error || 'This game has no recorded moves to replay.'}
          </div>
        ) : (
          <div
            ref={moveListRef}
            className="rounded-lg border border-hairline bg-surface max-h-[460px] overflow-y-auto"
          >
            <table className="w-full text-sm">
              <tbody>
                {rows.map(row => {
                  const whitePly = (row.num - 1) * 2 + 1;
                  const blackPly = whitePly + 1;
                  return (
                    <tr key={row.num} className="border-b border-hairline last:border-0">
                      <td className="w-10 px-3 py-1.5 text-fg-subtle tabular-nums select-none">{row.num}.</td>
                      <td className="px-2 py-1">
                        {row.white && (
                          <button
                            data-active={ply === whitePly}
                            onClick={() => goTo(whitePly)}
                            className={`px-2 py-0.5 rounded font-medium tabular-nums transition-colors ${
                              ply === whitePly ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-surface-2'
                            }`}
                          >
                            {row.white}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {row.black && (
                          <button
                            data-active={ply === blackPly}
                            onClick={() => goTo(blackPly)}
                            className={`px-2 py-0.5 rounded font-medium tabular-nums transition-colors ${
                              ply === blackPly ? 'bg-accent/15 text-accent' : 'text-fg hover:bg-surface-2'
                            }`}
                          >
                            {row.black}
                          </button>
                        )}
                      </td>
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
