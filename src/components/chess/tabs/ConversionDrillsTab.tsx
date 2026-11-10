import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../boardTheme';
import BoardFrame from '../BoardFrame';
import { Card, Button, Badge, SegmentedControl } from '../../ui';
import { PieceGlyph } from '../../ui/PieceGlyph';
import PuzzleBoard from '../PuzzleBoard';
import { ALL_CONVERSION_ITEMS, type ConversionItem } from '../../../constants/conversionQueue';
import { useConversionQueue, type RecordOptions } from '../../../hooks/useConversionQueue';
import type { ConversionFilter } from '../../../utils/conversionProgress';

/**
 * Conversión, guías y clases: 154 posiciones estáticas (90 de partidas propias
 * donde se escapó una ventaja, 35 ejercicios de las guías, 29 finales de clase) con la mecánica del resto de
 * Ejercicios: tablero, veredicto y SRS. Un solo segmento con filtro, porque la
 * mecánica es la misma.
 *
 * Si el ítem trae jugadas aceptadas se juega en `PuzzleBoard` (cuenta como
 * correcta por centipeones o si la jugada está en `acceptedUci`). Si trae solo
 * `plan`, se revela y se autoevalúa, como las flashcards de repertorio.
 */

const fmtEval = (cp: number) => (Math.abs(cp) >= 9000 ? (cp > 0 ? '#' : '-#') : (cp / 100).toFixed(1));

/** `2026-03` → `03/2026`. */
const monthYear = (date: string) => `${date.slice(5, 7)}/${date.slice(0, 4)}`;

const SOURCE_LABEL: Record<string, string> = { libro: 'Libro', guia: 'Guía', clase: 'Clase' };

/** De dónde sale la posición: partida y fecha en conversión; libro, guía o clase en el resto. */
export const originLabel = (item: ConversionItem): string => {
  if (item.kind === 'conversion') return `Partida · ${item.date ? monthYear(item.date) : '—'}`;
  const base = SOURCE_LABEL[item.source] ?? 'Guía';
  return item.date ? `${base} · ${monthYear(item.date)}` : base;
};

const KIND_LABEL: Record<ConversionItem['kind'], string> = {
  conversion: 'Conversión',
  guide: 'Guía',
  class: 'Clase',
};

const selfCheckQuestion = (item: ConversionItem) =>
  item.kind === 'conversion' ? '¿Mantuve la ventaja?' : '¿Lo resolví?'; // guías y clases

const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

interface ItemViewProps {
  item: ConversionItem;
  confidence?: number;
  onRecord: (correct: boolean, opts: RecordOptions) => Promise<void>;
  onNext: () => void;
}

