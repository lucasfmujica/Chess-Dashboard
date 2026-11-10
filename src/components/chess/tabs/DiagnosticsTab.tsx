import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Badge, Card, ClockBar, StatCard } from '../../ui';
import BoardFrame from '../BoardFrame';
import { boardSquareStyles } from '../boardTheme';
import SegmentedControl from '../../ui/SegmentedControl';
import TrapsView from './diagnostics/TrapsView';
import FindingActions from './diagnostics/FindingActions';
import PatternsView from './diagnostics/PatternsView';
import { fetchAllPositionDiagnostics } from '../../../api/client';
import { useDiagnosticsQueue } from '../../../hooks/useDiagnosticsQueue';
import type { DiagnosticCategory, PositionDiagnostic } from '../../../types/diagnostics';

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  brecha_conceptual: 'Brecha conceptual',
  jugada_inhumana: 'Jugada inhumana',
  error_propio: 'Error propio',
};

/** Copias de planilla: rosa el error propio, amarillo la brecha (lo que más enseña). */
const CATEGORY_TONE: Record<DiagnosticCategory, 'today' | 'neutral' | 'alert'> = {
  brecha_conceptual: 'today',
  jugada_inhumana: 'neutral',
  error_propio: 'alert',
};

/** Evaluación en peones, con signo, como la escribe el motor. */
const evalText = (cp: number) => `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${(Math.abs(cp) / 100).toFixed(1)}`;

const CATEGORY_BLURB: Record<DiagnosticCategory, string> = {
  brecha_conceptual:
    'Jugaste lo que juega un ~1900 de Lichess (cerca de 1750-1800 FIDE) y estaba mal. Es un hábito de justo debajo de tu nivel: lo que más se puede corregir estudiando.',
  jugada_inhumana:
    'La jugada del motor casi no aparece en el repertorio de esa banda. Instructiva, pero no es un error tuyo.',
  error_propio: 'Pérdidas grandes que no explica ni el patrón humano ni la rareza de la jugada del motor.',
};

type Filter = DiagnosticCategory | 'todas';
const FILTERS: Filter[] = ['todas', 'brecha_conceptual', 'error_propio', 'jugada_inhumana'];

const uciSquares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/** `played_date` viaja como timestamp ISO completo; acá solo importa el día. */
const shortDate = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);

/**
 * El contexto de la partida llega por la red, así que se lee a la defensiva.
 * Una fila sin `game` no puede tumbar la pestaña entera: antes lo hacía, con un
 * "undefined is not an object" que dejaba la vista en blanco.
 */
const EMPTY_GAME = { opponent: 'partida desconocida', color: 'W' as const };

/**
 * El diagnóstico cruzando todas las partidas.
 *
 * El panel del tablero contesta "qué pasó en esta posición". Esto contesta la
 * otra pregunta, que es la que no se puede responder mirando una partida por
 * vez: en qué me equivoco siempre. Por eso ordena por pérdida y no por fecha, y
 * por eso la brecha conceptual va primera en los filtros.
 */
/**
 * Tres lecturas del mismo trabajo, y por eso viven juntas en vez de sumar tres
 * entradas al sidebar: mis errores, los temas que comparten, y los errores que
 * el rival podía cometer.
 */
type View = 'divergencias' | 'temas' | 'trampas';

