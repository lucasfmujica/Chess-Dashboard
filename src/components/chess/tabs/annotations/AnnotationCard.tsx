import { PencilIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Badge, Card } from '../../../ui';
import { TAGS, errorTypeLabel } from './annotationMeta';
import type { AnnotatedGame } from '../../../../types/chess';

interface AnnotationCardProps {
  annotation: AnnotatedGame;
  onEdit: (annotation: AnnotatedGame) => void;
  onDelete: (id: string) => void;
}

const ICON_BUTTON =
  'rounded p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

const AnnotationCard = ({ annotation, onEdit, onDelete }: AnnotationCardProps) => (
  <Card interactive className="space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="break-words font-serif text-xl font-semibold leading-tight text-fg">{annotation.gameName}</h4>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
          {annotation.date && <span className="font-mono text-xs tabular-nums">{annotation.date}</span>}
          {annotation.result && <span className="font-mono tabular-nums text-fg">{annotation.result}</span>}
          {annotation.rating && (
            <span className="flex items-center gap-0.5" aria-label={`Valoración ${annotation.rating} de 5`}>
              {Array.from({ length: annotation.rating }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4 text-fg-muted" fill="currentColor" aria-hidden="true" />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {/* Editing is also how you replay it: the form carries the board. */}
        <button
          onClick={() => onEdit(annotation)}
          aria-label="Abrir y editar"
          title="Abrir en el tablero"
          className={`${ICON_BUTTON} text-accent hover:bg-accent/10`}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onDelete(annotation.id)}
          aria-label="Borrar análisis"
          className={`${ICON_BUTTON} text-loss hover:bg-carbon-pink/60`}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>

    {(annotation.errorType || annotation.lesson) && (
      <div className="border-t border-hairline pt-3">
        {annotation.errorType && <p className="text-label">{errorTypeLabel(annotation.errorType)}</p>}
        {annotation.lesson && (
          <p className="mt-1 font-serif text-[15px] italic leading-relaxed text-accent">{annotation.lesson}</p>
        )}
        {(annotation.playedMove || annotation.bestMove) && (
          <p className="mt-1 font-serif text-sm text-fg-muted">
            {annotation.playedMove ?? '?'} → {annotation.bestMove ?? '?'}
          </p>
        )}
      </div>
    )}

    {annotation.tags && annotation.tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {annotation.tags.map(tagId => {
          const tag = TAGS.find(t => t.id === tagId);
          return tag ? (
            <Badge key={tagId} tone={tag.tone}>
              {tag.label}
            </Badge>
          ) : null;
        })}
      </div>
    )}

    {annotation.notes && <p className="line-clamp-3 text-sm text-fg-muted">{annotation.notes}</p>}

    {annotation.keyMoments && annotation.keyMoments.length > 0 && (
      <div>
        <p className="text-label mb-1">
          {annotation.keyMoments.length} momento{annotation.keyMoments.length > 1 ? 's' : ''}
        </p>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {annotation.keyMoments.slice(0, 3).map((moment, idx) => (
            <li key={idx} className={`px-2 py-1.5 text-sm ${moment.critical ? 'bg-carbon' : ''}`}>
              {moment.critical && <span className="sr-only">Momento decisivo: </span>}
              <span className="font-serif text-base text-fg">{moment.move}</span>
              {moment.symbol && <span className="ml-0.5 font-semibold text-loss">{moment.symbol}</span>}
              {moment.bestMove && (
                <span className="ml-2 font-serif text-xs text-fg-subtle">→ {moment.bestMove}</span>
              )}
              {moment.comment && (
                <span className="ml-2 font-serif italic text-accent">{moment.comment}</span>
              )}
            </li>
          ))}
        </ul>
        {annotation.keyMoments.length > 3 && (
          <p className="mt-1 text-xs text-fg-subtle">+ {annotation.keyMoments.length - 3} momentos más</p>
        )}
      </div>
    )}
  </Card>
);

export default AnnotationCard;
