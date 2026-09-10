import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Badge } from '../../ui';
import BoardFrame from '../BoardFrame';
import { boardSquareStyles } from '../boardTheme';
import { fetchAllPositionDiagnostics } from '../../../api/client';
import type { DiagnosticCategory, PositionDiagnostic } from '../../../types/diagnostics';

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  brecha_conceptual: 'Brecha conceptual',
  jugada_inhumana: 'Jugada inhumana',
  error_propio: 'Error propio',
};

const CATEGORY_TONE: Record<DiagnosticCategory, 'accent' | 'draw' | 'loss'> = {
  brecha_conceptual: 'accent',
  jugada_inhumana: 'draw',
  error_propio: 'loss',
};

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
const DiagnosticsTab = () => {
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

  if (loading) return <p className="text-sm text-fg-muted">Cargando diagnóstico…</p>;
  if (error) return <p className="text-sm text-loss">{error}</p>;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-2 p-6 text-sm text-fg-muted">
        Todavía no hay divergencias analizadas. El análisis corre en tu máquina:{' '}
        <code className="text-fg">python3 scripts/position_diagnostics.py --source otb</code>, y
        después <code className="text-fg">--evidence</code> y <code className="text-fg">--explain</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-fg">Stockfish vs Maia-1900</h2>
        <p className="text-sm text-fg-muted">
          Dónde te separaste del motor, y por qué. Ordenado por pérdida, no por fecha.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setSelectedId(undefined);
            }}
            aria-pressed={filter === f}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-surface-2 text-fg border-hairline'
                : 'border-transparent text-fg-muted hover:bg-surface-2'
            }`}
          >
            {f === 'todas' ? 'Todas' : CATEGORY_LABEL[f]}{' '}
            <span className="tabular-nums text-fg-subtle">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {filter !== 'todas' && (
        <p className="text-xs text-fg-muted">{CATEGORY_BLURB[filter]}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_1fr]">
        <div>
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
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone={CATEGORY_TONE[selected.category]}>
                  {CATEGORY_LABEL[selected.category]}
                </Badge>
                <span className="text-sm text-fg-muted">
                  jugada {selected.moveNumber} · −{selected.cpLoss}cp
                </span>
              </div>
              <div className="text-xs text-fg-subtle">
                vs {(selected.game ?? EMPTY_GAME).opponent}
                {selected.game?.opponentElo ? ` (${selected.game.opponentElo})` : ''}
                {selected.game?.tournament ? ` · ${selected.game.tournament}` : ''}
                {shortDate(selected.game?.playedDate) ? ` · ${shortDate(selected.game?.playedDate)}` : ''}
              </div>
              <p className="text-sm text-fg">
                Jugaste <strong>{selected.movePlayed}</strong>; el motor quería{' '}
                <strong>{selected.sfTop3[0]?.moveSan}</strong>.
              </p>
              {selected.sfTop3[0]?.line && (
                <p className="font-mono text-xs text-fg-subtle">{selected.sfTop3[0].line}</p>
              )}
              {selected.explanation && (
                <p className="rounded border-l-2 border-accent/40 bg-surface-2 py-2 pl-3 text-sm leading-relaxed text-fg">
                  {selected.explanation}
                </p>
              )}
              {selected.culprits && selected.culprits.length > 0 && (
                <p className="text-xs text-fg-muted">
                  En rojo, lo que tu jugada activó:{' '}
                  {selected.culprits.map(c => `${c.piece} en ${c.square}`).join(', ')}.
                </p>
              )}
            </div>
          )}
        </div>

        <ul className="min-w-0 space-y-1 lg:max-h-[70vh] lg:overflow-y-auto">
          {shown.map(r => (
            <li key={r.id}>
              <button
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === r.id ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="tabular-nums">{r.moveNumber}.</span> {r.movePlayed}
                    <span className="text-fg-subtle"> vs {r.sfTop3[0]?.moveSan}</span>
                  </span>
                  <Badge tone={CATEGORY_TONE[r.category]}>−{r.cpLoss}</Badge>
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                  {(r.game ?? EMPTY_GAME).opponent}
                  {r.game?.openingName ? ` · ${r.game.openingName}` : ''}
                  {shortDate(r.game?.playedDate) ? ` · ${shortDate(r.game?.playedDate)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticsTab;