const DiagnosticsTab = () => {
  const [view, setView] = useState<View>('divergencias');
  const pending = useDiagnosticsQueue();
  const [rows, setRows] = useState<PositionDiagnostic[]>([]);
  const [filter, setFilter] = useState<Filter>('brecha_conceptual');
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllPositionDiagnostics()
      .then(setRows)
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: rows.length };
    for (const r of rows) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [rows]);

  const shown = useMemo(
    () => (filter === 'todas' ? rows : rows.filter(r => r.category === filter)),
    [rows, filter]
  );
  const selected = shown.find(r => r.id === selectedId) ?? shown[0];

  // Verde lo que quería el motor, rojo lo que jugaste. Mismo idioma de color
  // que los drills, para no tener que aprenderlo dos veces.
  const arrows = useMemo(() => {
    if (!selected) return [];
    const list = [];
    const best = selected.sfTop3[0];
    if (best) {
      const { from, to } = uciSquares(best.moveUci);
      list.push({ startSquare: from, endSquare: to, color: 'rgb(var(--win) / 0.7)' });
    }
    try {
      const board = new Chess(selected.fen);
      const played = board.move(selected.movePlayed);
      if (played) {
        list.push({ startSquare: played.from, endSquare: played.to, color: 'rgb(var(--loss) / 0.7)' });
      }
    } catch {
      // Una jugada que no parsea no vale romper la vista: se muestra sin flecha.
    }
    return list;
  }, [selected]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    (selected?.culprits ?? []).forEach((c, i) => {
      styles[c.square] = { boxShadow: `inset 0 0 0 3px rgb(var(--loss) / ${(0.75 - i * 0.2).toFixed(2)})` };
    });
    return styles;
  }, [selected]);

  const header = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-fg-muted">
          Stockfish contra Maia-1900: qué errores son tuyos y cuáles son del nivel.
        </p>
        <SegmentedControl
          aria-label="Vista del diagnóstico"
          value={view}
          onChange={setView}
          options={[
            { value: 'divergencias', label: 'Mis divergencias' },
            { value: 'temas', label: 'Temas' },
            { value: 'trampas', label: 'Trampas' },
          ]}
        />
      </div>

      <ClockBar>
        <StatCard title="Error propio" value={loading ? '—' : counts.error_propio ?? 0} subtitle="ningún nivel de Maia lo juega" />
        <StatCard title="Brecha conceptual" value={loading ? '—' : counts.brecha_conceptual ?? 0} subtitle="Maia-1900 tampoco lo ve" />
        <StatCard title="Jugada inhumana" value={loading ? '—' : counts.jugada_inhumana ?? 0} subtitle="solo el motor la encuentra" />
        <StatCard title="Pedidos en cola" value={pending} subtitle="corren en tu máquina" />
      </ClockBar>

      {/* Pedir no dispara nada: el análisis corre local. Sin este aviso un
          pedido se queda esperando sin que nada lo diga. */}
      {pending > 0 && (
        <p className="rounded border border-hairline bg-carbon px-3 py-2 text-sm text-fg">
          {pending} partida{pending > 1 ? 's' : ''} esperando análisis. Corré{' '}
          <code className="font-mono text-xs">python3 scripts/position_diagnostics.py --requested</code> en tu
          máquina.
        </p>
      )}
    </div>
  );

  if (view === 'temas') return <div className="space-y-6">{header}<PatternsView /></div>;
  if (view === 'trampas') return <div className="space-y-6">{header}<TrapsView /></div>;

  if (loading) return <div className="space-y-6">{header}<p className="text-sm text-fg-muted">Cargando diagnóstico…</p></div>;
  if (error) return <div className="space-y-6">{header}<p className="text-sm text-loss">{error}</p></div>;
  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <p className="text-sm text-fg-muted">
            Todavía no hay divergencias analizadas. El análisis corre en tu máquina:{' '}
            <code className="font-mono text-xs text-fg">python3 scripts/position_diagnostics.py --source otb</code>, y
            después <code className="font-mono text-xs text-fg">--evidence</code> y <code className="font-mono text-xs text-fg">--explain</code>.
          </p>
        </Card>
      </div>
    );
  }

  const best = selected?.sfTop3[0];
  const maiaShare =
    selected && selected.maiaTopMove === selected.movePlayed
      ? selected.maiaPolicyPlayed
      : selected && best && selected.maiaTopMove === best.moveSan
        ? selected.maiaPolicySfTop
        : undefined;

  return (
    <div className="space-y-6">
      {header}

      <Card flush>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline-strong px-5 pt-4 sm:px-6">
          <h2 className="pb-3 font-serif text-xl font-semibold leading-tight text-fg">Mis divergencias</h2>
          <SegmentedControl
            aria-label="Filtrar por categoría"
            size="sm"
            value={filter}
            onChange={f => {
              setFilter(f);
              setSelectedId(undefined);
            }}
            options={FILTERS.map(f => ({
              value: f,
              label: (
                <>
                  {f === 'todas' ? 'Todas' : CATEGORY_LABEL[f]}
                  <span className="font-mono tabular-nums text-fg-subtle">{counts[f] ?? 0}</span>
                </>
              ),
            }))}
            className="border-b-0"
          />
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {filter !== 'todas' && <p className="text-sm text-fg-muted">{CATEGORY_BLURB[filter]}</p>}
          <p className="text-xs text-fg-subtle">Ordenado por pérdida, no por fecha. Maia usa rating de Lichess (~1750–1800 FIDE).</p>

          <div
            className="grid gap-6 lg:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_1fr]"
            style={{ '--board-fit': 'calc(100dvh - 360px)' } as CSSProperties}
          >
            <div className="min-w-0">
              {selected && (
                <BoardFrame>
                  <Chessboard
                    options={{
                      position: selected.fen,
                      boardOrientation: (selected.game ?? EMPTY_GAME).color === 'B' ? 'black' : 'white',
                      allowDragging: false,
                      showNotation: true,
                      arrows,
                      squareStyles,
                      ...boardSquareStyles,
                    }}
                  />
                </BoardFrame>
              )}
              {selected && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={CATEGORY_TONE[selected.category]}>{CATEGORY_LABEL[selected.category]}</Badge>
                    <span className="text-xs text-fg-subtle">
                      vs {(selected.game ?? EMPTY_GAME).opponent}
                      {selected.game?.opponentElo ? ` (${selected.game.opponentElo})` : ''}
                      {selected.game?.tournament ? ` · ${selected.game.tournament}` : ''}
                      {` · jugada ${selected.moveNumber}`}
                      {shortDate(selected.game?.playedDate) ? ` · ${shortDate(selected.game?.playedDate)}` : ''}
                    </span>
                  </div>

                  <dl className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 gap-y-1.5">
                    <dt className="text-label">Jugaste</dt>
                    <dd className="font-serif text-[17px] leading-6 text-loss">{selected.movePlayed}</dd>
                    <dd className="text-right font-mono text-sm tabular-nums text-loss">
                      {best ? evalText(best.evalCp - selected.cpLoss) : `−${selected.cpLoss} cp`}
                    </dd>
                    <dt className="text-label">Stockfish</dt>
                    <dd className="font-serif text-[17px] leading-6 text-fg">{best?.moveSan ?? '—'}</dd>
                    <dd className="text-right font-mono text-sm tabular-nums text-fg">{best ? evalText(best.evalCp) : ''}</dd>
                    <dt className="text-label">Maia-1900</dt>
                    <dd className="font-serif text-[17px] leading-6 text-fg">
                      {selected.maiaTopMove}
                      {selected.maiaTopMove === selected.movePlayed && (
                        <span className="ml-1 font-sans text-xs text-fg-subtle">(igual que vos)</span>
                      )}
                    </dd>
                    <dd className="text-right font-mono text-sm tabular-nums text-fg-subtle">
                      {maiaShare !== undefined ? `${Math.round(maiaShare * 100)} %` : ''}
                    </dd>
                  </dl>

                  {best?.line && <p className="font-serif text-sm text-fg-subtle">{best.line}</p>}
                  {selected.explanation && (
                    <p className="font-serif text-[15px] italic leading-relaxed text-accent">{selected.explanation}</p>
                  )}
                  {selected.culprits && selected.culprits.length > 0 && (
                    <p className="text-xs text-fg-muted">
                      Recuadrado, lo que tu jugada activó:{' '}
                      {selected.culprits.map(c => `${c.piece} en ${c.square}`).join(', ')}.
                    </p>
                  )}
                  {/* El paso que faltaba: de saber en qué me equivoco, a entrenarlo. */}
                  <FindingActions key={selected.id} finding={selected} />
                </div>
              )}
            </div>

            <ul className="min-w-0 divide-y divide-hairline border-y border-hairline lg:max-h-[70vh] lg:overflow-y-auto">
              {shown.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    aria-current={selected?.id === r.id ? 'true' : undefined}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                      selected?.id === r.id ? 'bg-accent/10 text-fg' : 'text-fg-muted hover:bg-app'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-serif text-[15px]">
                        <span className="font-mono text-xs tabular-nums text-fg-subtle">{r.moveNumber}.</span>{' '}
                        <span className="text-fg">{r.movePlayed}</span>
                        <span className="text-fg-subtle"> en vez de {r.sfTop3[0]?.moveSan}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-loss">−{r.cpLoss}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 truncate text-xs text-fg-subtle">
                      <Badge tone={CATEGORY_TONE[r.category]}>{CATEGORY_LABEL[r.category]}</Badge>
                      <span className="truncate">
                        {(r.game ?? EMPTY_GAME).opponent}
                        {r.game?.openingName ? ` · ${r.game.openingName}` : ''}
                        {shortDate(r.game?.playedDate) ? ` · ${shortDate(r.game?.playedDate)}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DiagnosticsTab;
