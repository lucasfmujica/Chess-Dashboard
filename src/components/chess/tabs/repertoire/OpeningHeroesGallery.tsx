import { useMemo, useState } from 'react';
import { StarIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ecoNames } from '../../../../constants/ecoNames';
import type { Repertoire } from '../../../../types/chess';

type OpeningHeroes = Record<string, string[]>;

interface AnalyzedOpening {
  eco: string;
  name: string;
  games: number;
  winRate: number;
}

interface OpeningHeroesGalleryProps {
  openingHeroes: OpeningHeroes;
  setOpeningHeroes: (value: OpeningHeroes) => Promise<void> | void;
  mainRepertoire: Repertoire;
  whiteOpenings: AnalyzedOpening[];
  blackOpenings: AnalyzedOpening[];
}

const AVATAR_PALETTE = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
];

/** Deterministic avatar color so the same name always looks the same. */
const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

/**
 * Reads directly from `openingHeroes` (every ECO that has at least one hero),
 * not from played-game stats — so heroes attached to an opening you haven't
 * played yet still show up here.
 */
const OpeningHeroesGallery = ({
  openingHeroes,
  setOpeningHeroes,
  mainRepertoire,
  whiteOpenings,
  blackOpenings,
}: OpeningHeroesGalleryProps) => {
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newHeroName, setNewHeroName] = useState('');
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [newEco, setNewEco] = useState('');
  const [newOpeningHero, setNewOpeningHero] = useState('');

  const statsByEco = useMemo(() => {
    const map: Record<string, AnalyzedOpening> = {};
    [...whiteOpenings, ...blackOpenings].forEach(o => { map[o.eco] = o; });
    return map;
  }, [whiteOpenings, blackOpenings]);

  const entries = useMemo(() => {
    return Object.entries(openingHeroes)
      .filter(([, heroes]) => heroes.length > 0)
      .map(([eco, heroes]) => {
        const color: 'W' | 'B' | null = mainRepertoire.white.includes(eco)
          ? 'W' : mainRepertoire.black.includes(eco) ? 'B' : null;
        return {
          eco,
          heroes,
          name: ecoNames[eco] || statsByEco[eco]?.name || eco,
          color,
          stats: statsByEco[eco],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [openingHeroes, mainRepertoire, statsByEco]);

  const totalHeroes = entries.reduce((sum, e) => sum + e.heroes.length, 0);

  const addHero = (eco: string) => {
    if (!newHeroName.trim()) return;
    const updated: OpeningHeroes = { ...openingHeroes, [eco]: [...(openingHeroes[eco] || [])] };
    if (!updated[eco].includes(newHeroName.trim())) updated[eco].push(newHeroName.trim());
    setOpeningHeroes(updated);
    setNewHeroName('');
    setAddingFor(null);
  };

  const removeHero = (eco: string, hero: string) => {
    const updated: OpeningHeroes = { ...openingHeroes };
    updated[eco] = (updated[eco] || []).filter(h => h !== hero);
    if (updated[eco].length === 0) delete updated[eco];
    setOpeningHeroes(updated);
  };

  const addNewOpening = () => {
    const eco = newEco.trim().toUpperCase();
    if (!eco || !newOpeningHero.trim()) return;
    const updated: OpeningHeroes = { ...openingHeroes, [eco]: [...(openingHeroes[eco] || [])] };
    if (!updated[eco].includes(newOpeningHero.trim())) updated[eco].push(newOpeningHero.trim());
    setOpeningHeroes(updated);
    setNewEco('');
    setNewOpeningHero('');
    setShowAddOpening(false);
  };

  return (
    <div className="p-6 border border-hairline rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="flex items-center text-lg font-semibold text-fg">
          <StarIcon className="w-5 h-5 mr-2 text-accent" />
          Opening Heroes
        </h3>
        <button
          onClick={() => setShowAddOpening(o => !o)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-hairline bg-surface hover:bg-surface-2 text-fg rounded-md transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New opening
        </button>
      </div>
      <p className="text-sm text-fg-muted mb-4">
        {totalHeroes > 0
          ? `${totalHeroes} player${totalHeroes === 1 ? '' : 's'} tracked across ${entries.length} opening${entries.length === 1 ? '' : 's'} — including ones you haven't played yet.`
          : "Track top players you study for each opening, even ones you haven't played yet."}
      </p>

      {showAddOpening && (
        <div className="flex flex-wrap items-end gap-2 mb-5 p-3 rounded-lg bg-surface-2 border border-hairline">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-fg-subtle mb-1">ECO</label>
            <input
              type="text"
              value={newEco}
              onChange={e => setNewEco(e.target.value)}
              placeholder="e.g. B90"
              className="w-24 text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded uppercase focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-fg-subtle mb-1">Player name</label>
            <input
              type="text"
              value={newOpeningHero}
              onChange={e => setNewOpeningHero(e.target.value)}
              placeholder="Enter player name..."
              onKeyDown={e => e.key === 'Enter' && addNewOpening()}
              className="w-full text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            onClick={addNewOpening}
            className="px-3 py-1.5 text-xs font-medium bg-fg text-app rounded hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-fg-muted">No heroes tracked yet. Add one with "New opening" above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(({ eco, heroes, name, color, stats }) => (
            <div key={eco} className="border border-hairline rounded-lg p-4 bg-surface-2/40 hover:bg-surface-2 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {color && <span className="text-sm">{color === 'W' ? '⚪' : '⚫'}</span>}
                    <p className="font-semibold text-sm text-fg truncate">{name}</p>
                  </div>
                  <p className="text-xs text-fg-muted tabular-nums">
                    {eco}
                    {stats && ` · ${stats.games} game${stats.games === 1 ? '' : 's'} · ${stats.winRate}% wins`}
                  </p>
                </div>
                <button
                  onClick={() => setAddingFor(addingFor === eco ? null : eco)}
                  className="shrink-0 text-xs px-2 py-1 border border-hairline bg-surface hover:bg-surface-2 text-fg rounded transition-colors"
                >
                  {addingFor === eco ? 'Cancel' : '+ Hero'}
                </button>
              </div>

              {addingFor === eco && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newHeroName}
                    onChange={e => setNewHeroName(e.target.value)}
                    placeholder="Enter player name..."
                    onKeyDown={e => e.key === 'Enter' && addHero(eco)}
                    autoFocus
                    className="flex-1 text-xs px-2 py-1 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => addHero(eco)}
                    className="text-xs px-3 py-1 bg-fg text-app rounded hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {heroes.map(hero => (
                  <span
                    key={hero}
                    className="group inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-surface border border-hairline text-fg text-xs rounded-full"
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${avatarColor(hero)}`}>
                      {initials(hero) || '?'}
                    </span>
                    {hero}
                    <button
                      onClick={() => removeHero(eco, hero)}
                      className="text-fg-subtle hover:text-loss transition-colors"
                      title="Remove"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpeningHeroesGallery;
