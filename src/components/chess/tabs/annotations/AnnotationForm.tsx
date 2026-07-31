import { useCallback, useRef, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { Badge, Button } from '../../../ui';
import GameViewer from '../../GameViewer';
import ConceptLinkPicker from '../../ConceptLinkPicker';
import CaptureMomentPanel from './CaptureMomentPanel';
import KeyMomentsList from './KeyMomentsList';
import { addMoment, removeMoment, setCriticalMoment, updateMoment } from './moments';
import { ERROR_TYPE_OPTIONS, TAGS } from './annotationMeta';
import { gameLabel } from '../../../../utils/gameMapping';
import type { AnnotatedGame, AnnotationErrorType, Game, KeyMoment } from '../../../../types/chess';

const FIELD =
  'w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent';
const LABEL = 'block text-sm font-bold text-fg mb-2';

interface AnnotationFormProps {
  draft: Partial<AnnotatedGame>;
  onChange: (draft: Partial<AnnotatedGame>) => void;
  /** Candidate games for the link picker, newest first. */
  linkableGames: Game[];
  /** The game `draft.gameId` points at, when it is one of the loaded games. */
  linkedGame?: Game;
  isEditing: boolean;
  onLinkGame: (gameId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const AnnotationForm = ({
  draft,
  onChange,
  linkableGames,
  linkedGame,
  isEditing,
  onLinkGame,
  onSave,
  onCancel,
}: AnnotationFormProps) => {
  const set = (patch: Partial<AnnotatedGame>) => onChange({ ...draft, ...patch });

  const keyMoments = draft.keyMoments ?? [];
  const recordedPlies = keyMoments
    .map(m => m.ply)
    .filter((p): p is number => p !== undefined);

  /**
   * The board's `goTo`, handed up by the capture slot so the moment list can
   * jump back to a position. Kept in state rather than a ref so the list
   * re-renders once it exists and can show its "Ver en el tablero" buttons.
   */
  const [goToPly, setGoToPly] = useState<((ply: number) => void) | undefined>();
  // Stored as a thunk: React would otherwise call a function passed to a setter.
  const handleNavigate = useCallback((goTo: (ply: number) => void) => setGoToPly(() => goTo), []);

  // Scroll a freshly captured moment into view — it lands below the board.
  const momentsRef = useRef<HTMLDivElement>(null);
  const captureMoment = (moment: KeyMoment) => {
    set(addMoment(keyMoments, moment));
    requestAnimationFrame(() =>
      momentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    );
  };

  return (
    <div className="bg-surface rounded-lg border border-hairline overflow-hidden animate-slideUp">
      <div className="px-6 py-4 bg-surface-2 border-b border-hairline">
        <h3 className="text-base font-semibold text-fg">
          {isEditing ? 'Editar análisis' : 'Análisis de partida'}
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* The board first: the post-mortem is written while looking at it, and
            the moments below it are collected from it, one per turning point. */}
        {draft.pgn ? (
          <GameViewer
            pgn={draft.pgn}
            orientation={linkedGame?.color === 'B' ? 'black' : 'white'}
            white={linkedGame ? (linkedGame.color === 'W' ? 'Vos' : linkedGame.opp) : 'Blancas'}
            black={linkedGame ? (linkedGame.color === 'W' ? linkedGame.opp : 'Vos') : 'Negras'}
            result={draft.result}
            showEngine
            capture={position => (
              <CaptureMomentPanel
                position={position}
                recordedPlies={recordedPlies}
                onCapture={captureMoment}
                onNavigate={handleNavigate}
              />
            )}
          />
        ) : (
          <div className="rounded-lg border border-hairline bg-surface-2 p-4 text-sm text-fg-muted">
            Esta partida no tiene jugadas guardadas, así que no hay tablero. Pegalas en «Jugadas
            (PGN)» más abajo, o adjuntalas a la partida desde Analysis Board.
          </div>
        )}

        <div ref={momentsRef}>
          <KeyMomentsList
            moments={keyMoments}
            onUpdate={(idx, patch) => set(updateMoment(keyMoments, idx, patch))}
            onRemove={idx => set(removeMoment(keyMoments, idx))}
            onSetCritical={idx => set(setCriticalMoment(keyMoments, idx))}
            onAddBlank={() =>
              set(addMoment(keyMoments, { move: '', symbol: '', comment: '' }))
            }
            onGoTo={goToPly}
          />
        </div>

        {/*
          Structured post-mortem. The tags/notes/keyMoments fields below are
          free text and can't be aggregated, so "why do I lose" could only ever
          be answered from memory. These few constrained fields are what the
          Training Log charts.
        */}
        <div className="rounded-lg border border-hairline bg-surface-2 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-fg">Post-mortem</h4>
            <p className="text-xs text-fg-muted mt-0.5">
              Un tipo de error y una lección por partida. Esto es lo que después se puede contar;
              las notas libres no.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="ann-error">Tipo de error</label>
              <select
                id="ann-error"
                value={draft.errorType || ''}
                onChange={e =>
                  set({ errorType: (e.target.value || undefined) as AnnotationErrorType | undefined })
                }
                className={FIELD}
              >
                <option value="">Sin clasificar</option>
                {ERROR_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL} htmlFor="ann-link">Partida vinculada</label>
              <select
                id="ann-link"
                value={draft.gameId || ''}
                onChange={e => onLinkGame(e.target.value)}
                className={FIELD}
              >
                <option value="">Ninguna</option>
                {linkableGames.map(g => (
                  <option key={g.id} value={g.id}>{gameLabel(g)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="ann-lesson">Lección, en una línea</label>
            <input
              id="ann-lesson"
              type="text"
              placeholder="Ej: antes de cambiar en el centro, mirá qué torre queda mal"
              value={draft.lesson || ''}
              onChange={e => set({ lesson: e.target.value })}
              className={FIELD}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-fg mb-1">
              Conceptos que decidieron la partida
            </label>
            <p className="text-xs text-fg-muted mb-2">
              Marcarlos acá también le suma esta partida al concepto — que es lo que lo saca de
              «leído, no aprendido».
            </p>
            <ConceptLinkPicker
              value={draft.conceptIds ?? []}
              onChange={ids => set({ conceptIds: ids })}
              gameId={draft.gameId}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="ann-name">Nombre / evento</label>
            <input
              id="ann-name"
              type="text"
              placeholder="Ej: vs Petrosian · Copa Cultura"
              value={draft.gameName || ''}
              onChange={e => set({ gameName: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="ann-date">Fecha</label>
            <input
              id="ann-date"
              type="date"
              value={draft.date || ''}
              onChange={e => set({ date: e.target.value })}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="ann-result">Resultado</label>
          <select
            id="ann-result"
            value={draft.result || ''}
            onChange={e => set({ result: e.target.value })}
            className={FIELD}
          >
            <option value="">Elegir resultado</option>
            <option value="1-0">1-0 (ganan blancas)</option>
            <option value="0-1">0-1 (ganan negras)</option>
            <option value="1/2-1/2">1/2-1/2 (tablas)</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Valoración personal (1-5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => set({ rating })}
                aria-label={`${rating} estrella${rating > 1 ? 's' : ''}`}
                className={`p-3 rounded-lg transition-all ${
                  (draft.rating || 0) >= rating
                    ? 'bg-draw/12 text-draw'
                    : 'bg-surface-2 text-fg-subtle hover:bg-surface-2'
                }`}
              >
                <StarIcon
                  className="w-6 h-6"
                  fill={(draft.rating || 0) >= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => {
              const isSelected = draft.tags?.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    const current = draft.tags || [];
                    set({
                      tags: isSelected
                        ? current.filter(t => t !== tag.id)
                        : [...current, tag.id],
                    });
                  }}
                  aria-pressed={isSelected}
                  className={`rounded-full transition-opacity ${isSelected ? '' : 'opacity-50 hover:opacity-100'}`}
                >
                  <Badge tone={isSelected ? tag.tone : 'neutral'}>
                    {tag.icon} {tag.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="ann-notes">Notas</label>
          <textarea
            id="ann-notes"
            placeholder="¿Qué tuvo de particular? ¿Qué patrón notaste?"
            value={draft.notes || ''}
            onChange={e => set({ notes: e.target.value })}
            className={`${FIELD} resize-none h-32`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="ann-pgn">Jugadas (PGN)</label>
          <textarea
            id="ann-pgn"
            placeholder={'Pegá las jugadas para que la partida sea reproducible\n1. e4 e5 2. Nf3 ...'}
            value={draft.pgn || ''}
            onChange={e => set({ pgn: e.target.value })}
            className={`${FIELD} resize-none h-24 font-mono text-sm`}
          />
        </div>


        <div className="flex gap-4 pt-4">
          <Button variant="primary" onClick={onSave} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Guardar análisis'}
          </Button>
          <Button onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationForm;
