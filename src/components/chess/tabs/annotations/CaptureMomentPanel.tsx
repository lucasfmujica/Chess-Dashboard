import { Button } from '../../../ui';
import type { BoardPosition } from '../../GameViewer';
import type { MoveQuality } from '../../../../engine/analyzeGame';

/** What the board hands back to the form when the moment is recorded. */
export interface CapturedMoment {
  criticalMomentFen: string;
  playedMove?: string;
  bestMove?: string;
}

interface CaptureMomentPanelProps {
  position: BoardPosition;
  onUse: (moment: CapturedMoment) => void;
}

const QUALITY_SUFFIX: Partial<Record<MoveQuality, string>> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
};

/**
 * Records the position the game turned on, straight off the board.
 *
 * This exists because the three fields it fills — critical FEN, your move, the
 * engine's — used to be typed by hand from a board in a different tab, which is
 * the step that made writing a post-mortem feel impossible.
 */
const CaptureMomentPanel = ({ position, onUse }: CaptureMomentPanelProps) => {
  const { playedSan, bestSan, playedQuality, cpLoss, worstPly, goTo } = position;
  const suffix = playedQuality ? QUALITY_SUFFIX[playedQuality] : undefined;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-fg">Momento crítico</h4>
        {worstPly !== undefined && (
          <button
            onClick={() => goTo(worstPly)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Ir a mi peor jugada
          </button>
        )}
      </div>

      <p className="text-xs text-fg-muted">
        {playedSan ? (
          <>
            Desde esta posición jugaste{' '}
            <span className="font-mono font-semibold text-fg">
              {playedSan}
              {suffix && <span className="text-loss">{suffix}</span>}
            </span>
            {cpLoss !== undefined && cpLoss > 0 && (
              <span className="text-fg-subtle"> (−{(cpLoss / 100).toFixed(1)})</span>
            )}
            {bestSan && (
              <>
                {' · motor: '}
                <span className="font-mono font-semibold text-fg">{bestSan}</span>
              </>
            )}
          </>
        ) : (
          'Estás en la posición final: retrocedé una jugada para marcar dónde se decidió.'
        )}
      </p>

      <Button variant="primary" size="sm" disabled={!playedSan} onClick={() =>
        onUse({
          criticalMomentFen: position.fen,
          playedMove: playedSan,
          bestMove: bestSan,
        })
      }>
        Usar esta posición
      </Button>

      {playedSan && !bestSan && (
        <p className="text-xs text-fg-subtle">
          Prendé el motor abajo (o analizá la partida entera) para que también se llene «la mejor».
        </p>
      )}
    </div>
  );
};

export default CaptureMomentPanel;
