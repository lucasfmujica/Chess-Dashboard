import { useCallback, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, StarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import {
  fetchExplorerTopGames,
  fetchMasterGamePgn,
  postModelGame,
  type ExplorerTopGame,
} from '../../../../api/client';
import { useRepertoireLines } from '../../../../context/RepertoireLinesContext';
import { Button, Badge } from '../../../ui';
import type { RepertoireLine } from '../../../../types/chess';

/**
 * Finds the master games behind a prepared line, and the players worth calling
 * its hero.
 *
 * Both used to be manual: `model_games` was a paste-a-PGN form (it held zero
 * rows) and `opening_heroes` was a free-text name box, which is why nine of
 * the repertoire's openings had nobody attached. The masters explorer answers
 * both questions from the same call — whoever reaches your position at 2500+
 * IS the hero, and their game is the model game — and every chapter already
 * stores the `key_fen` to ask about.
 */

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

type OpeningHeroes = Record<string, string[]>;

interface MasterGameFinderProps {
  openingHeroes: OpeningHeroes;
  setOpeningHeroes: (value: OpeningHeroes) => Promise<void> | void;
  /** Reloads the stored model games after a save. */
  onSaved: () => Promise<void> | void;
}

const resultOf = (game: ExplorerTopGame): string =>
  game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '1/2-1/2';

/** The Event tag, which the explorer's game list does not carry but the PGN does. */
const eventFromPgn = (pgn: string): string | undefined =>
  /\[Event\s+"([^"]*)"\]/.exec(pgn)?.[1]?.trim() || undefined;

/** The player on your side of the board — the one you would be studying. */
const heroSide = (game: ExplorerTopGame, color: 'W' | 'B') =>
  color === 'W' ? game.white : game.black;

const MasterGameFinder = ({ openingHeroes, setOpeningHeroes, onSaved }: MasterGameFinderProps) => {
  const { lines } = useRepertoireLines();
  const [lineId, setLineId] = useState('');
  const [games, setGames] = useState<ExplorerTopGame[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  /** Only chapters with a stored position can be asked about. */
  const options = useMemo(
    () =>
      lines
        .filter(l => !!l.keyFen)
        .sort((a, b) => (a.lineName ?? '').localeCompare(b.lineName ?? '')),
    [lines]
  );

  const line: RepertoireLine | undefined = options.find(l => l.id === lineId);

  const search = useCallback(async () => {
    if (!line?.keyFen) return;
    setSearching(true);
    setError(null);
    setSaved(null);
    setSelected(new Set());
    try {
      setGames(await fetchExplorerTopGames(line.keyFen, 15));
    } catch (err) {
      setGames(null);
      setError(err instanceof Error ? err.message : 'No se pudo consultar el explorador');
    } finally {
      setSearching(false);
    }
  }, [line]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addHero = useCallback(
    async (eco: string, name: string) => {
      const current = openingHeroes[eco] ?? [];
      if (current.includes(name)) return;
      await setOpeningHeroes({ ...openingHeroes, [eco]: [...current, name] });
    },
    [openingHeroes, setOpeningHeroes]
  );

  const saveSelected = useCallback(async () => {
    if (!line?.eco || !games || selected.size === 0) return;
    setSaving(true);
    setError(null);
    const eco = line.eco;
    try {
      let stored = 0;
      for (const game of games.filter(g => selected.has(g.id))) {
        const pgn = await fetchMasterGamePgn(game.id);
        if (!pgn.trim()) continue;
        const hero = heroSide(game, line.color).name;
        await postModelGame({
          eco,
          hero,
          event: eventFromPgn(pgn),
          year: game.year,
          result: resultOf(game),
          pgn: pgn.trim(),
          note: line.lineName,
        });
        // Storing a game without its player leaves the gallery still empty for
        // this opening, which is the hole this is meant to close.
        await addHero(eco, hero);
        stored += 1;
      }
      setSelected(new Set());
      setSaved(`${stored} partida${stored === 1 ? '' : 's'} guardada${stored === 1 ? '' : 's'}.`);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las partidas');
    } finally {
      setSaving(false);
    }
  }, [line, games, selected, addHero, onSaved]);

  return (
    <div className="mt-4 rounded-lg border border-hairline bg-surface-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[260px] flex-1">
          <span className="text-label">Capítulo</span>
          <select
            className={`${INPUT_CLASS} mt-1`}
            value={lineId}
            onChange={e => {
              setLineId(e.target.value);
              setGames(null);
              setSaved(null);
              setError(null);
            }}
          >
            <option value="">Elegí un capítulo…</option>
            {options.map(l => (
              <option key={l.id} value={l.id}>
                {l.lineName ?? l.eco}
              </option>
            ))}
          </select>
        </label>
        <Button icon={MagnifyingGlassIcon} onClick={search} disabled={!line || searching}>
          {searching ? 'Buscando…' : 'Buscar en maestros'}
        </Button>
      </div>

      {options.length === 0 && (
        <p className="mt-3 text-sm text-fg-muted">
          Ningún capítulo tiene posición clave guardada, que es lo que se consulta.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      {saved && <p className="mt-3 text-sm text-win">{saved}</p>}

      {games && games.length === 0 && (
        <p className="mt-3 text-sm text-fg-muted">
          El explorador no tiene partidas de maestros en esa posición. Suele pasar en las líneas
          más profundas — probá con un capítulo cuya posición clave sea más temprana.
        </p>
      )}

      {games && games.length > 0 && line && (
        <>
          <p className="mt-4 mb-2 text-xs text-fg-subtle">
            {games.length} partidas. Se guardan a nombre de quien llevó las{' '}
            {line.color === 'W' ? 'blancas' : 'negras'}, que es el lado que estudiás.
          </p>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {games.map(game => {
              const hero = heroSide(game, line.color);
              const alreadyHero = (openingHeroes[line.eco ?? ''] ?? []).includes(hero.name);
              return (
                <li
                  key={game.id}
                  className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(game.id)}
                    onChange={() => toggle(game.id)}
                    aria-label={`Guardar ${game.white.name} vs ${game.black.name}`}
                    className="shrink-0 accent-[rgb(var(--accent))]"
                  />
                  <span className="min-w-0 flex-1 truncate text-fg">
                    <span className={line.color === 'W' ? 'font-semibold' : ''}>
                      {game.white.name}
                    </span>
                    <span className="text-fg-subtle"> ({game.white.rating}) vs </span>
                    <span className={line.color === 'B' ? 'font-semibold' : ''}>
                      {game.black.name}
                    </span>
                    <span className="text-fg-subtle"> ({game.black.rating})</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-fg-muted">{game.year ?? ''}</span>
                  <Badge tone="neutral">{resultOf(game)}</Badge>
                  <button
                    onClick={() => void addHero(line.eco ?? '', hero.name)}
                    disabled={alreadyHero || !line.eco}
                    title={alreadyHero ? 'Ya es héroe de esta apertura' : 'Sumar como héroe'}
                    className="shrink-0 inline-flex items-center gap-1 rounded border border-hairline px-2 py-1 text-fg hover:border-accent disabled:opacity-40"
                  >
                    <StarIcon className="h-3.5 w-3.5" />
                    {alreadyHero ? 'Héroe' : 'Héroe'}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <Button
              icon={ArrowDownTrayIcon}
              onClick={saveSelected}
              disabled={selected.size === 0 || saving}
            >
              {saving
                ? 'Guardando…'
                : `Guardar ${selected.size} partida${selected.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MasterGameFinder;
