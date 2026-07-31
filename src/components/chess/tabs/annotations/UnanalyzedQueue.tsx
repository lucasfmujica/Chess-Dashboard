import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, resultTone } from '../../../ui';
import { gameLabel } from '../../../../utils/gameMapping';
import type { Game } from '../../../../types/chess';

interface UnanalyzedQueueProps {
  /** Already filtered and sorted by the caller (`unanalyzedGames`). */
  games: Game[];
  onAnalyze: (game: Game) => void;
}

const RESULT_LABEL: Record<Game['result'], string> = { W: 'Ganada', D: 'Tablas', L: 'Perdida' };

/**
 * The games still owing a post-mortem, at the top of the library.
 *
 * This is the entry point the training program assumes exists: a game isn't
 * finished until it has a row here, so the ones that don't should be the first
 * thing the tab shows rather than something to be remembered.
 */
const UnanalyzedQueue = ({ games, onAnalyze }: UnanalyzedQueueProps) => {
  if (games.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-win shrink-0" />
          <div>
            <h3 className="text-fg font-medium">Todo analizado</h3>
            <p className="text-sm text-fg-muted">
              Ninguna partida de las últimas dos semanas quedó sin su fila.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-fg font-medium">
        {games.length} partida{games.length > 1 ? 's' : ''} sin analizar
      </h3>
      <p className="text-sm text-fg-muted mt-1">
        Elegí una y el tablero se abre abajo con la partida cargada.
      </p>

      <ul className="mt-3 divide-y divide-hairline">
        {games.map(game => (
          <li
            key={game.id ?? `${game.opp}-${game.date}`}
            className="flex flex-wrap items-center justify-between gap-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-fg truncate">{gameLabel(game)}</p>
              {!game.pgn && (
                <p className="text-xs text-fg-subtle mt-0.5">
                  Sin jugadas guardadas — se puede anotar igual, pero sin tablero.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={resultTone(game.result)}>{RESULT_LABEL[game.result]}</Badge>
              <Button variant="primary" size="sm" onClick={() => onAnalyze(game)}>
                Analizar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default UnanalyzedQueue;
