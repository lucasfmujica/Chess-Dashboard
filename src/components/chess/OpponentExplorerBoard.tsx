import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { useRivalMoves } from '../../hooks/useMyRepertoireMoves';
import PersonalMoves from './PersonalMoves';
import MovesExplorer from './MovesExplorer';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import { PieceLabel } from '../ui/PieceGlyph';
import type { Game, PlayerColor } from '../../types/chess';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface OpponentExplorerBoardProps {
  /** The rival's own games (their color already relative to their own account). */
  rivalGames: Game[];
  /** Display name for the "X plays" / "X's opponents played" panel copy. */
  rivalName: string;
}

/**
 * Click-to-navigate board for opponent prep: shows what the rival tends to
 * play from a position (their own games) alongside what titled players play
 * (Lichess masters explorer). View-only — navigation only happens by clicking
 * a row in either panel, so those moves are always legal.
 */
const OpponentExplorerBoard = ({ rivalGames, rivalName }: OpponentExplorerBoardProps) => {
  const [fen, setFen] = useState(STARTING_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [color, setColor] = useState<PlayerColor>('W');

  const rivalMoves = useRivalMoves(rivalGames, fen, color);

  const playedMove = undefined; // no "loaded game" context here, unlike GameViewer

  const goTo = (nextFen: string) => {
    setHistory(h => [...h, fen]);
    setFen(nextFen);
  };

  const playSan = (san: string) => {
    try {
      const chess = new Chess(fen);
      const move = chess.move(san);
      if (move) goTo(chess.fen());
    } catch {
      /* illegal — ignore */
    }
  };

  const playUci = (uci: string) => {
    try {
      const chess = new Chess(fen);
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (move) goTo(chess.fen());
    } catch {
      /* illegal — ignore */
    }
  };

  const goBack = () => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFen(prev);
      return h.slice(0, -1);
    });
  };

  const reset = () => {
    setFen(STARTING_FEN);
    setHistory([]);
  };

  const boardOrientation: 'white' | 'black' = color === 'B' ? 'black' : 'white';

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-[420px] flex-shrink-0 space-y-3">
          <div className="rounded-lg overflow-hidden border border-hairline">
            <Chessboard
              options={{
                position: fen,
                boardOrientation,
                allowDragging: false,
                showNotation: true,
                lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
                darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={ArrowUturnLeftIcon} onClick={goBack} disabled={history.length === 0}>
              Back
            </Button>
            <Button variant="secondary" onClick={reset} disabled={fen === STARTING_FEN}>
              Reset
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <SegmentedControl
            aria-label="Rival color"
            value={color}
            onChange={setColor}
            options={[
              { value: 'W', label: <PieceLabel color="W" /> },
              { value: 'B', label: <PieceLabel color="B" /> },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PersonalMoves
              moves={rivalMoves}
              playedMove={playedMove}
              onPlay={playSan}
              color={color}
              onColorChange={setColor}
              subject={rivalName}
            />
            <MovesExplorer fen={fen} onPlayMove={playUci} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentExplorerBoard;
