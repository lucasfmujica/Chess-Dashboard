import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { Button } from '../../../ui';
import { NOTATION_SYMBOLS } from './annotationMeta';
import type { KeyMoment } from '../../../../types/chess';

interface KeyMomentsListProps {
  moments: KeyMoment[];
  onUpdate: (index: number, patch: Partial<KeyMoment>) => void;
  onRemove: (index: number) => void;
  onSetCritical: (index: number) => void;
  onAddBlank: () => void;
  /** Jump the board to a moment. Absent when the annotation has no board. */
  onGoTo?: (ply: number) => void;
}

/**
 * Every point the game turned, in board order.
 *
 * The starred one is the moment the game was decided — the only one that
 * feeds the countable columns. The rest are commentary, which is most of what
 * a post-mortem actually is.
 */
const KeyMomentsList = ({
  moments,
  onUpdate,
  onRemove,
  onSetCritical,
  onAddBlank,
  onGoTo,
}: KeyMomentsListProps) => (
  <div className="rounded-lg border border-hairline bg-surface-2 p-4 space-y-3">
    <div>
      <h4 className="text-sm font-bold text-fg">
        Momentos{moments.length > 0 && ` (${moments.length})`}
      </h4>
      <p className="text-xs text-fg-muted mt-0.5">
        Agregá uno por cada punto donde la partida giró, con «Agregar momento» desde el tablero.
        Marcá con ★ el que la decidió: ese es el que después se puede contar.
      </p>
    </div>

    {moments.length === 0 ? (
      <p className="text-sm text-fg-subtle">
        Todavía no anotaste ningún momento.
      </p>
    ) : (
      <ul className="space-y-2">
        {moments.map((moment, idx) => (
          <li
            key={idx}
            className={`rounded-lg border p-3 space-y-2 ${
              moment.critical ? 'border-accent/40 bg-accent/5' : 'border-hairline bg-surface'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSetCritical(idx)}
                aria-label={
                  moment.critical ? 'Momento decisivo' : 'Marcar como el momento decisivo'
                }
                title="El momento que decidió la partida"
                aria-pressed={!!moment.critical}
                className={`p-1 rounded transition-colors ${
                  moment.critical ? 'text-draw' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                {moment.critical ? (
                  <StarSolid className="w-5 h-5" />
                ) : (
                  <StarOutline className="w-5 h-5" />
                )}
              </button>

              {moment.ply !== undefined ? (
                <span className="font-mono text-sm font-semibold text-fg">{moment.move}</span>
              ) : (
                <input
                  type="text"
                  aria-label="Jugada"
                  placeholder="Ej: 15.Nxe5"
                  value={moment.move}
                  onChange={e => onUpdate(idx, { move: e.target.value })}
                  className="w-32 px-3 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent"
                />
              )}

              <select
                aria-label="Símbolo"
                value={moment.symbol || ''}
                onChange={e => onUpdate(idx, { symbol: e.target.value })}
                className="px-2 py-1.5 bg-surface border border-hairline text-fg rounded-lg text-sm focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">—</option>
                {NOTATION_SYMBOLS.map(s => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} {s.label}
                  </option>
                ))}
              </select>

              {moment.bestMove && (
                <span className="text-xs text-fg-muted">
                  motor: <span className="font-mono text-fg">{moment.bestMove}</span>
                </span>
              )}

              <div className="ml-auto flex items-center gap-1">
                {onGoTo && moment.ply !== undefined && (
                  <button
                    onClick={() => onGoTo(moment.ply as number)}
                    className="px-2 py-1 rounded-md text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                  >
                    Ver en el tablero
                  </button>
                )}
                <button
                  onClick={() => onRemove(idx)}
                  aria-label="Borrar momento"
                  className="p-1.5 text-loss hover:bg-loss/10 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              aria-label={`Comentario de ${moment.move || 'este momento'}`}
              placeholder="¿Qué pasó acá? ¿Qué no viste?"
              value={moment.comment || ''}
              onChange={e => onUpdate(idx, { comment: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg text-sm focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </li>
        ))}
      </ul>
    )}

    <Button icon={PlusIcon} size="sm" onClick={onAddBlank}>
      Momento a mano
    </Button>
  </div>
);

export default KeyMomentsList;
