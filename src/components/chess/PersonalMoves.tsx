import { UserIcon } from '@heroicons/react/24/outline';
import type { PersonalMove } from '../../hooks/useMyRepertoireMoves';

interface PersonalMovesProps {
  moves: PersonalMove[];
  /** Highlight the move actually played in the loaded game. */
  playedMove?: string;
  /** Play this move into the line (navigable tree). */
  onPlay?: (san: string) => void;
}

/** What YOU have played from the current position, across your own games. */
const PersonalMoves = ({ moves, playedMove, onPlay }: PersonalMovesProps) => (
  <div className="rounded-lg border border-hairline bg-surface">
    <div className="px-4 py-2.5 border-b border-hairline flex items-center gap-2">
      <UserIcon className="w-5 h-5 text-accent" />
      <h3 className="text-sm font-semibold text-fg">You play</h3>
    </div>
    {moves.length === 0 ? (
      <p className="px-4 py-3 text-xs text-fg-muted">
        You haven’t reached this position in your own games (with moves) yet.
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

export default PersonalMoves;
