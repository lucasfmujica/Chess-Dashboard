import { useEffect, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Badge, Button } from '../../../ui';
import { usePositionDiagnostics } from '../../../../hooks/usePositionDiagnostics';
import { useDiagnosticChat } from '../../../../hooks/useDiagnosticChat';
import FindingActions from '../diagnostics/FindingActions';
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

const CATEGORY_TONE: Record<DiagnosticCategory, 'today' | 'neutral' | 'alert'> = {
  // Copias de planilla: la brecha, que es la que más enseña, va en amarillo;
  // el error propio en rosa, como un blunder.
  brecha_conceptual: 'today',
  jugada_inhumana: 'neutral',
  error_propio: 'alert',
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
      {/* Los escalones van sin número: recortar el rating a dos dígitos los hacía
          leer como "11 a 19". El rating completo está en el tooltip, y los
          extremos alcanzan para ubicar la escala. */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] tabular-nums text-fg-subtle">1100</span>
        <div className="flex flex-1 gap-0.5">
          {rungs.map(rung => (
            <div
              key={rung.rating}
              title={`${rung.rating}: ${
                rung.playedIsTop ? 'tu jugada es su primera opción' : `juega ${rung.topMove}`
              } — policy ${(rung.played * 100).toFixed(1)}%`}
              className={`h-3 flex-1 rounded-sm ${
                rung.playedIsTop ? 'bg-loss/40' : 'bg-surface border border-hairline'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] tabular-nums text-fg-subtle">1900</span>
      </div>
      <p className="mt-1 font-serif text-sm italic text-accent">
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

/**
 * Preguntas sobre esta posición, contestadas con el Stockfish del navegador.
 *
 * Se monta con `key` por diagnóstico, así que cambiar de posición descarta el
 * hilo en vez de arrastrar un contexto que ya no aplica.
 *
 * Muestra qué líneas evaluó para contestar. No es decoración: el modelo tiene
 * prohibido analizar de su cabeza, y esa lista es la única forma de ver si
 * cumplió.
 */
const PositionChat = ({
  fen,
  diagnostic,
}: {
  fen: string;
  /** Cuando la posición está diagnosticada, se le pasa como contexto. */
  diagnostic?: PositionDiagnostic;
}) => {
  const { turns, thinking, progress, round, error, ask } = useDiagnosticChat(fen);
  const [draft, setDraft] = useState('');
  // Reloj propio: el hook guarda cuándo arrancó la vuelta, pero sin un tick la
  // pantalla se quedaría con el número del primer render.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!thinking) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [thinking]);

  const context = diagnostic
    ? [
        `Posición (FEN): ${diagnostic.fen}`,
        `Lucas jugó ${diagnostic.movePlayed} y perdió ${diagnostic.cpLoss} centipeones.`,
        `Stockfish quería ${diagnostic.sfTop3[0]?.moveSan}${
          diagnostic.sfTop3[0]?.line ? ` (${diagnostic.sfTop3[0].line})` : ''
        }.`,
        `Maia-1900 juega ${diagnostic.maiaTopMove}.`,
      ].join('\n')
    : `Posición (FEN): ${fen}\nEsta posición no está diagnosticada: no hay nada precalculado sobre ella, evaluá lo que necesites.`;

  const send = () => {
    const question = draft.trim();
    if (!question || thinking) return;
    setDraft('');
    void ask(question, context);
  };

  return (
    <div className="pt-2 border-t border-hairline space-y-2">
      {turns.map((t, i) => (
        <div key={i} className={t.role === 'user' ? 'text-xs text-fg-muted' : 'text-xs text-fg'}>
          <span className="text-fg-subtle">{t.role === 'user' ? 'Vos: ' : ''}</span>
          {t.text}
          {t.evaluated && t.evaluated.length > 0 && (
            <p className="mt-0.5 font-serif text-[11px] text-fg-subtle">
              evaluó: {t.evaluated.join(' · ')}
            </p>
          )}
        </div>
      ))}
      {thinking && (
        <p className="text-xs text-fg-subtle" aria-live="polite">
          {progress ? `Evaluando ${progress}…` : `Pensando (vuelta ${round?.n ?? 1})…`}
          {round && (
            <span className="tabular-nums">
              {' '}
              {Math.max(0, Math.round((Date.now() - round.since) / 1000) + tick * 0)}s
            </span>
          )}
        </p>
      )}
      {error && <p className="text-xs text-loss">{error}</p>}
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="¿Y si jugaba otra cosa?"
          aria-label="Preguntar sobre esta posición"
          className="h-8 min-w-0 flex-1 rounded border border-hairline bg-surface px-2.5 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <Button size="sm" onClick={send} disabled={thinking || !draft.trim()}>
          Preguntar
        </Button>
      </div>
    </div>
  );
};

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

  // Sin partida guardada no hay diagnóstico que buscar, pero preguntarle al
  // motor sobre la posición sigue teniendo sentido — por ejemplo sobre un PGN
  // pegado en el Analysis Board.
  if (!gameId) {
    return (
      <section className="rounded border border-hairline bg-surface p-4" aria-label="Preguntar sobre esta posición">
        <p className="text-label mb-1">Preguntar sobre esta posición</p>
        <PositionChat key={position.ply} fen={position.fen} />
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded border border-hairline bg-surface p-4" aria-label="Diagnóstico de la posición">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
        <h4 className="font-serif text-lg font-semibold leading-tight text-fg">Stockfish contra Maia-1900</h4>
        {state === 'pedida' && <Badge tone="accent">Pedida</Badge>}
        {state === 'analizada' && run && (
          <Badge tone="neutral">
            <span className="font-mono tabular-nums">{run.findings} en {run.positions} pos. · prof. {run.depth}</span>
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
        <div className="space-y-2 rounded border border-hairline bg-app p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span title={CATEGORY_HINT[current.category]}>
              <Badge tone={CATEGORY_TONE[current.category]}>
                {CATEGORY_LABEL[current.category]}
              </Badge>
            </span>
            <span className="font-mono text-xs tabular-nums text-loss">−{current.cpLoss} cp</span>
            <span className="ml-auto font-mono text-xs tabular-nums text-fg-subtle">
              jugada {current.moveNumber}
            </span>
          </div>
          {/* Sin explicación propia, el texto de la categoría es lo único que hay.
              Con explicación, sería repetir en general lo que ya se dijo en
              concreto — ahí queda solo en el tooltip del badge. */}
          {!current.explanation && (
            <p className="text-xs text-fg-muted">{CATEGORY_HINT[current.category]}</p>
          )}
          {/* La explicación primero: es la respuesta a "por qué", y los números
              de abajo son la evidencia que la sostiene. */}
          {current.explanation && (
            <p className="font-serif text-[15px] italic leading-relaxed text-accent">
              {current.explanation}
            </p>
          )}
          <p className="text-xs text-fg-muted">
            Jugaste <strong className="font-serif text-sm font-semibold text-loss">{current.movePlayed}</strong>
            <span className="text-fg-subtle"> ({pct(current.maiaPolicyPlayed)} en Maia)</span>
            {current.maiaTopMove === current.movePlayed ? (
              <span title="Rating de Lichess: ~1750-1800 FIDE">
                , que es justo lo que juega Maia-1900.
              </span>
            ) : (
              <span title="Rating de Lichess: ~1750-1800 FIDE">
                ; Maia-1900 juega <strong className="font-serif text-sm font-semibold text-fg">{current.maiaTopMove}</strong>.
              </span>
            )}
          </p>
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
              aria-expanded={showLines}
              className="flex w-full items-center gap-1 text-xs text-fg-subtle hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronRightIcon
                className={`w-3 h-3 transition-transform ${showLines ? 'rotate-90' : ''}`}
              />
              Stockfish · la mejor tiene {pct(current.maiaPolicySfTop)} de policy en Maia
            </button>
            {showLines && (
            <ol className="mt-1.5 space-y-1.5">
              {current.sfTop3.map(c => (
                <li key={c.rank} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className={c.rank === 1 ? 'font-serif text-sm font-semibold text-fg' : 'font-serif text-sm text-fg-muted'}>
                      {c.rank}. {c.moveSan}
                      {c.maiaPolicy !== undefined && (
                        <span className="text-fg-subtle"> · {pct(c.maiaPolicy)} en Maia</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-fg-subtle">{evalLabel(c.evalCp)}</span>
                  </div>
                  {/* La línea es la explicación: sin ella "Bf5 era mejor" no
                      dice por qué. */}
                  {c.line && (
                    <p className="mt-0.5 font-serif text-xs leading-snug text-fg-subtle">
                      {c.line}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            )}
          </div>
          {current.maiaLadder && current.maiaLadder.length > 0 && (
            <MaiaLadder rungs={current.maiaLadder} />
          )}

          <FindingActions key={`acciones-${current.id}`} finding={current} />
        </div>
      )}

      {diagnostics.length > 0 && (
        <ul className="space-y-1">
          {diagnostics.map(d => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => position.goTo(d.ply - 1)}
                aria-current={atDecisionPoint(d) ? 'true' : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  atDecisionPoint(d) ? 'bg-carbon text-fg' : 'text-fg-muted hover:bg-app'
                }`}
              >
                <span className="font-serif">
                  <span className="font-mono text-xs tabular-nums text-fg-subtle">{d.moveNumber}.</span> {d.movePlayed}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-serif text-fg-subtle">{d.sfTop3[0]?.moveSan}</span>
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

      {/* Fuera del bloque del hallazgo a propósito: preguntar sobre una posición
          no tiene por qué depender de que el pipeline la haya marcado. Cuando hay
          diagnóstico se le pasa como contexto; cuando no, el modelo igual puede
          contestar, porque su fuente es el motor del navegador y no lo que sabe. */}
      <PositionChat key={position.ply} fen={position.fen} diagnostic={current} />
    </section>
  );
};

export default DiagnosticsPanel;
