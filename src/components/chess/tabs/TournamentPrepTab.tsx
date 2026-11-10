import { useState, useMemo } from 'react';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import type { RepertoireLine } from '../../../types/chess';
import { useRepertoireLines } from '../../../context/RepertoireLinesContext';
import { Badge, Button, Card, CardHeader, ClockBar, SegmentedControl, StatCard, type Segment } from '../../ui';

type ColorFilter = 'all' | 'W' | 'B';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 30;

const COLOR_OPTIONS: Segment<ColorFilter>[] = [
  { value: 'all', label: 'Todas' },
  { value: 'W', label: 'Blancas' },
  { value: 'B', label: 'Negras' },
];

const FIELD =
  'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

/** Confidence 0–5 as five small squares: filled in pen up to the value. */
const ConfidenceMarks = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Confianza ${value} de 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`h-2.5 w-2.5 rounded-sm border ${value > i ? 'border-accent bg-accent' : 'border-hairline bg-surface-2'}`} />
    ))}
  </span>
);

const TournamentPrepTab = () => {
  const modal = useModal();

  // Shared with Entrenar, so an edit here is what gets drilled there.
  const { lines, create, update, remove } = useRepertoireLines();

  const [selectedLine, setSelectedLine] = useState<Partial<RepertoireLine> | null>(null);
  const [editingLine, setEditingLine] = useState<RepertoireLine | null>(null);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  const saveLine = async (line: Partial<RepertoireLine>) => {
    if (editingLine) {
      await update(editingLine.id, line);
    } else {
      await create({ color: 'W', ...line });
    }
    setEditingLine(null);
    setSelectedLine(null);
  };

  const removeLine = async (id: string) => {
    const confirmed = await modal.confirm('¿Borrar esta línea de preparación?');
    if (confirmed) {
      await remove(id);
    }
  };

  const markReviewed = async (line: RepertoireLine) => {
    await update(line.id, { ...line, lastReviewed: Date.now(), reviewCountInc: 1 });
  };

  const filteredLines = useMemo(() => {
    const filtered = colorFilter === 'all' ? lines : lines.filter(l => l.color === colorFilter);
    return [...filtered].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }, [lines, colorFilter]);

  const stats = useMemo(() => {
    const total = lines.length;
    const avgConfidence = total > 0
      ? Math.round((lines.reduce((sum, l) => sum + (l.confidence ?? 0), 0) / total) * 10) / 10
      : 0;
    const staleCount = lines.filter(l => {
      if (!l.lastReviewed) return true;
      return Date.now() - l.lastReviewed > STALE_AFTER_DAYS * DAY_MS;
    }).length;
    return { total, avgConfidence, staleCount };
  }, [lines]);

  const newLine = () => {
    setSelectedLine({});
    setEditingLine(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Tus líneas preparadas: plan, regla de oro y confianza en cada una.</p>
        <Button variant="primary" size="sm" icon={PlusIcon} onClick={newLine}>
          Nueva línea
        </Button>
      </div>

      <ClockBar>
        <StatCard title="Líneas" value={stats.total} subtitle="preparadas" />
        <StatCard title="Confianza promedio" value={`${stats.avgConfidence} / 5`} subtitle="sobre todas las líneas" />
        <StatCard
          title="Para repasar"
          value={stats.staleCount}
          trend={stats.staleCount > 0 ? 'down' : undefined}
          subtitle={`sin repaso hace más de ${STALE_AFTER_DAYS} días`}
        />
      </ClockBar>

      <SegmentedControl options={COLOR_OPTIONS} value={colorFilter} onChange={setColorFilter} aria-label="Filtrar por color" />

      {selectedLine !== null && (
        <Card flush className="overflow-hidden">
          <div className="border-b border-hairline bg-surface-2 px-5 py-4 sm:px-6">
            <h3 className="font-serif text-lg font-semibold text-fg">
              {editingLine ? 'Editar línea' : 'Nueva línea'}
            </h3>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prep-color" className="text-label mb-1.5 block">Color</label>
                <select
                  id="prep-color"
                  value={selectedLine.color ?? 'W'}
                  onChange={(e) => setSelectedLine({ ...selectedLine, color: e.target.value as 'W' | 'B' })}
                  className={FIELD}
                >
                  <option value="W">Blancas</option>
                  <option value="B">Negras</option>
                </select>
              </div>
              <div>
                <label htmlFor="prep-vs" className="text-label mb-1.5 block">Contra</label>
                <input
                  id="prep-vs"
                  type="text"
                  placeholder="1.e4 / 1.d4 / anti-siciliana Ab5…"
                  value={selectedLine.vsMove || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, vsMove: e.target.value })}
                  className={FIELD}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prep-eco" className="text-label mb-1.5 block">ECO</label>
                <input
                  id="prep-eco"
                  type="text"
                  placeholder="B33"
                  value={selectedLine.eco || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, eco: e.target.value })}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="prep-name" className="text-label mb-1.5 block">Nombre de la línea</label>
                <input
                  id="prep-name"
                  type="text"
                  placeholder="Dragón Acelerado – Ac4 principal con …a5"
                  value={selectedLine.lineName || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, lineName: e.target.value })}
                  className={FIELD}
                />
              </div>
            </div>

            <div>
              <label htmlFor="prep-moves" className="text-label mb-1.5 block">Jugadas (SAN, hasta la tabiya)</label>
              <textarea
                id="prep-moves"
                placeholder="1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.Nc3 Bg7 6.Be3 Nf6 7.Bc4…"
                value={selectedLine.movesSan || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, movesSan: e.target.value })}
                className={`${FIELD} h-20 resize-none font-mono`}
              />
            </div>

            <div>
              <label htmlFor="prep-fen" className="text-label mb-1.5 block">FEN clave (posición crítica)</label>
              <input
                id="prep-fen"
                type="text"
                placeholder="r1bqk2r/pp1pppbp/2n2np1/8/2BNP3/2N1B3/PPP2PPP/R2QK2R b KQkq - 0 7"
                value={selectedLine.keyFen || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, keyFen: e.target.value })}
                className={`${FIELD} font-mono`}
              />
            </div>

            <div>
              <label htmlFor="prep-plan" className="text-label mb-1.5 block">Plan</label>
              <textarea
                id="prep-plan"
                placeholder="El plan, en una frase…"
                value={selectedLine.plan || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, plan: e.target.value })}
                className={`${FIELD} h-20 resize-none`}
              />
            </div>

            <div>
              <label htmlFor="prep-rule" className="text-label mb-1.5 block">Regla de oro / trampa a evitar</label>
              <textarea
                id="prep-rule"
                placeholder="En qué NO caer…"
                value={selectedLine.goldenRule || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, goldenRule: e.target.value })}
                className={`${FIELD} h-20 resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prep-priority" className="text-label mb-1.5 block">Prioridad (1 = cerrar primero)</label>
                <input
                  id="prep-priority"
                  type="number"
                  min={1}
                  value={selectedLine.priority ?? ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, priority: e.target.value ? Number(e.target.value) : undefined })}
                  className={`${FIELD} font-mono`}
                />
              </div>
              <div>
                <span className="text-label mb-1.5 block" id="prep-confidence">Confianza (1 a 5)</span>
                <div className="flex gap-1.5" role="group" aria-labelledby="prep-confidence">
                  {[1, 2, 3, 4, 5].map(rating => {
                    const on = (selectedLine.confidence || 0) >= rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        aria-pressed={(selectedLine.confidence || 0) === rating}
                        onClick={() => setSelectedLine({ ...selectedLine, confidence: rating })}
                        className={`h-9 w-9 rounded-sm border font-mono text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          on ? 'border-accent bg-accent text-accent-fg' : 'border-hairline bg-surface text-fg-muted hover:border-fg-subtle'
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="prep-lichess" className="text-label mb-1.5 block">Estudio de Lichess</label>
              <input
                id="prep-lichess"
                type="text"
                placeholder="https://lichess.org/study/…"
                value={selectedLine.lichessUrl || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, lichessUrl: e.target.value })}
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="prep-notes" className="text-label mb-1.5 block">Notas</label>
              <textarea
                id="prep-notes"
                placeholder="Cualquier otra cosa que valga la pena recordar de esta línea…"
                value={selectedLine.notes || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, notes: e.target.value })}
                className={`${FIELD} h-24 resize-none`}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="primary" onClick={() => saveLine(selectedLine)}>
                {editingLine ? 'Guardar cambios' : 'Guardar línea'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedLine(null);
                  setEditingLine(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredLines.length > 0 ? (
          filteredLines.map(line => {
            const daysSinceReview = line.lastReviewed
              ? Math.floor((Date.now() - line.lastReviewed) / DAY_MS)
              : null;
            const isStale = daysSinceReview === null || daysSinceReview > STALE_AFTER_DAYS;
            return (
              <Card key={line.id} className="flex flex-col">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                      <span>{line.color === 'W' ? 'Blancas' : 'Negras'}</span>
                      {line.eco && <Badge>{line.eco}</Badge>}
                      {line.vsMove && <span className="font-serif">contra {line.vsMove}</span>}
                      {line.priority != null && <Badge tone="accent">P{line.priority}</Badge>}
                    </div>
                    <h4 className="font-serif text-xl font-semibold leading-tight text-fg">{line.lineName || 'Línea sin nombre'}</h4>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    {line.lichessUrl && (
                      <a
                        href={line.lichessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir estudio de Lichess"
                        aria-label="Abrir estudio de Lichess"
                        className="rounded p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedLine(line);
                        setEditingLine(line);
                      }}
                      title="Editar línea"
                      aria-label="Editar línea"
                      className="rounded p-2 text-accent transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeLine(line.id)}
                      title="Borrar línea"
                      aria-label="Borrar línea"
                      className="rounded p-2 text-loss transition-colors hover:bg-carbon-pink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {line.movesSan && (
                  <p className="mb-3 line-clamp-2 font-serif text-[15px] text-fg-muted">{line.movesSan}</p>
                )}

                {line.plan && (
                  <p className="mb-2 font-serif text-base text-fg"><span className="text-label mr-1.5">Plan</span>{line.plan}</p>
                )}

                {line.goldenRule && (
                  <p className="mb-3 font-serif text-base text-fg-muted"><span className="text-label mr-1.5">Regla de oro</span>{line.goldenRule}</p>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-hairline pt-3">
                  <ConfidenceMarks value={line.confidence ?? 0} />

                  <button
                    onClick={() => markReviewed(line)}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      isStale ? 'text-loss' : 'text-fg-muted'
                    }`}
                    title="Marcar como repasada hoy"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {daysSinceReview === null ? 'Nunca repasada' : `Repasada hace ${daysSinceReview} d`}
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="py-12 text-center lg:col-span-2">
            <CardHeader title="Todavía no hay líneas" className="justify-center" />
            <p className="mb-4 mt-2 text-sm text-fg-muted">Empezá a cargar tu preparación, línea por línea.</p>
            <Button variant="primary" onClick={newLine}>Agregar la primera línea</Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TournamentPrepTab;
