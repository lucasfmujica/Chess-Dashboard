import { useMemo, useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import { useSourceFilteredGames } from '../../../context/GamesContext';
import { useGameStats } from '../../../hooks/useGameStats';
import { useRivalGames } from '../../../hooks/useRivalGames';
import {
  fetchScoutingTargets,
  postScoutingTarget,
  putScoutingTarget,
  deleteScoutingTarget,
} from '../../../api/client';
import { Badge, Button, Card, CardHeader, ClockBar, ResultMark, StatCard, Table, TBody, TD, TH, THead, TR } from '../../ui';
import OpponentExplorerBoard from '../OpponentExplorerBoard';
import type { ScoutingTarget } from '../../../types/chess';

const emptyForm: Partial<ScoutingTarget> = {};

const OpponentPrepTab = () => {
  const modal = useModal();
  const games = useSourceFilteredGames();

  const [targets, setTargets] = useState<ScoutingTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ScoutingTarget> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchScoutingTargets()
      .then(data => {
        setTargets(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(err => console.error('Failed to load scouting targets', err))
      .finally(() => setLoading(false));
  }, []);

  const selected = targets.find(t => t.id === selectedId) ?? null;
  const { games: rivalGames, rating, loading: rivalLoading, error: rivalError } = useRivalGames(selected?.lichessUsername);
  const rivalStats = useGameStats(rivalGames);

  const headToHead = useMemo(() => {
    if (!selected) return [];
    const needle = selected.name.trim().toLowerCase();
    if (!needle) return [];
    return games.filter(g => g.opp.toLowerCase().includes(needle));
  }, [games, selected]);

  const saveTarget = async (target: Partial<ScoutingTarget>) => {
    if (!target.name?.trim()) return;
    if (editingId) {
      const saved = await putScoutingTarget(editingId, target);
      setTargets(prev => prev.map(t => (t.id === saved.id ? saved : t)));
    } else {
      const saved = await postScoutingTarget(target);
      setTargets(prev => [saved, ...prev]);
      setSelectedId(saved.id);
    }
    setForm(null);
    setEditingId(null);
  };

  const removeTarget = async (id: string) => {
    const confirmed = await modal.confirm('¿Sacar a este rival de tu lista?');
    if (!confirmed) return;
    await deleteScoutingTarget(id);
    setTargets(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const h2h = useMemo(() => {
    const wins = headToHead.filter(g => g.result === 'W').length;
    const draws = headToHead.filter(g => g.result === 'D').length;
    const losses = headToHead.filter(g => g.result === 'L').length;
    const pts = wins + draws / 2;
    const whole = Math.floor(pts);
    return { wins, draws, losses, pts: pts - whole >= 0.5 ? `${whole || ''}½` : String(whole) };
  }, [headToHead]);

  const inputClass =
    'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';
  const rivalReady = !!selected?.lichessUsername && !rivalLoading && !rivalError;
  const lichessRating = rating?.classical ?? rating?.rapid ?? rating?.blitz;
  const ratingKind = rating?.classical ? 'clásicas' : rating?.rapid ? 'rápidas' : rating?.blitz ? 'blitz' : 'Lichess';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Qué juega antes de que te toque en la ronda.</p>
        <Button variant="primary" size="sm" icon={PlusIcon} onClick={() => { setForm(emptyForm); setEditingId(null); }}>
          Agregar rival
        </Button>
      </div>

      {form !== null && (
        <Card>
          <CardHeader title={editingId ? 'Editar rival' : 'Nuevo rival'} />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="rival-name" className="text-label mb-1.5 block">Nombre</label>
              <input
                id="rival-name"
                type="text"
                placeholder="Como figura en tus partidas"
                value={form.name ?? ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="rival-lichess" className="text-label mb-1.5 block">Usuario de Lichess</label>
              <input
                id="rival-lichess"
                type="text"
                placeholder="por ejemplo, DrNykterstein"
                value={form.lichessUsername ?? ''}
                onChange={e => setForm({ ...form, lichessUsername: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="rival-tournament" className="text-label mb-1.5 block">Torneo</label>
              <input
                id="rival-tournament"
                type="text"
                placeholder="Dónde te lo cruzás"
                value={form.tournament ?? ''}
                onChange={e => setForm({ ...form, tournament: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="rival-notes" className="text-label mb-1.5 block">Notas</label>
              <input
                id="rival-notes"
                type="text"
                placeholder="Lo que valga la pena recordar"
                value={form.notes ?? ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => void saveTarget(form)}>{editingId ? 'Guardar cambios' : 'Guardar'}</Button>
            <Button variant="secondary" onClick={() => { setForm(null); setEditingId(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card flush className="h-fit overflow-hidden">
          <div className="border-b border-hairline px-4 py-3">
            <h2 className="font-serif text-lg font-semibold text-fg">Rivales</h2>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-fg-muted">Cargando…</p>
          ) : targets.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">Todavía no hay rivales. Agregá uno para empezar a prepararte.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {targets.map(t => {
                const active = selectedId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-app focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                        active ? 'bg-accent/10' : ''
                      }`}
                    >
                      <p className={`truncate font-serif text-base ${active ? 'text-accent' : 'text-fg'}`}>{t.name}</p>
                      {t.tournament && <p className="truncate text-xs text-fg-subtle">{t.tournament}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          {!selected ? (
            <Card className="py-12 text-center">
              <h3 className="font-serif text-xl font-semibold text-fg">Ningún rival elegido</h3>
              <p className="mt-2 text-sm text-fg-muted">Agregá o elegí un rival de la lista para ver qué juega.</p>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  {selected.tournament && <p className="text-label">{selected.tournament}</p>}
                  <h2 className="mt-1 font-serif text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
                    {selected.name}
                  </h2>
                  {selected.notes && <p className="mt-2 font-serif text-base text-fg-muted">{selected.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={PencilIcon}
                    onClick={() => { setForm(selected); setEditingId(selected.id); }}
                  >
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" icon={TrashIcon} onClick={() => void removeTarget(selected.id)}>
                    Sacar
                  </Button>
                </div>
              </div>

              <ClockBar>
                <StatCard
                  title="Rating Lichess"
                  value={rivalReady && lichessRating ? lichessRating : '—'}
                  subtitle={rivalReady ? ratingKind : 'sin datos de Lichess'}
                />
                <StatCard
                  title="Partidas cargadas"
                  value={rivalReady ? rivalGames.length : '—'}
                  subtitle="de Lichess, con rating"
                />
                <StatCard
                  title="Su puntaje"
                  value={rivalReady ? `${rivalStats.overallStats.winRate}%` : '—'}
                  subtitle={rivalReady ? `${rivalStats.overallStats.score} · % de victorias` : 'en Lichess'}
                />
                <StatCard
                  title="Contra vos"
                  value={headToHead.length ? `${h2h.pts} / ${headToHead.length}` : '—'}
                  subtitle={headToHead.length ? `+${h2h.wins} =${h2h.draws} −${h2h.losses}` : 'sin partidas entre ustedes'}
                />
              </ClockBar>

              {!selected.lichessUsername ? (
                <Card className="text-sm text-fg-muted">
                  Agregale un usuario de Lichess a este rival para cargar sus aperturas y su forma reciente.
                </Card>
              ) : rivalLoading ? (
                <Card className="text-sm text-fg-muted">Cargando las partidas de {selected.lichessUsername}…</Card>
              ) : rivalError ? (
                <Card className="text-sm text-loss">{rivalError}</Card>
              ) : (
                <Card>
                  <CardHeader
                    title="Qué juega"
                    subtitle={`según sus últimas ${rivalGames.length} partidas con rating en Lichess`}
                  />
                  <div className="mt-4">
                    <OpponentExplorerBoard rivalGames={rivalGames} rivalName={selected.name} />
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader
                  title="Partidas contra vos"
                  subtitle="coincidencia aproximada por nombre en tus partidas: puede fallar si el nombre está escrito distinto"
                  className="mb-4"
                />
                {headToHead.length === 0 ? (
                  <p className="text-sm text-fg-muted">No hay partidas tuyas contra “{selected.name}”.</p>
                ) : (
                  <Table>
                    <THead>
                      <tr>
                        <TH>Fecha / torneo</TH>
                        <TH>Vos</TH>
                        <TH>ECO</TH>
                        <TH align="right">Res.</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {headToHead.map((g, i) => (
                        <TR key={i}>
                          <TD muted className="font-mono">{g.date ?? g.tournament}</TD>
                          <TD muted>{g.color === 'W' ? 'Blancas' : 'Negras'}</TD>
                          <TD>{g.eco ? <Badge>{g.eco}</Badge> : <span className="text-fg-subtle">—</span>}</TD>
                          <TD align="right"><ResultMark result={g.result} outline /></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentPrepTab;
