import { useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../ui';
import { plyLabel } from './moments';
import type { BoardPosition } from '../../GameViewer';
import type { KeyMoment } from '../../../../types/chess';
import type { MoveQuality } from '../../../../engine/analyzeGame';

interface CaptureMomentPanelProps {
  position: BoardPosition;
  /** Plies already recorded, so the button can say so instead of duplicating. */
  recordedPlies: number[];
  onCapture: (moment: KeyMoment) => void;
  /** Hands the board's navigation to the form, so the moment list can jump. */
  onNavigate: (goTo: (ply: number) => void) => void;
}

const QUALITY_SUFFIX: Partial<Record<MoveQuality, string>> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
};

/**
 * Records a moment straight off the board.
 *
 * Appends rather than overwrites: a game is annotated by commenting at every
 * point it turned, not at one. Which of those is *the* decisive one is chosen
 * afterwards, in the list.
 */
const CaptureMomentPanel = ({
  position,
  recordedPlies,
  onCapture,
  onNavigate,
}: CaptureMomentPanelProps) => {
  const { fen, ply, playedSan, bestSan, playedQuality, cpLoss, worstPly, goTo } = position;
  const suffix = playedQuality ? QUALITY_SUFFIX[playedQuality] : undefined;
  const alreadyRecorded = recordedPlies.includes(ply);

  // `goTo` is stable for the life of the replay, so this runs once per game.
  useEffect(() => onNavigate(goTo), [goTo, onNavigate]);

  return (
    <section className="space-y-2 rounded border border-hairline border-t-[3px] border-t-hairline-strong bg-surface p-4" aria-label="Anotar esta posición">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-label">Anotar esta posición</h4>
        {worstPly !== undefined && (
          <button
            onClick={() => goTo(worstPly)}
            className="text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Ir a mi peor jugada
          </button>
        )}
      </div>

      <p className="text-sm text-fg-muted">
        {playedSan ? (
          <>
            Desde acá jugaste{' '}
            <span className="font-serif text-base text-fg">
              {playedSan}
              {suffix && <span className="font-sans font-semibold text-loss">{suffix}</span>}
            </span>
            {cpLoss !== undefined && cpLoss > 0 && (
              <span className="font-mono text-xs tabular-nums text-fg-subtle"> (−{(cpLoss / 100).toFixed(1)})</span>
            )}
            {bestSan && (
              <>
                {' · motor: '}
                <span className="font-serif text-base text-fg">{bestSan}</span>
              </>
            )}
          </>
        ) : (
          'Estás en la posición final: retrocedé una jugada para anotar un momento.'
        )}
      </p>

      <Button
        variant="primary"
        size="sm"
        icon={PlusIcon}
        disabled={!playedSan || alreadyRecorded}
        onClick={() =>
          onCapture({
            move: plyLabel(ply, playedSan ?? ''),
            symbol: suffix ?? '',
            comment: '',
            fen,
            ply,
            bestMove: bestSan,
          })
        }
      >
        {alreadyRecorded ? 'Ya anotada' : 'Agregar momento'}
      </Button>

      {playedSan && !bestSan && (
        <p className="text-xs text-fg-subtle">
          Prendé el motor abajo (o analizá la partida entera) para que cada momento guarde también
          la mejor jugada.
        </p>
      )}
    </section>
  );
};

export default CaptureMomentPanel;
