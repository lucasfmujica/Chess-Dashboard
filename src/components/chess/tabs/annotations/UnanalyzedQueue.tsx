import { Badge, Button, Card, CardHeader, ResultMark } from '../../../ui';
import { gameLabel } from '../../../../utils/gameMapping';
import { isOtbGame, REQUIRED_OTB_MOMENTS, CANDIDATE_FATE_QUESTION } from './moments';
import type { Game } from '../../../../types/chess';

interface UnanalyzedQueueProps {
  /** Already filtered and sorted by the caller (`unanalyzedGames`). */
  games: Game[];
  onAnalyze: (game: Game) => void;
}

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
        <CardHeader title="Para analizar" actions={<Badge>0</Badge>} />
        <p className="mt-3 text-sm text-fg-muted">
          Todo analizado: ninguna partida de las últimas dos semanas quedó sin su fila.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Para analizar"
        actions={
          <Badge tone="today">
            <span className="font-mono tabular-nums">{games.length}</span>
          </Badge>
        }
      />
      <p className="mt-3 text-sm text-fg-muted">
        {games.length} partida{games.length > 1 ? 's' : ''} sin analizar. Elegí una y el tablero se abre
        con la partida cargada.
      </p>

      <ul className="mt-3 divide-y divide-hairline border-t border-hairline">
        {games.map(game => (
          <li
            key={game.id ?? `${game.opp}-${game.date}`}
            className="flex items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-fg">{gameLabel(game)}</p>
              {isOtbGame(game) && (
                <p className="mt-0.5 text-xs text-fg-muted">
                  OTB: anotá {REQUIRED_OTB_MOMENTS} momentos y respondé «{CANDIDATE_FATE_QUESTION}»
                </p>
              )}
              {!game.pgn && (
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Sin jugadas guardadas: se puede anotar igual, pero sin tablero.
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ResultMark result={game.result} outline />
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
