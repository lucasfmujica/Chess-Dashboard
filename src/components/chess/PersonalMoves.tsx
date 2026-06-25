import { UserIcon } from '@heroicons/react/24/outline';
import type { PersonalMove } from '../../hooks/useMyRepertoireMoves';

interface PersonalMovesProps {
  moves: PersonalMove[];
  /** Highlight the move actually played in the loaded game. */
  playedMove?: string;
  /** Play this move into the line (navigable tree). */
  onPlay?: (san: string) => void;
}

/**
 * Moves played from the current position across your own games — your moves on
 * your turn, your opponents' replies on theirs — each with your score.
 */
const PersonalMoves = ({ moves, playedMove, onPlay }: PersonalMovesProps) => {
  // At any position it's one side to move, so all rows share `mine`.
  const opponentsTurn = moves.length > 0 && !moves[0].mine;
  return (
  <div className="rounded-lg border border-hairline bg-surface">
    <div className="px-4 py-2.5 border-b border-hairline flex items-center gap-2">
      <UserIcon className="w-5 h-5 text-accent" />
      <h3 className="text-sm font-semibold text-fg">{opponentsTurn ? 'Opponents played' : 'You play'}</h3>
      <span className="text-xs text-fg-subtle">from this position, across your games</span>
    </div>

    {/* The actual move from the game/line you're viewing, so it's always visible
        even when your repertoire has no data for this exact position. */}
    {playedMove && (
      <button
        onClick={() => onPlay?.(playedMove)}
        className={`w-full flex items-center justify-between px-4 py-2 border-b border-hairline text-sm ${onPlay ? 'cursor-pointer hover:bg-surface-2' : ''}`}
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">This game</span>
        <span className="font-medium tabular-nums text-accent">{playedMove}</span>
      </button>
    )}

    {moves.length === 0 ? (
      <p className="px-4 py-3 text-xs text-fg-muted">
        {playedMove
          ? 'None of your other games reached this position — only the move above, from the game you’re viewing.'
          : 'None of your games (with moves) reached this position.'}
      </p>
    ) : (
      <table className="w-full text-sm">
        <tbody className="divide-y divide-hairline">
          {moves.map(m => {
            const isPlayed = playedMove && m.san === playedMove;
            return (
              <tr
                key={m.san}
                onClick={() => onPlay?.(m.san)}
                className={`${onPlay ? 'cursor-pointer' : ''} hover:bg-surface-2 ${isPlayed ? 'bg-accent/10' : ''}`}
              >
                <td className="px-3 py-1.5">
                  <span className={`font-medium tabular-nums ${isPlayed ? 'text-accent' : 'text-fg'}`}>{m.san}</span>
                </td>
                <td className="px-3 py-1.5 text-right text-fg-muted tabular-nums">{m.count}×</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  <span className={m.winRate >= 50 ? 'text-win' : 'text-loss'}>{m.winRate}%</span>
                </td>
                <td className="px-3 py-1.5 text-right text-xs tabular-nums text-fg-subtle">
                  <span className="text-win">{m.wins}</span>/<span className="text-draw">{m.draws}</span>/<span className="text-loss">{m.losses}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
  );
};

export default PersonalMoves;
