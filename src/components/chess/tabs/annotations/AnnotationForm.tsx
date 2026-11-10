import { useCallback, useRef, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card } from '../../../ui';
import GameViewer from '../../GameViewer';
import ConceptLinkPicker from '../../ConceptLinkPicker';
import CaptureMomentPanel from './CaptureMomentPanel';
import DiagnosticsPanel, { type BoardMarks } from './DiagnosticsPanel';
import KeyMomentsList from './KeyMomentsList';
import {
  addMoment,
  fatesStillNeeded,
  isOtbGame,
  removeMoment,
  setCriticalMoment,
  updateMoment,
  CANDIDATE_FATE_QUESTION,
  REQUIRED_OTB_MOMENTS,
} from './moments';
import { ERROR_TYPE_OPTIONS, TAGS } from './annotationMeta';
import { gameLabel } from '../../../../utils/gameMapping';
import type { AnnotatedGame, AnnotationErrorType, Game, KeyMoment } from '../../../../types/chess';

const FIELD =
  'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';
const LABEL = 'text-label mb-1.5 block';

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
  // OTB post-mortems must answer the candidate question on three moments;
  // online games are never blocked.
  const otb = isOtbGame(linkedGame);
  const fatesNeeded = otb ? fatesStillNeeded(keyMoments) : 0;
  const recordedPlies = keyMoments
    .map(m => m.ply)
    .filter((p): p is number => p !== undefined);

  /**
   * The board's `goTo`, handed up by the capture slot so the moment list can
   * jump back to a position. Kept in state rather than a ref so the list
   * re-renders once it exists and can show its "Ver en el tablero" buttons.
   */
  const [goToPly, setGoToPly] = useState<((ply: number) => void) | undefined>();

  /**
   * Lo que el diagnóstico quiere pintar en el tablero. Vive acá porque el panel
   * que lo sabe se renderiza dentro del visor: la información tiene que subir
   * hasta el padre común para poder bajar como prop.
   */
  const [marks, setMarks] = useState<BoardMarks>({});
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
    <Card flush className="animate-slideUp overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline-strong px-5 py-4 sm:px-6">
        <h3 className="font-serif text-xl font-semibold leading-tight text-fg">
          {isEditing ? 'Editar análisis' : 'Análisis de partida'}
        </h3>
        {draft.gameName && <span className="truncate text-xs text-fg-subtle">{draft.gameName}</span>}
      </div>

      <div className="space-y-6 p-5 sm:p-6">
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
            marks={marks}
            capture={position => (
              <div className="space-y-3">
                <CaptureMomentPanel
                  position={position}
                  recordedPlies={recordedPlies}
                  onCapture={captureMoment}
                  onNavigate={handleNavigate}
                />
                {/* El diagnóstico de motores va debajo de la captura: la
                    anotación es lo que uno escribe, esto es lo que el cruce
                    Stockfish/Maia encontró en la misma posición. */}
                <DiagnosticsPanel
                  position={position}
                  gameId={linkedGame?.id}
                  onMarks={setMarks}
                />
              </div>
            )}
          />
        ) : (
          <div className="rounded border border-hairline bg-surface-2 p-4 text-sm text-fg-muted">
            Esta partida no tiene jugadas guardadas, así que no hay tablero. Pegalas en «Jugadas
            (PGN)» más abajo, o agregáselas a la partida desde el Tablero de análisis.
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
            askCandidateFate={otb}
          />
          {otb && (
            <p className="mt-2 text-xs text-fg-muted">
              Partida OTB: marcá al menos {REQUIRED_OTB_MOMENTS} momentos y respondé en cada uno «
              {CANDIDATE_FATE_QUESTION}»
              {fatesNeeded > 0 && ` — faltan ${fatesNeeded}.`}
            </p>
          )}
        </div>

        {/*
          Structured post-mortem. The tags/notes/keyMoments fields below are
          free text and can't be aggregated, so "why do I lose" could only ever
          be answered from memory. These few constrained fields are what the
          Training Log charts.
        */}
        <section className="space-y-4 rounded border border-hairline bg-surface p-4 sm:p-5" aria-labelledby="ann-takeaway">
          <div className="border-b border-hairline pb-3">
            <h4 id="ann-takeaway" className="font-serif text-xl font-semibold leading-tight text-fg">Qué me llevo</h4>
            <p className="mt-1 text-xs text-fg-muted">
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
            <label className={LABEL} htmlFor="ann-lesson">Lección de la partida, en una línea</label>
            <input
              id="ann-lesson"
              type="text"
              placeholder="Ej: antes de cambiar en el centro, mirá qué torre queda mal"
              value={draft.lesson || ''}
              onChange={e => set({ lesson: e.target.value })}
              className={`${FIELD} bg-app font-serif text-[15px] italic placeholder:not-italic`}
            />
          </div>

          <div>
            <p className={LABEL}>Conceptos que decidieron la partida</p>
            <p className="mb-2 text-xs text-fg-muted">
              Marcarlos acá también le suma esta partida al concepto — que es lo que lo saca de
              «leído, no aprendido».
            </p>
            <ConceptLinkPicker
              value={draft.conceptIds ?? []}
              onChange={ids => set({ conceptIds: ids })}
              gameId={draft.gameId}
            />
          </div>
        </section>

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
              className={`${FIELD} font-mono`}
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
          <p className={LABEL}>Valoración personal (1 a 5)</p>
          <div className="flex gap-1.5" role="group" aria-label="Valoración personal">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => set({ rating })}
                aria-label={`${rating} estrella${rating > 1 ? 's' : ''}`}
                aria-pressed={(draft.rating || 0) >= rating}
                className={`rounded border p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  (draft.rating || 0) >= rating
                    ? 'border-transparent bg-carbon text-fg'
                    : 'border-hairline bg-surface text-fg-subtle hover:text-fg'
                }`}
              >
                <StarIcon
                  className="h-5 w-5"
                  fill={(draft.rating || 0) >= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={LABEL}>Etiquetas</p>
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
                  className={`rounded-sm transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${isSelected ? '' : 'opacity-60 hover:opacity-100'}`}
                >
                  <Badge tone={isSelected ? tag.tone : 'neutral'}>{tag.label}</Badge>
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
            className={`${FIELD} h-32 resize-none`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="ann-pgn">Jugadas (PGN)</label>
          <textarea
            id="ann-pgn"
            placeholder={'Pegá las jugadas para que la partida sea reproducible\n1. e4 e5 2. Nf3 ...'}
            value={draft.pgn || ''}
            onChange={e => set({ pgn: e.target.value })}
            className={`${FIELD} h-24 resize-none font-mono`}
          />
        </div>


        <div className="flex flex-wrap gap-3 border-t border-hairline pt-5">
          <Button variant="primary" onClick={onSave} disabled={fatesNeeded > 0} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Guardar análisis'}
          </Button>
          <Button onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </Card>
  );
};

export default AnnotationForm;
