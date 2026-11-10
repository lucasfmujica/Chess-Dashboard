import { useState, useMemo } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import type { RepertoireLine } from '../../../types/chess';
import { useRepertoireLines } from '../../../context/RepertoireLinesContext';
import { ecoNames } from '../../../constants/ecoNames';
import { isDue as srsIsDue, nextReviewAt as srsNextReviewAt, nudgeConfidence } from '../../../utils/srs';
import { Card } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard, { ClockBar } from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';

type StudyMode = 'review' | 'all';
type ColorFilter = 'all' | 'W' | 'B';

/** A line is due when never reviewed, or its confidence-based interval has elapsed. */
const isDue = (line: RepertoireLine, now: number) => srsIsDue(line.lastReviewed, line.confidence, now);

/** Sort key: never-reviewed (0) first, then by soonest next-review time. */
const nextReviewAt = (line: RepertoireLine) => srsNextReviewAt(line.lastReviewed, line.confidence);

const lineName = (line: RepertoireLine) =>
  line.lineName || (line.eco ? ecoNames[line.eco] || line.eco : '') || 'Línea sin nombre';

const OpeningsFlashcardsTab = () => {
  const modal = useModal();

  // Shared with Líneas, so a plan edited there is the plan drilled here.
  const { lines, update } = useRepertoireLines();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [studyMode, setStudyMode] = useState<StudyMode>('review');

  const now = Date.now();

  const filteredLines = useMemo(() => {
    let filtered = lines;
    if (colorFilter !== 'all') filtered = filtered.filter(l => l.color === colorFilter);
    if (studyMode === 'review') filtered = filtered.filter(l => isDue(l, now));
    return [...filtered].sort((a, b) => nextReviewAt(a) - nextReviewAt(b));
  }, [lines, colorFilter, studyMode, now]);

  const current = filteredLines[currentIndex];

  const stats = useMemo(() => {
    const total = lines.length;
    const dueToday = lines.filter(l => isDue(l, now)).length;
    const mastered = lines.filter(l => (l.confidence ?? 0) >= 5).length;
    const scored = lines.filter(l => l.confidence);
    const avgConfidence = scored.length
      ? Math.round((scored.reduce((s, l) => s + (l.confidence ?? 0), 0) / scored.length) * 10) / 10
      : 0;
    return { total, dueToday, mastered, avgConfidence };
  }, [lines, now]);

  const handleResponse = async (correct: boolean) => {
    if (!current) return;
    const nudged = nudgeConfidence(current.confidence, correct);
    const updated: RepertoireLine = { ...current, confidence: nudged, lastReviewed: Date.now() };

    setShowAnswer(false);
    // Advance within the (pre-update) filtered list length.
    setCurrentIndex(i => (filteredLines.length ? (i + 1) % filteredLines.length : 0));

    try {
      // Whole line, because this PUT replaces every column — plus the
      // counter delta, which is applied server-side rather than replaced.
      await update(current.id, { ...updated, reviewCountInc: 1 });
    } catch (err) {
      console.error('Failed to save review', err);
    }
  };

  const resetProgress = async () => {
    const confirmed = await modal.confirm('¿Reiniciar el repaso de todas las líneas? Se borran las fechas del último repaso.');
    if (!confirmed) return;
    setCurrentIndex(0);
    await Promise.all(
      lines.map(l => update(l.id, { ...l, lastReviewed: undefined }).catch(() => undefined))
    );
  };

  const goPrev = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filteredLines.length ? (i - 1 + filteredLines.length) % filteredLines.length : 0));
  };
  const goNext = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filteredLines.length ? (i + 1) % filteredLines.length : 0));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Planes y reglas de oro de cada capítulo, con repaso espaciado.
      </p>

      <ClockBar>
        <StatCard title="Líneas" value={stats.total} subtitle="en el repertorio" />
        <StatCard title="Repaso" value={stats.dueToday} subtitle="vencidas hoy" trend={stats.dueToday > 0 ? 'down' : undefined} />
        <StatCard title="Dominadas" value={stats.mastered} subtitle="confianza 5/5" />
        <StatCard title="Confianza media" value={`${stats.avgConfidence}/5`} />
      </ClockBar>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-label mb-2">Modo</p>
            <SegmentedControl
              aria-label="Modo de estudio"
              value={studyMode}
              onChange={v => { setStudyMode(v); setCurrentIndex(0); }}
              options={[
                { value: 'review', label: `Para hoy (${stats.dueToday})` },
                { value: 'all', label: 'Todas' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Color</p>
            <SegmentedControl
              aria-label="Filtro de color"
              value={colorFilter}
              onChange={v => { setColorFilter(v); setCurrentIndex(0); }}
              options={[
                { value: 'all', label: 'Ambos' },
                { value: 'W', label: <PieceLabel color="W" /> },
                { value: 'B', label: <PieceLabel color="B" /> },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={resetProgress} className="ml-auto">
            Reiniciar repaso
          </Button>
        </div>
      </Card>

      {/* Flashcard */}
      {filteredLines.length > 0 && current ? (
        <Card flush className="overflow-hidden">
          {/* Progress */}
          <div className="px-6 py-3 bg-surface-2 border-b border-hairline">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm tabular-nums text-fg">
                Tarjeta {currentIndex + 1} de {filteredLines.length}
              </span>
              <span className="text-sm text-fg-muted">
                Confianza: <span className="font-mono font-medium tabular-nums text-accent">{current.confidence ?? '—'}/5</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-surface">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filteredLines.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-serif text-[28px] font-semibold leading-tight tracking-tight text-fg text-balance">{lineName(current)}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral"><PieceLabel color={current.color} /></Badge>
                  {current.eco && <Badge tone="neutral"><span className="font-mono">{current.eco}</span></Badge>}
                  {current.vsMove && <Badge tone="accent">vs {current.vsMove}</Badge>}
                </div>
              </div>

              {/* Prompt */}
              <div className="rounded border border-hairline bg-surface-2 p-5">
                <p className="mb-1 font-serif text-base font-semibold text-fg">Recordá la línea y el plan</p>
                <p className="text-sm text-fg-muted">Repasá las jugadas de memoria y después mirá la respuesta.</p>
              </div>
            </div>

            {/* Answer */}
            {showAnswer && (
              <div className="mb-6 animate-slideUp space-y-3">
                {current.movesSan && (
                  <div className="rounded border border-hairline p-5">
                    <p className="text-label mb-2">Jugadas</p>
                    <p className="font-serif text-lg text-fg">{current.movesSan}</p>
                  </div>
                )}
                {current.plan && (
                  <div className="rounded border border-hairline p-5">
                    <p className="text-label mb-2">Plan</p>
                    <p className="font-serif text-base leading-6 text-fg">{current.plan}</p>
                  </div>
                )}
                {current.goldenRule && (
                  <div className="rounded border border-transparent bg-carbon p-5">
                    <p className="text-label mb-2">Regla de oro</p>
                    <p className="font-serif text-base leading-6 text-fg">{current.goldenRule}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-fg-subtle">
                  {current.lichessUrl && (
                    <a
                      href={current.lichessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Abrir en Lichess
                    </a>
                  )}
                  {current.lastReviewed && (
                    <span>Último repaso: {new Date(current.lastReviewed).toLocaleDateString('es-AR')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!showAnswer ? (
                <Button variant="primary" onClick={() => setShowAnswer(true)} className="h-11 flex-1">
                  Mostrar respuesta
                </Button>
              ) : (
                <>
                  <Button variant="danger" onClick={() => handleResponse(false)} className="h-11 flex-1">
                    No me acordaba
                  </Button>
                  <Button variant="primary" onClick={() => handleResponse(true)} className="h-11 flex-1">
                    Me acordaba
                  </Button>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={goPrev}>← Anterior</Button>
              <Button variant="secondary" onClick={goNext}>Siguiente →</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          {lines.length === 0 ? (
            <>
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Todavía no hay líneas</h3>
              <p className="text-fg-muted">Cargalas en <span className="font-semibold text-fg">Líneas</span> y aparecen acá para repasar.</p>
            </>
          ) : (
            <>
              <h3 className="mb-2 font-serif text-xl font-semibold text-fg">Repaso al día</h3>
              <p className="text-fg-muted">No hay líneas vencidas. Pasá a "Todas" para seguir practicando.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default OpeningsFlashcardsTab;
