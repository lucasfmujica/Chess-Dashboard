import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import ResultMark from '../ui/ResultMark';
import { boardSquareStyles } from './boardTheme';
import BoardFrame from './BoardFrame';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useGames } from '../../context/GamesContext';
import { parsePgn } from '../../hooks/useGameReplay';
import { getCachedAnalysis } from '../../hooks/useGameAnalysis';
import type { MoveQuality } from '../../engine/analyzeGame';

interface EndgameContinuationReplayProps {
  gameId: string;
  /** Ply of the snapshot the continuation starts from. */
  fromPly: number;
  orientation: 'white' | 'black';
}

const QUALITY_META: Partial<Record<MoveQuality, { sym: string; cls: string }>> = {
  blunder: { sym: '??', cls: 'text-loss' },
  mistake: { sym: '?', cls: 'text-fg-muted' },
  inaccuracy: { sym: '?!', cls: 'text-fg-subtle' },
};

/**
 * Steps through the actual remaining moves of the source game from an
 * endgame snapshot to the end — the real continuation IS the answer key
 * (did the player hold/convert it?), so no separate grading is needed.
 */
const EndgameContinuationReplay = ({ gameId, fromPly, orientation }: EndgameContinuationReplayProps) => {
  const { games } = useGames();
  const game = games.find(g => g.id === gameId);
  const { fens, sans } = useMemo(() => parsePgn(game?.pgn), [game?.pgn]);
  const analysis = getCachedAnalysis(game?.pgn);

  const [offset, setOffset] = useState(0); // 0 = snapshot position, up to sans.length - fromPly
  useEffect(() => setOffset(0), [gameId, fromPly]);

  const ply = fromPly + offset;
  const totalSteps = sans.length - fromPly;
  const fen = fens[ply] ?? fens[fens.length - 1];
  const lastSan = offset > 0 ? sans[ply - 1] : undefined;
  const quality = offset > 0 ? analysis?.moves[ply - 1]?.quality : undefined;
  const meta = quality ? QUALITY_META[quality] : undefined;

  if (!game) return <p className="text-sm text-loss">No se encontró la partida de origen (puede haberse borrado).</p>;

  return (
    <div>
      <BoardFrame>
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: false,
            showNotation: true,
            ...boardSquareStyles,
          }}
        />
      </BoardFrame>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setOffset(o => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="flex items-center justify-center w-9 h-9 rounded border border-hairline bg-surface text-fg-muted hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Jugada anterior"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="min-w-[90px] text-center font-mono text-sm text-fg-muted tabular-nums">
          {offset} / {totalSteps}
        </span>
        <button
          onClick={() => setOffset(o => Math.min(totalSteps, o + 1))}
          disabled={offset >= totalSteps}
          className="flex items-center justify-center w-9 h-9 rounded border border-hairline bg-surface text-fg-muted hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Jugada siguiente"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
      {lastSan && (
        <p className="mt-2 text-center font-serif text-base text-fg">
          {lastSan}
          {meta && <sup className={`ml-1 font-bold ${meta.cls}`}>{meta.sym}</sup>}
        </p>
      )}
      {offset === totalSteps && (
        <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-fg-muted">
          Resultado final: <ResultMark result={game.result} />
        </p>
      )}
      {!analysis && (
        <p className="mt-2 text-center text-xs text-fg-subtle">
          Analizá esta partida en el tablero de análisis para ver la calidad de cada jugada de la continuación.
        </p>
      )}
    </div>
  );
};

export default EndgameContinuationReplay;
