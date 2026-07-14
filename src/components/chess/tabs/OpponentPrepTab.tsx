import { useMemo, useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import { useGames } from '../../../context/GamesContext';
import { useGameStats } from '../../../hooks/useGameStats';
import { useRivalGames } from '../../../hooks/useRivalGames';
import {
  fetchScoutingTargets,
  postScoutingTarget,
  putScoutingTarget,
  deleteScoutingTarget,
} from '../../../api/client';
import { Card, CardHeader } from '../../ui/Card';
import Badge, { resultTone } from '../../ui/Badge';
import Button from '../../ui/Button';
import StatCard from '../../ui/StatCard';
import OpponentExplorerBoard from '../OpponentExplorerBoard';
import type { ScoutingTarget } from '../../../types/chess';

const emptyForm: Partial<ScoutingTarget> = {};

const OpponentPrepTab = () => {
  const modal = useModal();
  const { games } = useGames();

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
    const confirmed = await modal.confirm('Remove this scouting target?');
    if (!confirmed) return;
    await deleteScoutingTarget(id);
    setTargets(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-2 rounded-lg">
              <UserGroupIcon className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-h2 text-fg">Opponent Prep</h2>
              <p className="text-sm text-fg-muted">Scout a rival's opening tendencies before your round</p>
            </div>
          </div>
          <Button variant="primary" icon={PlusIcon} onClick={() => { setForm(emptyForm); setEditingId(null); }}>
            Add rival
          </Button>
        </div>
      </Card>

      {/* Form */}
      {form !== null && (
        <Card>
          <CardHeader title={editingId ? 'Edit rival' : 'New rival'} />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Name</label>
              <input
                type="text"
                placeholder="Opponent's name (as it appears in your OTB games)"
                value={form.name ?? ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Lichess username</label>
              <input
                type="text"
                placeholder="e.g. DrNykterstein"
                value={form.lichessUsername ?? ''}
                onChange={e => setForm({ ...form, lichessUsername: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Tournament</label>
              <input
                type="text"
                placeholder="Which tournament you're facing them at"
                value={form.tournament ?? ''}
                onChange={e => setForm({ ...form, tournament: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Notes</label>
              <input
                type="text"
                placeholder="Anything worth remembering"
                value={form.notes ?? ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => void saveTarget(form)}>{editingId ? 'Update' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Target list */}
        <Card flush className="overflow-hidden h-fit">
          {loading ? (
            <p className="p-4 text-sm text-fg-muted">Loading…</p>
          ) : targets.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">No rivals yet — add one to start scouting.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {targets.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors ${
                      selectedId === t.id ? 'bg-accent/10' : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg truncate">{t.name}</p>
                    {t.tournament && <p className="text-xs text-fg-muted truncate">{t.tournament}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Detail */}
        <div className="space-y-6 min-w-0">
          {!selected ? (
            <Card className="p-12 text-center">
              <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
                <MagnifyingGlassIcon className="w-12 h-12 text-fg-subtle" />
              </div>
              <h3 className="text-h3 text-fg mb-2">No rival selected</h3>
              <p className="text-fg-muted">Add or pick a rival on the left to scout their tendencies.</p>
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-h3 text-fg">{selected.name}</h3>
                    {selected.tournament && <p className="text-sm text-fg-muted">{selected.tournament}</p>}
                    {selected.notes && <p className="mt-2 text-sm text-fg">{selected.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => { setForm(selected); setEditingId(selected.id); }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" icon={TrashIcon} onClick={() => void removeTarget(selected.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>

              {!selected.lichessUsername ? (
                <Card className="text-sm text-fg-muted">
                  Add a Lichess username to this rival to load their opening tendencies and recent form.
                </Card>
              ) : rivalLoading ? (
                <Card className="text-sm text-fg-muted">Loading {selected.lichessUsername}'s games…</Card>
              ) : rivalError ? (
                <Card className="text-sm text-loss">{rivalError}</Card>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard title="Lichess Rating" value={rating?.classical ?? rating?.rapid ?? rating?.blitz ?? '—'} />
                    <StatCard title="Games Loaded" value={rivalGames.length} />
                    <StatCard title="Score" value={rivalStats.overallStats.score} />
                    <StatCard title="Win Rate" value={`${rivalStats.overallStats.winRate}%`} />
                  </div>

                  <Card>
                    <CardHeader title="Opening tendencies" subtitle={`From ${selected.name}'s last ${rivalGames.length} rated Lichess games`} />
                    <div className="mt-4">
                      <OpponentExplorerBoard rivalGames={rivalGames} rivalName={selected.name} />
                    </div>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader
                  title="Local head-to-head"
                  subtitle="Heuristic match on opponent name across your own OTB/Lichess games — names may not match exactly"
                />
                {headToHead.length === 0 ? (
                  <p className="mt-3 text-sm text-fg-muted">No local games found against "{selected.name}".</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-hairline">
                        {headToHead.map((g, i) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-3 text-fg-muted">{g.date ?? g.tournament}</td>
                            <td className="py-1.5 pr-3">{g.color === 'W' ? '⚪' : '⚫'}</td>
                            <td className="py-1.5 pr-3 text-fg-muted">{g.eco}</td>
                            <td className="py-1.5">
                              <Badge tone={resultTone(g.result)}>{g.result}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
