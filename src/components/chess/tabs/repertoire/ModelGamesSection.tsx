import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlayCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { fetchModelGames, postModelGame, deleteModelGame } from '../../../../api/client';
import { ecoNames } from '../../../../constants/ecoNames';
import { useModal } from '../../../modals/ModalContext';
import { Card, Button, Badge } from '../../../ui';
import GameViewer from '../../GameViewer';
import ConceptQuickAdd from '../../ConceptQuickAdd';
import type { ModelGame } from '../../../../types/chess';

/**
 * The study material behind each hero.
 *
 * The gallery listed names and nothing else — `opening_heroes` is literally
 * `eco -> string[]`, so "Rapport plays this" was the whole record and there
 * was no way to actually look at a game of his. This attaches games to the
 * name: paste a PGN, replay it on the same viewer as your own games (engine
 * and explorer included), and create a concept straight from it, which is
 * what Friday's concepts block is supposed to be fed by.
 */

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

interface ModelGamesSectionProps {
  /** eco -> heroes, so the pickers offer what's already tracked. */
  openingHeroes: Record<string, string[]>;
}

const openingLabel = (eco: string) => ecoNames[eco] || eco;

const ModelGamesSection = ({ openingHeroes }: ModelGamesSectionProps) => {
  const modal = useModal();
  const [games, setGames] = useState<ModelGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<ModelGame | null>(null);

  const [eco, setEco] = useState('');
  const [hero, setHero] = useState('');
  const [event, setEvent] = useState('');
  const [year, setYear] = useState('');
  const [result, setResult] = useState('');
  const [pgn, setPgn] = useState('');
  const [note, setNote] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setGames(await fetchModelGames());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las partidas modelo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** ECOs that have at least one hero — the ones worth attaching games to. */
  const ecoOptions = useMemo(
    () =>
      Object.entries(openingHeroes)
        .filter(([, heroes]) => heroes.length > 0)
        .map(([code]) => ({ eco: code, name: openingLabel(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [openingHeroes]
  );

  /** Heroes for the chosen ECO; free text stays possible for anyone else. */
  const heroOptions = useMemo(() => openingHeroes[eco] ?? [], [openingHeroes, eco]);

  /** Grouped by opening, so a hero's games sit under the line they illustrate. */
  const byEco = useMemo(() => {
    const map = new Map<string, ModelGame[]>();
    games.forEach(g => map.set(g.eco, [...(map.get(g.eco) ?? []), g]));
    return [...map.entries()].sort((a, b) => openingLabel(a[0]).localeCompare(openingLabel(b[0])));
  }, [games]);

  const canSave = Boolean(eco && hero.trim() && pgn.trim()) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await postModelGame({
        eco,
        hero: hero.trim(),
        event: event.trim() || undefined,
        year: year.trim() ? Number(year) : undefined,
        result: result.trim() || undefined,
        pgn: pgn.trim(),
        note: note.trim() || undefined,
      });
      setEvent('');
      setYear('');
      setResult('');
      setPgn('');
      setNote('');
      setAdding(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la partida');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (game: ModelGame) => {
    const ok = await modal.confirm(
      `¿Borrar la partida modelo de ${game.hero}?`,
      'Borrar partida modelo'
    );
    if (!ok) return;
    await deleteModelGame(game.id);
    await reload();
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center text-h3 text-fg">
            <PlayCircleIcon className="w-5 h-5 mr-2 text-accent" />
            Partidas modelo
          </h3>
          <p className="text-sm text-fg-muted mt-1">
            La partida concreta detrás de cada héroe: se reproduce con motor y explorador, igual
            que las tuyas.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={PlusIcon}
          onClick={() => setAdding(a => !a)}
          disabled={ecoOptions.length === 0}
        >
          {adding ? 'Cancelar' : 'Sumar partida'}
        </Button>
      </div>

      {ecoOptions.length === 0 && (
        <p className="mt-4 text-sm text-fg-muted">
          Primero agregá un héroe a alguna apertura acá arriba; las partidas se cuelgan de esa
          apertura.
        </p>
      )}

      {adding && (
        <div className="mt-4 space-y-3 rounded-lg border border-hairline bg-surface-2 p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-label">Apertura</span>
              <select
                className={`${INPUT_CLASS} mt-1`}
                value={eco}
                onChange={e => {
                  setEco(e.target.value);
                  setHero('');
                }}
              >
                <option value="">Elegí una…</option>
                {ecoOptions.map(o => (
                  <option key={o.eco} value={o.eco}>
                    {o.name} ({o.eco})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label">Héroe</span>
              <select
                className={`${INPUT_CLASS} mt-1`}
                value={hero}
                onChange={e => setHero(e.target.value)}
                disabled={!eco}
              >
                <option value="">Elegí uno…</option>
                {heroOptions.map(h => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label">Torneo</span>
              <input
                className={`${INPUT_CLASS} mt-1`}
                placeholder="Wijk aan Zee"
                value={event}
                onChange={e => setEvent(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-label">Año</span>
                <input
                  className={`${INPUT_CLASS} mt-1`}
                  inputMode="numeric"
                  placeholder="2023"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-label">Resultado</span>
                <input
                  className={`${INPUT_CLASS} mt-1`}
                  placeholder="1-0"
                  value={result}
                  onChange={e => setResult(e.target.value)}
                />
              </label>
            </div>
          </div>
          <label className="block">
            <span className="text-label">PGN</span>
            <textarea
              className={`${INPUT_CLASS} mt-1 font-mono text-xs`}
              rows={6}
              placeholder="1. e4 c5 2. Nf3 d6 …  (pegá el PGN entero, con o sin cabeceras)"
              value={pgn}
              onChange={e => setPgn(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-label">Por qué esta partida</span>
            <input
                className={`${INPUT_CLASS} mt-1`}
              placeholder="El plan de f5 con el alfil en g7"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-loss">{error}</p>}
          <Button onClick={() => void save()} disabled={!canSave}>
            {saving ? 'Guardando…' : 'Guardar partida'}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-fg-muted">Cargando partidas modelo…</p>
      ) : games.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">
          Todavía no hay ninguna. Una partida por héroe ya convierte la galería en material de
          estudio.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {byEco.map(([code, list]) => (
            <div key={code}>
              <div className="text-label">
                {openingLabel(code)} · {code}
              </div>
              <div className="mt-2 space-y-2">
                {list.map(game => (
                  <div
                    key={game.id}
                    className="rounded-lg border border-hairline bg-surface-2/40 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-fg">{game.hero}</span>
                          {game.result && <Badge>{game.result}</Badge>}
                          <span className="text-xs text-fg-muted nums">
                            {[game.event, game.year].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        {game.note && <p className="text-xs text-fg-muted mt-1">{game.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPlaying(playing?.id === game.id ? null : game)}
                        >
                          {playing?.id === game.id ? 'Cerrar' : 'Ver'}
                        </Button>
                        <button
                          onClick={() => void remove(game)}
                          className="p-1.5 text-loss hover:bg-loss/10 rounded-lg"
                          aria-label="Borrar partida modelo"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {playing?.id === game.id && (
                      <div className="mt-3 border-t border-hairline pt-3">
                        <GameViewer
                          pgn={game.pgn}
                          white={game.hero}
                          result={game.result}
                          showExplorer
                          showEngine
                        />
                        <div className="mt-3">
                          <ConceptQuickAdd
                            label="Sacar un concepto de esta partida"
                            defaults={{
                              name: game.note ?? '',
                              category: 'strategy',
                              sourceType: `model-game-${game.hero}`,
                              sourceChapter: [openingLabel(code), game.event, game.year]
                                .filter(Boolean)
                                .join(' · '),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ModelGamesSection;
