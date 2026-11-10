import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Badge, Card } from '../../../ui';
import BoardFrame from '../../BoardFrame';
import { boardSquareStyles } from '../../boardTheme';
import { fetchPositionTraps } from '../../../../api/client';
import type { PositionTrap } from '../../../../types/diagnostics';

const uciFromSan = (fen: string, san: string) => {
  try {
    const move = new Chess(fen).move(san);
    return move ? { from: move.from, to: move.to } : undefined;
  } catch {
    return undefined;
  }
};

const shortDate = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);

/**
 * Dónde el rival tenía una forma natural de equivocarse.
 *
 * A diferencia del resto del diagnóstico, estas son posiciones con el RIVAL a
 * mover: la jugada que un ~1900 de Lichess elige por instinto pierde. Son
 * posiciones a las que conviene llevar la partida aunque objetivamente no sean
 * las mejores — preparación, no post-mortem.
 *
 * `fellForIt` es lo que separa una teoría de una estadística, así que va arriba
 * y no escondido en la fila.
 */
const TrapsView = () => {
  const [traps, setTraps] = useState<PositionTrap[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [onlyFallen, setOnlyFallen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPositionTraps()
      .then(setTraps)
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, []);

  const fallen = useMemo(() => traps.filter(t => t.fellForIt).length, [traps]);
  const shown = useMemo(
    () => (onlyFallen ? traps.filter(t => t.fellForIt) : traps),
    [traps, onlyFallen]
  );
  const selected = shown.find(t => t.id === selectedId) ?? shown[0];

  const arrows = useMemo(() => {
    if (!selected) return [];
    const list = [];
    // Rojo lo que juega la banda y pierde, verde lo correcto: mismo idioma de
    // color que el resto, aunque acá el que se equivoca es el rival.
    const natural = uciFromSan(selected.fen, selected.maiaMove);
    if (natural)
      list.push({ startSquare: natural.from, endSquare: natural.to, color: 'rgb(var(--loss) / 0.7)' });
    const best = uciFromSan(selected.fen, selected.bestMove);
    if (best)
      list.push({ startSquare: best.from, endSquare: best.to, color: 'rgb(var(--win) / 0.7)' });
    return list;
  }, [selected]);

  if (loading) return <p className="text-sm text-fg-muted">Cargando trampas…</p>;
  if (error) return <p className="text-sm text-loss">{error}</p>;
  if (traps.length === 0) {
    return (
      <Card>
        <p className="text-sm text-fg-muted">
          Todavía no se buscaron trampas. Corré{' '}
          <code className="font-mono text-xs text-fg">python3 scripts/position_diagnostics.py --traps --source otb</code>{' '}
          en tu máquina.
        </p>
      </Card>
    );
  }

  return (
    <Card flush>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 border-b border-hairline-strong px-5 py-4 sm:px-6">
        <h2 className="font-serif text-xl font-semibold leading-tight text-fg">Trampas para el rival</h2>
        <button
          onClick={() => setOnlyFallen(v => !v)}
          aria-pressed={onlyFallen}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
            onlyFallen
              ? 'border-transparent bg-accent/10 text-accent'
              : 'border-hairline text-fg-muted hover:text-fg'
          }`}
        >
          Solo las que cayeron <span className="font-mono tabular-nums">{fallen}</span>
        </button>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-fg-muted">
          Posiciones donde lo que juega un ~1900 de Lichess por instinto pierde. Son las que
          conviene buscar, aunque objetivamente no sean lo mejor.
        </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,var(--board-user,var(--board-fit)))_1fr]"
        style={{ '--board-fit': 'calc(100dvh - 360px)' } as CSSProperties}
      >
        <div className="min-w-0">
          {selected && (
            <>
              <BoardFrame>
                <Chessboard
                  options={{
                    position: selected.fen,
                    // Orientado desde el rival: es su turno y su error.
                    boardOrientation: selected.game.color === 'B' ? 'white' : 'black',
                    allowDragging: false,
                    showNotation: true,
                    arrows,
                    ...boardSquareStyles,
                  }}
                />
              </BoardFrame>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={selected.fellForIt ? 'win' : 'neutral'}>
                    {selected.fellForIt ? 'Cayó' : 'La esquivó'}
                  </Badge>
                  <span className="text-fg-muted">
                    jugada {selected.moveNumber} · cuesta <span className="font-mono tabular-nums">{selected.trapCp} cp</span>
                  </span>
                </div>
                <p className="text-fg">
                  Un ~1900 juega <strong className="font-serif text-base font-semibold text-loss">{selected.maiaMove}</strong>
                  {selected.maiaPolicy !== undefined
                    ? ` (${(selected.maiaPolicy * 100).toFixed(0)}% de las veces)`
                    : ''}{' '}
                  y pierde. Lo correcto era <strong className="font-serif text-base font-semibold text-win">{selected.bestMove}</strong>.
                </p>
                <p className="text-xs text-fg-subtle">
                  {selected.game.opponent}
                  {selected.game.opponentElo ? ` (${selected.game.opponentElo})` : ''} jugó{' '}
                  {selected.opponentMove}
                  {selected.game.openingName ? ` · ${selected.game.openingName}` : ''}
                  {shortDate(selected.game.playedDate) ? ` · ${shortDate(selected.game.playedDate)}` : ''}
                </p>
              </div>
            </>
          )}
        </div>

        <ul className="min-w-0 divide-y divide-hairline border-y border-hairline lg:max-h-[70vh] lg:overflow-y-auto">
          {shown.map(t => (
            <li key={t.id}>
              <button
                onClick={() => setSelectedId(t.id)}
                aria-current={selected?.id === t.id ? 'true' : undefined}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                  selected?.id === t.id ? 'bg-accent/10 text-fg' : 'text-fg-muted hover:bg-app'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-serif text-[15px]">
                    <span className="font-mono text-xs tabular-nums text-fg-subtle">{t.moveNumber}.</span>{' '}
                    <span className="text-fg">{t.maiaMove}</span>
                    <span className="text-fg-subtle"> en vez de {t.bestMove}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {t.fellForIt && <Badge tone="win">cayó</Badge>}
                    <span className="font-mono text-xs tabular-nums text-fg-muted">−{t.trapCp}</span>
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                  {t.game.opponent}
                  {t.eco ? ` · ${t.eco}` : ''}
                  {t.game.openingName ? ` · ${t.game.openingName}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </Card>
  );
};

export default TrapsView;
