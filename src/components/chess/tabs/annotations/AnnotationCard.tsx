import { PencilIcon, StarIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Badge } from '../../../ui';
import { TAGS, errorTypeLabel } from './annotationMeta';
import type { AnnotatedGame } from '../../../../types/chess';

interface AnnotationCardProps {
  annotation: AnnotatedGame;
  onEdit: (annotation: AnnotatedGame) => void;
  onDelete: (id: string) => void;
}

const AnnotationCard = ({ annotation, onEdit, onDelete }: AnnotationCardProps) => (
  <div className="bg-surface rounded-lg border border-hairline overflow-hidden hover:bg-surface-2 transition-colors">
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h4 className="text-xl font-bold text-fg mb-1 break-words">{annotation.gameName}</h4>
          <div className="flex items-center gap-3 text-sm text-fg-muted">
            <span>{annotation.date}</span>
            <span className="font-bold tabular-nums">{annotation.result}</span>
            {annotation.rating && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: annotation.rating }).map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 text-draw" fill="currentColor" />
                ))}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {/* Editing is also how you replay it: the form carries the board. */}
          <button
            onClick={() => onEdit(annotation)}
            aria-label="Abrir y editar"
            title="Abrir en el tablero"
            className="p-2 text-accent hover:bg-surface-2 rounded-lg transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(annotation.id)}
            aria-label="Borrar análisis"
            className="p-2 text-loss hover:bg-loss/10 rounded-lg transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {(annotation.errorType || annotation.lesson) && (
        <div className="mb-4 rounded-lg border border-hairline bg-surface-2 p-3">
          {annotation.errorType && (
            <span className="text-xs font-bold text-accent">
              {errorTypeLabel(annotation.errorType)}
            </span>
          )}
          {annotation.lesson && <p className="text-sm text-fg mt-1">{annotation.lesson}</p>}
          {(annotation.playedMove || annotation.bestMove) && (
            <p className="text-xs text-fg-muted mt-1 font-mono">
              {annotation.playedMove ?? '?'} → {annotation.bestMove ?? '?'}
            </p>
          )}
        </div>
      )}

      {annotation.tags && annotation.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {annotation.tags.map(tagId => {
            const tag = TAGS.find(t => t.id === tagId);
            return tag ? (
              <Badge key={tagId} tone={tag.tone}>
                {tag.icon} {tag.label}
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {annotation.notes && (
        <p className="text-sm text-fg-muted mb-4 line-clamp-3">{annotation.notes}</p>
      )}

      {annotation.keyMoments && annotation.keyMoments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg-muted uppercase">
            {annotation.keyMoments.length} momento{annotation.keyMoments.length > 1 ? 's' : ''}
          </p>
          {annotation.keyMoments.slice(0, 3).map((moment, idx) => (
            <div key={idx} className="p-2 bg-surface-2 rounded-lg text-sm">
              {moment.critical && (
                <StarIcon
                  className="inline w-3.5 h-3.5 text-draw mr-1 -mt-0.5"
                  fill="currentColor"
                />
              )}
              <span className="font-mono font-bold text-accent">{moment.move}</span>
              {moment.symbol && <span className="ml-1 font-bold text-loss">{moment.symbol}</span>}
              {moment.bestMove && (
                <span className="ml-2 text-xs text-fg-subtle font-mono">→ {moment.bestMove}</span>
              )}
              {moment.comment && <span className="ml-2 text-fg-muted">— {moment.comment}</span>}
            </div>
          ))}
          {annotation.keyMoments.length > 3 && (
            <p className="text-xs text-fg-subtle italic">
              + {annotation.keyMoments.length - 3} momentos más
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);

export default AnnotationCard;
