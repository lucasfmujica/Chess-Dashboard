import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { Button } from '../../../ui';
import { NOTATION_SYMBOLS } from './annotationMeta';
import { CANDIDATE_FATE_QUESTION } from './moments';
import type { KeyMoment } from '../../../../types/chess';

interface KeyMomentsListProps {
  moments: KeyMoment[];
  onUpdate: (index: number, patch: Partial<KeyMoment>) => void;
  onRemove: (index: number) => void;
  onSetCritical: (index: number) => void;
  onAddBlank: () => void;
  /** Jump the board to a moment. Absent when the annotation has no board. */
  onGoTo?: (ply: number) => void;
  /** OTB games: put the candidate question on every moment. */
  askCandidateFate?: boolean;
}

const FATE_OPTIONS: { value: NonNullable<KeyMoment['candidateFate']>; label: string }[] = [
  { value: 'rejected', label: 'La descarté' },
  { value: 'missed', label: 'No se me ocurrió' },
];

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
  askCandidateFate = false,
}: KeyMomentsListProps) => (
  <section className="space-y-3 rounded border border-hairline bg-surface p-4 sm:p-5" aria-labelledby="key-moments-title">
    <div className="border-b border-hairline pb-3">
      <h4 id="key-moments-title" className="font-serif text-xl font-semibold leading-tight text-fg">
        Momentos
        {moments.length > 0 && <span className="ml-2 font-mono text-sm font-normal text-fg-subtle">{moments.length}</span>}
      </h4>
      <p className="mt-1 text-xs text-fg-muted">
        Agregá uno por cada punto donde la partida giró, con «Agregar momento» desde el tablero.
        Marcá con ★ el que la decidió: ese es el que después se puede contar.
      </p>
    </div>

    {moments.length === 0 ? (
      <p className="text-sm text-fg-subtle">
        Todavía no anotaste ningún momento.
      </p>
    ) : (
      <ul className="divide-y divide-hairline border-y border-hairline">
        {moments.map((moment, idx) => (
          <li
            key={idx}
            className={`space-y-2 px-2 py-3 ${moment.critical ? 'bg-carbon' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onSetCritical(idx)}
                aria-label={
                  moment.critical ? 'Momento decisivo' : 'Marcar como el momento decisivo'
                }
                title="El momento que decidió la partida"
                aria-pressed={!!moment.critical}
                className={`rounded p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  moment.critical ? 'text-fg' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                {moment.critical ? (
                  <StarSolid className="w-5 h-5" />
                ) : (
                  <StarOutline className="w-5 h-5" />
                )}
              </button>

              {moment.ply !== undefined ? (
                <span className="font-serif text-base text-fg">{moment.move}</span>
              ) : (
                <input
                  type="text"
                  aria-label="Jugada"
                  placeholder="Ej: 15.Nxe5"
                  value={moment.move}
                  onChange={e => onUpdate(idx, { move: e.target.value })}
                  className="h-8 w-32 rounded border border-hairline bg-surface px-2.5 font-serif text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              )}

              <select
                aria-label="Símbolo"
                value={moment.symbol || ''}
                onChange={e => onUpdate(idx, { symbol: e.target.value })}
                className="h-8 rounded border border-hairline bg-surface px-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
                  motor: <span className="font-serif text-sm text-fg">{moment.bestMove}</span>
                </span>
              )}

              <div className="ml-auto flex items-center gap-1">
                {onGoTo && moment.ply !== undefined && (
                  <button
                    onClick={() => onGoTo(moment.ply as number)}
                    className="rounded px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Ver en el tablero
                  </button>
                )}
                <button
                  onClick={() => onRemove(idx)}
                  aria-label="Borrar momento"
                  className="rounded p-1.5 text-loss transition-colors hover:bg-carbon-pink/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {askCandidateFate && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">{CANDIDATE_FATE_QUESTION}</legend>
                <span className="text-xs text-fg-muted" aria-hidden="true">
                  {CANDIDATE_FATE_QUESTION}
                </span>
                <div className="inline-flex gap-1 rounded border border-hairline bg-surface p-1">
                  {FATE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={`px-2.5 py-1 rounded-sm text-xs font-medium cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${
                        moment.candidateFate === opt.value
                          ? 'bg-accent text-accent-fg'
                          : 'text-fg-muted hover:bg-surface-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`candidate-fate-${idx}`}
                        value={opt.value}
                        checked={moment.candidateFate === opt.value}
                        onChange={() => onUpdate(idx, { candidateFate: opt.value })}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <input
              type="text"
              aria-label={`Comentario de ${moment.move || 'este momento'}`}
              placeholder="¿Qué pasó acá? ¿Qué no viste?"
              value={moment.comment || ''}
              onChange={e => onUpdate(idx, { comment: e.target.value })}
              className="w-full rounded border border-hairline bg-surface px-3 py-2 font-serif text-[15px] italic text-accent placeholder:not-italic placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </li>
        ))}
      </ul>
    )}

    <Button icon={PlusIcon} size="sm" onClick={onAddBlank}>
      Momento a mano
    </Button>
  </section>
);

export default KeyMomentsList;