/** Un ítem. Se monta con `key={item.id}`, así que su estado arranca limpio en cada posición. */
const ItemView = ({ item, confidence, onRecord, onNext }: ItemViewProps) => {
  const startedAt = useRef(Date.now());
  const thinkSeconds = useRef<number | null>(null);
  const [candidates, setCandidates] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const playable = item.acceptedUci.length > 0;
  const orientation = item.color;
  const done = result !== null;

  const finish = (correct: boolean, think?: number) => {
    setResult(correct);
    void onRecord(correct, {
      seconds: secondsSince(startedAt.current),
      ...(think !== undefined && { thinkSeconds: think }),
      candidatesWritten: candidates.trim() || undefined,
    });
  };

  const reveal = () => {
    thinkSeconds.current = secondsSince(startedAt.current);
    setRevealed(true);
  };

  return (
    <div
      className="p-4 grid gap-6 sm:p-6 xl:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_minmax(360px,1fr)]"
      style={{ '--board-fit': 'calc(100dvh - 280px)' } as CSSProperties}
    >
      <div className="min-w-0">
        {playable ? (
          <PuzzleBoard
            fen={item.fen}
            bestMoveUci={item.acceptedUci[0]}
            acceptedUci={item.acceptedUci}
            orientation={orientation}
            resetKey={item.id}
            onFirstResult={correct => finish(correct)}
          />
        ) : (
          <BoardFrame>
            <Chessboard
              options={{
                position: item.fen,
                boardOrientation: orientation,
                allowDragging: false,
                showNotation: true,
                ...boardSquareStyles,
              }}
            />
          </BoardFrame>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            <PieceGlyph color={item.color === 'white' ? 'W' : 'B'} /> Juegan las {item.color === 'white' ? 'blancas' : 'negras'}
          </Badge>
          <Badge tone={item.kind === 'conversion' ? 'alert' : 'accent'}>
            {KIND_LABEL[item.kind]}
          </Badge>
          {item.needsReview && <Badge tone="neutral">Para consultar</Badge>}
          {item.evalBefore !== undefined && (
            <Badge tone="win">
              <span className="font-mono tabular-nums">{fmtEval(item.evalBefore)}</span> ventaja
            </Badge>
          )}
          <span className="ml-auto text-sm text-fg-muted">
            Confianza: <span className="font-mono font-medium tabular-nums text-accent">{confidence ?? '—'}/5</span>
          </span>
        </div>

        {!done && (
          <div>
            <label className="text-label mb-2 block" htmlFor={`candidates-${item.id}`}>
              Candidatas (opcional)
            </label>
            <textarea
              id={`candidates-${item.id}`}
              value={candidates}
              onChange={e => setCandidates(e.target.value)}
              rows={2}
              placeholder="Jaques, capturas y amenazas que viste antes de mover."
              className="w-full rounded border border-hairline bg-surface p-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        )}

        {!playable && !revealed && (
          <div className="space-y-3">
            <div className="rounded border border-hairline bg-surface-2 p-5">
              <p className="mb-1 font-serif text-lg font-semibold text-fg">{selfCheckQuestion(item)}</p>
              <p className="text-sm text-fg-muted">Pensá el plan y después mostralo para autoevaluarte.</p>
            </div>
            <Button variant="primary" onClick={reveal} className="h-11 w-full">
              Mostrar el plan
            </Button>
          </div>
        )}

        {!playable && revealed && !done && (
          <div className="space-y-3">
            {item.plan && <p className="font-serif text-base text-fg">{item.plan}</p>}
            <p className="font-serif text-lg font-semibold text-fg">{selfCheckQuestion(item)}</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => finish(false, thinkSeconds.current ?? undefined)} className="h-11 flex-1">
                No
              </Button>
              <Button variant="primary" onClick={() => finish(true, thinkSeconds.current ?? undefined)} className="h-11 flex-1">
                Sí
              </Button>
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-3 border-t border-hairline pt-3 animate-slideUp">
            <p className={`text-sm font-medium ${result ? 'text-win' : 'text-loss'}`}>
              {result ? 'Anotado como correcto' : 'Anotado como fallado'}
            </p>
            {item.plan && <p className="font-serif text-base text-fg">{item.plan}</p>}
            {item.notes && <p className="text-sm text-fg-muted">{item.notes}</p>}
            <p className="font-mono text-xs text-fg-subtle tabular-nums">
              {originLabel(item)}
              {item.evalBefore !== undefined && (
                <>
                  {' · '}
                  {fmtEval(item.evalBefore)}
                  {item.evalAfter !== undefined && ` → ${fmtEval(item.evalAfter)}`}
                </>
              )}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant={done ? 'primary' : 'secondary'} onClick={onNext}>
            Siguiente →
          </Button>
        </div>
      </div>
    </div>
  );
};

const ConversionDrillsTab = () => {
  const { filter, setFilter, counts, progress, ordered, stats, record, syncedAt, syncError, pendingCount } =
    useConversionQueue();
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const byId = useMemo(() => new Map(ALL_CONVERSION_ITEMS.map(i => [i.id, i])), []);

  /**
   * La cola es una lista fija de ids, como en Cálculo: se arma al cambiar el
   * filtro o cuando termina la sincronización con el servidor, nunca como efecto
   * de responder (el ítem que estás jugando dejaría de estar "por ver" y la
   * posición cambiaría debajo del tablero).
   */
  useEffect(() => {
    if (syncedAt === null) return;
    setQueue(ordered(filter).map(i => i.id));
    setIndex(0);
  }, [filter, syncedAt, ordered]);

  const current = byId.get(queue[index]);
  const summary = stats(filter);

  const goNext = () => setIndex(i => (queue.length ? (i + 1) % queue.length : 0));

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Posiciones ganadas que se escaparon en tus partidas, ejercicios de las guías y finales de las clases.
      </p>

      <SegmentedControl<ConversionFilter>
        aria-label="Filtro de conversión"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `Todas (${counts.all})` },
          { value: 'conversion', label: `Partidas (${counts.conversion})` },
          { value: 'guide', label: `Guías (${counts.guide})` },
          { value: 'class', label: `Clases (${counts.class})` },
        ]}
      />

      <p className="font-mono text-sm tabular-nums text-fg-muted" data-testid="conversion-counter">
        {summary.seen} de {summary.total} vistas · {summary.due} para hoy
      </p>

      {syncError && <p className="text-sm text-loss">No se pudo sincronizar con el servidor: se usa el progreso de este dispositivo.</p>}
      {pendingCount > 0 && (
        <p className="text-sm text-fg-muted">
          {pendingCount} {pendingCount === 1 ? 'intento pendiente' : 'intentos pendientes'} de guardar; se reintentan al volver a entrar.
        </p>
      )}

      {syncedAt === null ? (
        <Card className="text-center text-fg-muted">Cargando…</Card>
      ) : current ? (
        <Card flush className="overflow-hidden">
          <div className="px-5 py-3 bg-surface-2 border-b border-hairline sm:px-6">
            <span className="font-mono text-sm tabular-nums text-fg-muted">
              ejercicio {index + 1} de {queue.length}
            </span>
          </div>
          <ItemView
            key={current.id}
            item={current}
            confidence={progress[current.id]?.confidence}
            onRecord={(correct, opts) => record(current, correct, opts)}
            onNext={goNext}
          />
        </Card>
      ) : (
        <Card className="text-center text-fg-muted">No hay ejercicios en este filtro.</Card>
      )}
    </div>
  );
};

export default ConversionDrillsTab;
