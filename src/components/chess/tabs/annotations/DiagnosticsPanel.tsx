import { useEffect, useState } from 'react';
import { BeakerIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Badge, Button } from '../../../ui';
import { usePositionDiagnostics } from '../../../../hooks/usePositionDiagnostics';
import type { BoardPosition } from '../../GameViewer';
import type {
  DiagnosticCategory,
  MaiaRung,
  PositionDiagnostic,
} from '../../../../types/diagnostics';

export interface BoardMarks {
  arrows?: { from: string; to: string; color: string }[];
  squares?: { square: string; color: string }[];
}

interface DiagnosticsPanelProps {
  position: BoardPosition;
  /** `games.id` de la partida abierta. Sin él no hay nada que pedir ni mostrar. */
  gameId?: string;
  /**
   * Sube al tablero la jugada que quería el motor y las piezas culpables. El
   * panel se renderiza adentro de GameViewer, así que la única forma de pintar
   * el tablero es que el padre sostenga esto.
   */
  onMarks?: (marks: BoardMarks) => void;
}

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  brecha_conceptual: 'Brecha conceptual',
  jugada_inhumana: 'Jugada inhumana',
  error_propio: 'Error propio',
};

const CATEGORY_TONE: Record<DiagnosticCategory, 'accent' | 'draw' | 'loss'> = {
  // La brecha es la que más enseña, así que se lleva el color de acento.
  brecha_conceptual: 'accent',
  jugada_inhumana: 'draw',
  error_propio: 'loss',
};

const CATEGORY_HINT: Record<DiagnosticCategory, string> = {
  // Maia usa rating de Lichess, no FIDE: su 1900 es del orden de 1750-1800
  // FIDE, algo por debajo del nivel de Lucas. Los textos lo dicen así en vez de
  // "un 1900", que se leería como si fuera su mismo nivel.
  brecha_conceptual:
    'Jugaste lo que juega un ~1900 de Lichess (cerca de 1750-1800 FIDE), y estaba mal. No fue un descuido: es un hábito de justo debajo de tu nivel que todavía no soltaste.',
  jugada_inhumana:
    'La jugada del motor casi no aparece en el repertorio de un ~1900 de Lichess. Instructiva, pero no es un error tuyo.',
  error_propio: 'Una pérdida grande que no explica ni el patrón humano ni la rareza de la jugada del motor.',
};

const pct = (value?: number) => (value === undefined ? '—' : `${(value * 100).toFixed(1)}%`);

