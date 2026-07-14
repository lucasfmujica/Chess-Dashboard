import { useMemo, useState } from 'react';
import { StarIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ecoNames } from '../../../../constants/ecoNames';
import type { Repertoire } from '../../../../types/chess';
import { Card } from '../../../ui/Card';
import { SectionHeading } from '../../../ui/PageHeader';
import SegmentedControl from '../../../ui/SegmentedControl';
import Button from '../../../ui/Button';
import { PieceGlyph } from '../../../ui/PieceGlyph';

type OpeningHeroes = Record<string, string[]>;
type ViewMode = 'opening' | 'player';

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

const Avatar = ({ name }: { name: string }) => (
  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${avatarColor(name)}`}>
    {initials(name) || '?'}
  </span>
);

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
  const [view, setView] = useState<ViewMode>('opening');
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newHeroName, setNewHeroName] = useState('');
  const [showAddOpening, setShowAddOpening] = useState(false);
  // Opening autocomplete (search by name → resolve ECO code)
  const [ecoQuery, setEcoQuery] = useState('');
  const [selectedEco, setSelectedEco] = useState('');
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

  // Group entries by repertoire color for the "by opening" view.
  const grouped = useMemo(() => ({
    W: entries.filter(e => e.color === 'W'),
    B: entries.filter(e => e.color === 'B'),
    other: entries.filter(e => e.color === null),
  }), [entries]);

  // Invert to player → openings for the "by player" view.
  const byPlayer = useMemo(() => {
    const map = new Map<string, { eco: string; name: string; color: 'W' | 'B' | null }[]>();
    entries.forEach(e => {
      e.heroes.forEach(hero => {
        const list = map.get(hero) ?? [];
        list.push({ eco: e.eco, name: e.name, color: e.color });
        map.set(hero, list);
      });
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

  // Opening name autocomplete options.
  const ecoOptions = useMemo(() => Object.entries(ecoNames).map(([eco, name]) => ({ eco, name })), []);
  const matches = useMemo(() => {
    const q = ecoQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return ecoOptions
      .filter(o => o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q))
      .slice(0, 8);
  }, [ecoQuery, ecoOptions]);

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
    if (!selectedEco || !newOpeningHero.trim()) return;
    const updated: OpeningHeroes = { ...openingHeroes, [selectedEco]: [...(openingHeroes[selectedEco] || [])] };
    if (!updated[selectedEco].includes(newOpeningHero.trim())) updated[selectedEco].push(newOpeningHero.trim());
    setOpeningHeroes(updated);
    setEcoQuery('');
    setSelectedEco('');
    setNewOpeningHero('');
    setShowAddOpening(false);
  };

  const HeroPill = ({ eco, hero }: { eco: string; hero: string }) => (
    <span className="group inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-surface border border-hairline text-fg text-xs rounded-full">
      <Avatar name={hero} />
      {hero}
      <button
        onClick={() => removeHero(eco, hero)}
        className="text-fg-subtle hover:text-loss transition-colors"
        title="Remove"
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </span>
  );

  const OpeningCardTile = ({ eco, heroes, name, color, stats }: typeof entries[number]) => (
    <div className="border border-hairline rounded-lg p-4 bg-surface-2/40 hover:bg-surface-2 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {color && <PieceGlyph color={color} />}
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
        {heroes.map(hero => <HeroPill key={hero} eco={eco} hero={hero} />)}
      </div>
    </div>
  );

  const OpeningGrid = ({ list }: { list: typeof entries }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(e => <OpeningCardTile key={e.eco} {...e} />)}
    </div>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="flex items-center text-h3 text-fg">
          <StarIcon className="w-5 h-5 mr-2 text-accent" />
          Opening Heroes
        </h3>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Heroes view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'opening', label: 'By opening' },
              { value: 'player', label: 'By player' },
            ]}
          />
          <Button variant="secondary" size="sm" icon={PlusIcon} onClick={() => setShowAddOpening(o => !o)}>
            New opening
          </Button>
        </div>
      </div>
      <p className="text-sm text-fg-muted mb-4">
        {totalHeroes > 0
          ? `${totalHeroes} player${totalHeroes === 1 ? '' : 's'} tracked across ${entries.length} opening${entries.length === 1 ? '' : 's'} — including ones you haven't played yet.`
          : "Track top players you study for each opening, even ones you haven't played yet."}
      </p>

      {showAddOpening && (
        <div className="mb-5 p-3 rounded-lg bg-surface-2 border border-hairline">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px] relative">
              <label className="text-label mb-1 block">Opening</label>
              <input
                type="text"
                value={ecoQuery}
                onChange={e => { setEcoQuery(e.target.value); setSelectedEco(''); }}
                placeholder="Search by name, e.g. Najdorf…"
                className="w-full text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {matches.length > 0 && !selectedEco && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-hairline bg-surface shadow-lg">
                  {matches.map(o => (
                    <button
                      key={o.eco}
                      onClick={() => { setSelectedEco(o.eco); setEcoQuery(`${o.name} (${o.eco})`); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface-2 flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{o.name}</span>
                      <span className="text-fg-subtle tabular-nums shrink-0">{o.eco}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-label mb-1 block">Player name</label>
              <input
                type="text"
                value={newOpeningHero}
                onChange={e => setNewOpeningHero(e.target.value)}
                placeholder="Enter player name..."
                onKeyDown={e => e.key === 'Enter' && addNewOpening()}
                className="w-full text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <Button variant="primary" size="sm" onClick={addNewOpening} disabled={!selectedEco || !newOpeningHero.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-fg-muted">No heroes tracked yet. Add one with "New opening" above.</p>
      ) : view === 'player' ? (
        <div className="space-y-3">
          {byPlayer.map(([player, openings]) => (
            <div key={player} className="border border-hairline rounded-lg p-4 bg-surface-2/40">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={player} />
                <p className="font-semibold text-sm text-fg">{player}</p>
                <span className="text-xs text-fg-subtle">· {openings.length} opening{openings.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {openings.map(o => (
                  <span key={o.eco} className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface border border-hairline text-fg text-xs rounded-full">
                    {o.color && <PieceGlyph color={o.color} size={10} />}
                    {o.name}
                    <span className="text-fg-subtle tabular-nums">{o.eco}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.W.length > 0 && (
            <div>
              <SectionHeading className="mb-3"><span className="inline-flex items-center gap-2"><PieceGlyph color="W" /> White</span></SectionHeading>
              <OpeningGrid list={grouped.W} />
            </div>
          )}
          {grouped.B.length > 0 && (
            <div>
              <SectionHeading className="mb-3"><span className="inline-flex items-center gap-2"><PieceGlyph color="B" /> Black</span></SectionHeading>
              <OpeningGrid list={grouped.B} />
            </div>
          )}
          {grouped.other.length > 0 && (
            <div>
              <SectionHeading className="mb-3">Other</SectionHeading>
              <OpeningGrid list={grouped.other} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default OpeningHeroesGallery;
