import { useMemo, useState } from 'react';
import {
  RocketLaunchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import { useGames } from '../../../context/GamesContext';
import { useGameStats } from '../../../hooks/useGameStats';
import { useNormTracker } from '../../../hooks/useNormTracker';
import { Card, CardHeader } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import type { NormAttempt, NormThresholds, NormTitle } from '../../../types/norms';

const TITLES: NormTitle[] = ['IM', 'GM', 'WIM', 'WGM'];

const emptyForm: Partial<NormAttempt> = { titleTarget: 'IM' };

const NormTrackerTab = () => {
  const modal = useModal();
  const { games } = useGames();
  const { tournamentStats } = useGameStats(games.filter(g => g.rated));
  const { attempts, thresholds, loading, error, saveAttempt, removeAttempt, saveThresholds } = useNormTracker();

  const [form, setForm] = useState<Partial<NormAttempt> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingThresholds, setEditingThresholds] = useState<NormThresholds | null>(null);

  const applyTournament = (tournament: string) => {
    const stat = tournamentStats.find(t => t.tournament === tournament);
    setForm(f => ({
      ...f,
      tournament,
      gamesCount: stat?.total ?? f?.gamesCount,
      performanceRating: stat?.performanceRating ?? f?.performanceRating,
    }));
  };

  const save = async () => {
    if (!form?.tournament || !form.titleTarget) return;
    await saveAttempt(form, editingId ?? undefined);
    setForm(null);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    const confirmed = await modal.confirm('Delete this norm attempt?');
    if (confirmed) await removeAttempt(id);
  };

  const clearance = (a: NormAttempt) => {
    const threshold = thresholds[a.titleTarget];
    if (a.performanceRating == null) return null;
    return a.performanceRating >= threshold;
  };

  const sortedAttempts = useMemo(() => [...attempts].sort((a, b) => b.createdAt - a.createdAt), [attempts]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-2 rounded-lg">
              <RocketLaunchIcon className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-h2 text-fg">Norm Tracker</h2>
              <p className="text-sm text-fg-muted">Log tournaments toward a title norm</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={Cog6ToothIcon}
              onClick={() => setEditingThresholds(editingThresholds ? null : thresholds)}
            >
              Thresholds
            </Button>
            <Button variant="primary" icon={PlusIcon} onClick={() => { setForm(emptyForm); setEditingId(null); }}>
              Log tournament
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-fg-subtle">
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Real FIDE norm regulations are more intricate than a single performance-rating cutoff (minimum rounds,
            percentage of foreign/titled opponents, rating floors that vary by title). The thresholds below are
            typical reference figures, not an authoritative current source — edit them if you know your federation's
            exact requirement. Use this as a rough personal tracker, not official norm verification.
          </p>
        </div>
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </Card>

      {/* Thresholds editor */}
      {editingThresholds && (
        <Card>
          <CardHeader title="Performance-rating thresholds" subtitle="Editable — set your own reference numbers" />
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {TITLES.map(title => (
              <div key={title}>
                <label className="block text-sm font-bold text-fg mb-2">{title}</label>
                <input
                  type="number"
                  value={editingThresholds[title]}
                  onChange={e => setEditingThresholds({ ...editingThresholds, [title]: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => void saveThresholds(editingThresholds).then(() => setEditingThresholds(null))}>
              Save
            </Button>
            <Button variant="secondary" onClick={() => setEditingThresholds(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Form */}
      {form !== null && (
        <Card>
          <CardHeader title={editingId ? 'Edit tournament' : 'Log a tournament'} />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Title target</label>
              <select
                value={form.titleTarget ?? 'IM'}
                onChange={e => setForm({ ...form, titleTarget: e.target.value as NormTitle })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              >
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Tournament</label>
              <input
                type="text"
                list="norm-tournament-options"
                placeholder="Pick or type a tournament name"
                value={form.tournament ?? ''}
                onChange={e => applyTournament(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <datalist id="norm-tournament-options">
                {tournamentStats.map(t => <option key={t.tournament} value={t.tournament} />)}
              </datalist>
              <p className="mt-1 text-xs text-fg-subtle">Picking a logged tournament auto-fills games/performance below.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Games played</label>
              <input
                type="number"
                value={form.gamesCount ?? ''}
                onChange={e => setForm({ ...form, gamesCount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Performance rating</label>
              <input
                type="number"
                value={form.performanceRating ?? ''}
                onChange={e => setForm({ ...form, performanceRating: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Titled opponents faced</label>
              <input
                type="number"
                value={form.titledOpponents ?? ''}
                onChange={e => setForm({ ...form, titledOpponents: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-fg mb-2">Foreign-federation opponents</label>
              <input
                type="number"
                value={form.foreignOpponents ?? ''}
                onChange={e => setForm({ ...form, foreignOpponents: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-fg mb-2">Notes</label>
              <input
                type="text"
                placeholder="Anything worth remembering about this event"
                value={form.notes ?? ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => void save()}>{editingId ? 'Update' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Attempts list */}
      <Card flush className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-fg-muted">Loading…</p>
        ) : sortedAttempts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
              <RocketLaunchIcon className="w-12 h-12 text-fg-subtle" />
            </div>
            <h3 className="text-h3 text-fg mb-2">No tournaments logged yet</h3>
            <p className="text-fg-muted">Log a tournament to start tracking norm progress.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {sortedAttempts.map(a => {
              const cleared = clearance(a);
              return (
                <div key={a.id} className="p-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge tone="accent">{a.titleTarget}</Badge>
                      {cleared !== null && (
                        <Badge tone={cleared ? 'win' : 'loss'}>
                          {cleared ? 'Clears threshold' : 'Below threshold'}
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-fg">{a.tournament}</h4>
                    <p className="text-sm text-fg-muted">
                      {a.performanceRating != null && `Performance ${a.performanceRating} (need ${thresholds[a.titleTarget]})`}
                      {a.gamesCount != null && ` · ${a.gamesCount} games`}
                      {a.titledOpponents != null && ` · ${a.titledOpponents} titled opp.`}
                      {a.foreignOpponents != null && ` · ${a.foreignOpponents} foreign opp.`}
                    </p>
                    {a.notes && <p className="mt-1 text-sm text-fg">{a.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => { setForm(a); setEditingId(a.id); }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" icon={TrashIcon} onClick={() => void remove(a.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NormTrackerTab;