const evalLabel = (cp: number) => `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;

/**
 * La escalera de Maia como una tira de escalones, 1100 a 1900.
 *
 * Un escalón lleno significa que a ese nivel mi jugada sigue siendo la primera
 * opción. Dónde se corta la racha es la lectura: si se corta abajo, el error ya
 * no se comete a niveles menores y es un descuido mío. Si llega entera hasta
 * 1900, es un hábito compartido por toda la banda de justo debajo mío.
 *
 * Son ratings de LICHESS: 1900 acá es del orden de 1750-1800 FIDE, así que la
 * escalera no dice nada sobre lo que haría alguien por encima de eso.
 */
const MaiaLadder = ({ rungs }: { rungs: MaiaRung[] }) => {
  const stillPlayed = rungs.filter(r => r.playedIsTop);
  const highest = stillPlayed.length ? Math.max(...stillPlayed.map(r => r.rating)) : undefined;
  const lowest = stillPlayed.length ? Math.min(...stillPlayed.map(r => r.rating)) : undefined;

  return (
    <div className="pt-1 border-t border-hairline">
      <p className="text-xs text-fg-subtle mb-1">
        ¿A qué nivel se sigue jugando tu jugada?{' '}
        <span title="Maia usa rating de Lichess, no FIDE">(rating de Lichess)</span>
      </p>
      <div className="flex gap-0.5">
        {rungs.map(rung => (
          <div
            key={rung.rating}
            title={`${rung.rating}: ${
              rung.playedIsTop ? 'tu jugada es su primera opción' : `juega ${rung.topMove}`
            } — policy ${(rung.played * 100).toFixed(1)}%`}
            className={`flex-1 rounded-sm text-center text-[10px] leading-4 ${
              rung.playedIsTop ? 'bg-loss/25 text-fg' : 'bg-surface text-fg-subtle'
            }`}
          >
            {String(rung.rating).slice(0, 2)}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        {highest === undefined ? (
          <>Ningún nivel de Maia juega esto: es un error tuyo, no del nivel.</>
        ) : highest === 1900 && lowest === 1100 ? (
          <>Se juega en toda la escalera, de 1100 a 1900: es un hábito de la banda entera.</>
        ) : highest === 1900 ? (
          <>Se sigue jugando hasta arriba de la escalera (desde {lowest}).</>
        ) : (
          <>Deja de jugarse a partir de {highest + 100}: por encima de ese nivel ya no se comete.</>
        )}
      </p>
    </div>
  );
};

/**
 * Diagnóstico de la partida sobre el tablero.
 *
 * Se engancha en el slot `capture` de GameViewer, así que ve el ply que se está
 * mirando. Un diagnóstico de ply N corresponde a la decisión tomada en la
 * posición ANTERIOR, o sea el ply N-1 del replay: por eso "Ver en el tablero"
 * navega a `ply - 1` y el detalle se abre cuando el tablero está justo ahí.
 */
const DiagnosticsPanel = ({ position, gameId, onMarks }: DiagnosticsPanelProps) => {
  const { diagnostics, run, state, loading, error, request } = usePositionDiagnostics(gameId);
  // Las tres líneas de Stockfish son la evidencia, no la respuesta: plegadas por
  // defecto para que la explicación no quede sepultada bajo una pared de cifras.
  const [showLines, setShowLines] = useState(false);

  const atDecisionPoint = (d: PositionDiagnostic) => position.ply === d.ply - 1;
  const current = diagnostics.find(atDecisionPoint);

  // Pintar el tablero cuando el usuario llega a una posición diagnosticada, y
  // limpiarlo cuando se va. Depende del id y no del objeto, que se re-crea en
  // cada fetch y volvería a disparar esto sin que haya cambiado nada.
  const currentId = current?.id;
  useEffect(() => {
    if (!onMarks) return;
    if (!current) {
      onMarks({});
      return;
    }
    onMarks({
      arrows: current.sfTop3[0]
        ? [
            {
              from: current.sfTop3[0].moveUci.slice(0, 2),
              to: current.sfTop3[0].moveUci.slice(2, 4),
              color: 'rgb(var(--win) / 0.75)',
            },
          ]
        : [],
      // La pieza más culpable primero, con el recuadro más fuerte.
      squares: (current.culprits ?? []).map((c, i) => ({
        square: c.square,
        color: `rgb(var(--loss) / ${(0.75 - i * 0.2).toFixed(2)})`,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, onMarks]);

  if (!gameId) return null;

  return (
    <div className="rounded-lg border border-hairline bg-surface-2 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BeakerIcon className="w-4 h-4 text-fg-muted" />
          <span className="text-sm font-semibold text-fg">Stockfish vs Maia-1900</span>
        </div>
        {state === 'pedida' && <Badge tone="accent">Pedida</Badge>}
        {state === 'analizada' && run && (
          <Badge tone="neutral">
            {run.findings} en {run.positions} pos. · prof. {run.depth}
          </Badge>
        )}
      </div>

      {loading && <p className="text-xs text-fg-subtle">Cargando…</p>}
      {error && <p className="text-xs text-loss">{error}</p>}

      {state === 'sin-analizar' && !loading && (
        <>
          <p className="text-xs text-fg-muted">
            Esta partida no está analizada. El análisis corre en tu máquina, no acá: pedirlo la
            deja encolada y aparece la próxima vez que corras{' '}
            <code className="text-fg">position_diagnostics.py --requested</code>.
          </p>
          <Button size="sm" variant="primary" onClick={() => request()}>
            Pedir análisis
          </Button>
        </>
      )}

      {state === 'pedida' && (
        <p className="text-xs text-fg-muted">
          Encolada. Corré <code className="text-fg">position_diagnostics.py --requested</code> en
          tu máquina para analizarla.
        </p>
      )}

      {state === 'analizada' && diagnostics.length === 0 && !loading && (
        <p className="text-xs text-fg-muted">
          Analizada, sin divergencias que superen los umbrales. En esta partida no te separaste del
          motor de una forma que valga la pena estudiar.
        </p>
      )}

      {current && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={CATEGORY_TONE[current.category]}>{CATEGORY_LABEL[current.category]}</Badge>
            <span className="text-xs text-fg-muted">−{current.cpLoss}cp</span>
          </div>
          <p className="text-xs text-fg-muted">{CATEGORY_HINT[current.category]}</p>
          {/* La explicación primero: es la respuesta a "por qué", y los números
              de abajo son la evidencia que la sostiene. */}
          {current.explanation && (
            <p className="rounded border-l-2 border-accent/40 bg-surface/60 py-1.5 pl-2 text-xs leading-relaxed text-fg">
              {current.explanation}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-fg-subtle">Jugaste</dt>
            <dd className="text-fg font-medium">
              {current.movePlayed}{' '}
              <span className="text-fg-subtle">({pct(current.maiaPolicyPlayed)} en Maia)</span>
            </dd>
            <dt className="text-fg-subtle" title="Rating de Lichess: ~1750-1800 FIDE">
              Maia-1900 juega
            </dt>
            <dd className="text-fg font-medium">{current.maiaTopMove}</dd>
          </dl>
          {current.culprits && current.culprits.length > 0 && (
            <p className="text-xs text-fg-muted">
              Marcado en rojo lo que tu jugada activó:{' '}
              {current.culprits.map(c => `${c.piece} en ${c.square}`).join(', ')}. En verde, la
              jugada del motor.
            </p>
          )}

          <div className="pt-1 border-t border-hairline">
            <button
              type="button"
              onClick={() => setShowLines(v => !v)}
              className="flex w-full items-center gap-1 text-xs text-fg-subtle hover:text-fg"
            >
              <ChevronRightIcon
                className={`w-3 h-3 transition-transform ${showLines ? 'rotate-90' : ''}`}
              />
              Stockfish · la mejor tiene {pct(current.maiaPolicySfTop)} de policy en Maia
            </button>
            <ol className={`space-y-1.5 ${showLines ? 'mt-1.5' : 'hidden'}`}>
              {current.sfTop3.map(c => (
                <li key={c.rank} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className={c.rank === 1 ? 'text-fg font-medium' : 'text-fg-muted'}>
                      {c.rank}. {c.moveSan}
                      {c.maiaPolicy !== undefined && (
                        <span className="text-fg-subtle"> · {pct(c.maiaPolicy)} en Maia</span>
                      )}
                    </span>
                    <span className="text-fg-subtle tabular-nums">{evalLabel(c.evalCp)}</span>
                  </div>
                  {/* La línea es la explicación: sin ella "Bf5 era mejor" no
                      dice por qué. */}
                  {c.line && (
                    <p className="mt-0.5 font-mono text-[11px] leading-snug text-fg-subtle">
                      {c.line}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
          {current.maiaLadder && current.maiaLadder.length > 0 && (
            <MaiaLadder rungs={current.maiaLadder} />
          )}
        </div>
      )}

      {diagnostics.length > 0 && (
        <ul className="space-y-1">
          {diagnostics.map(d => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => position.goTo(d.ply - 1)}
                className={`w-full flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-left hover:bg-surface ${
                  atDecisionPoint(d) ? 'bg-surface text-fg' : 'text-fg-muted'
                }`}
              >
                <span className="tabular-nums">
                  {d.moveNumber}. {d.movePlayed}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-fg-subtle">{d.sfTop3[0]?.moveSan}</span>
                  <Badge tone={CATEGORY_TONE[d.category]}>−{d.cpLoss}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state === 'analizada' && (
        <Button size="sm" variant="ghost" onClick={() => request(true)}>
          Re-analizar
        </Button>
      )}
    </div>
  );
};

export default DiagnosticsPanel;
