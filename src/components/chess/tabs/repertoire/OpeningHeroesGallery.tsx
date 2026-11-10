import { useMemo, useState } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { ecoNames } from '../../../../constants/ecoNames';
import { useRepertoireLines } from '../../../../context/RepertoireLinesContext';
import { buildRepertoireEcoIndex, type RepertoireEcoEntry } from '../../../../utils/repertoireEcos';
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
  whiteOpenings: AnalyzedOpening[];
  blackOpenings: AnalyzedOpening[];
}

interface GalleryEntry {
  eco: string;
  heroes: string[];
  name: string;
  color: 'W' | 'B' | null;
  stats?: AnalyzedOpening;
  /** Prepared chapters this code covers. Empty when it is off-repertoire. */
  chapters: string[];
  priority: number;
}

const AVATAR_PALETTE = [
  'bg-cat-1', 'bg-cat-2', 'bg-cat-3', 'bg-cat-4', 'bg-cat-5', 'bg-cat-6',
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
  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-mono text-[10px] font-medium text-surface ${avatarColor(name)}`}>
    {initials(name) || '?'}
  </span>
);

/**
 * The players worth studying for each opening, laid out against the repertoire.
 *
 * It used to iterate `openingHeroes` alone, which made two things impossible:
 * an opening with no hero could not appear (the gap was invisible), and the
 * colour came from the `repertoire` singleton, which is empty — so all 39
 * tracked codes resolved to "no colour" and piled into one unsorted "Other"
 * group. Both are fixed by reading `repertoire_lines`, the table that is
 * actually populated: it supplies the colour, the priority to sort by, and the
 * full set of codes the repertoire covers, so the holes show up as holes.
 */
const OpeningHeroesGallery = ({
  openingHeroes,
  setOpeningHeroes,
  whiteOpenings,
  blackOpenings,
}: OpeningHeroesGalleryProps) => {
  const { lines } = useRepertoireLines();
  const [showOffRepertoire, setShowOffRepertoire] = useState(false);
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

  const repertoireEcos = useMemo(() => buildRepertoireEcoIndex(lines), [lines]);

  /**
   * The union of the repertoire's codes and the ones that have a hero. The
   * union is the point: a prepared opening with nobody to study belongs on
   * screen as a gap, and a hero kept for an opening you don't play should
   * still be findable.
   */
  const entries = useMemo<GalleryEntry[]>(() => {
    const codes = new Set([
      ...repertoireEcos.keys(),
      ...Object.entries(openingHeroes)
        .filter(([, heroes]) => heroes.length > 0)
        .map(([eco]) => eco),
    ]);

    return [...codes].map(eco => {
      const prepared: RepertoireEcoEntry | undefined = repertoireEcos.get(eco);
      return {
        eco,
        heroes: openingHeroes[eco] ?? [],
        // A prepared chapter's own name beats a generic ECO label.
        name: prepared?.chapters[0] ?? ecoNames[eco] ?? statsByEco[eco]?.name ?? eco,
        color: prepared?.color ?? null,
        stats: statsByEco[eco],
        chapters: prepared?.chapters ?? [],
        priority: prepared?.priority ?? Number.MAX_SAFE_INTEGER,
      };
    });
  }, [openingHeroes, repertoireEcos, statsByEco]);

  const totalHeroes = entries.reduce((sum, e) => sum + e.heroes.length, 0);
  const gaps = useMemo(
    () => entries.filter(e => e.color !== null && e.heroes.length === 0),
    [entries]
  );

  /** Most urgent chapter first, so the list matches the order you'd work it. */
  const byPriority = (a: GalleryEntry, b: GalleryEntry) =>
    a.priority - b.priority || a.name.localeCompare(b.name);

  const grouped = useMemo(() => ({
    W: entries.filter(e => e.color === 'W').sort(byPriority),
    B: entries.filter(e => e.color === 'B').sort(byPriority),
    // Not in the repertoire: neighbouring Benoni codes, the King's Indian, and
    // other leftovers. Kept as reference, collapsed so they stop competing
    // with the openings actually being prepared.
    other: entries.filter(e => e.color === null).sort((a, b) => a.name.localeCompare(b.name)),
  }), [entries]);

  // Invert to player → openings for the "by player" view.
  const byPlayer = useMemo(() => {
    const map = new Map<string, { eco: string; name: string; color: 'W' | 'B' | null }[]>();
    entries.filter(e => e.heroes.length > 0).forEach(e => {
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
    <span className="group inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-surface border border-hairline text-fg text-xs rounded-sm">
      <Avatar name={hero} />
      {hero}
      <button
        onClick={() => removeHero(eco, hero)}
        className="text-fg-subtle hover:text-loss transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        title="Quitar"
        aria-label={`Quitar a ${hero}`}
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </span>
  );

  const OpeningCardTile = ({ eco, heroes, name, color, stats, chapters }: GalleryEntry) => (
    <div
      className={`rounded border p-4 transition-colors ${
        color !== null && heroes.length === 0
          ? 'border-dashed border-hairline bg-app'
          : 'border-hairline bg-surface hover:border-fg-subtle/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {color && <PieceGlyph color={color} />}
            <p className="truncate font-serif text-[15px] font-semibold text-fg">{name}</p>
          </div>
          <p className="font-mono text-xs tabular-nums text-fg-muted">
            {eco}
            {stats && ` · ${stats.games} partida${stats.games === 1 ? '' : 's'} · ${stats.winRate}%`}
          </p>
          {/* An ECO is not unique per chapter — nine of them cover two. Naming
              the second one stops the card from looking like it covers less
              than it does. */}
          {chapters.length > 1 && (
            <p className="mt-0.5 text-xs text-fg-subtle truncate" title={chapters.join(' · ')}>
              y {chapters.length - 1} capítulo{chapters.length - 1 === 1 ? '' : 's'} más
            </p>
          )}
        </div>
        <button
          onClick={() => setAddingFor(addingFor === eco ? null : eco)}
          className="shrink-0 rounded-sm border border-hairline bg-surface px-2 py-1 text-xs text-fg transition-colors hover:border-fg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {addingFor === eco ? 'Cancelar' : '+ Jugador'}
        </button>
      </div>

      {addingFor === eco && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newHeroName}
            onChange={e => setNewHeroName(e.target.value)}
            placeholder="Nombre del jugador"
            onKeyDown={e => e.key === 'Enter' && addHero(eco)}
            autoFocus
            className="flex-1 text-xs px-2 py-1 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => addHero(eco)}
            className="rounded bg-accent px-3 py-1 text-xs text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Agregar
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {heroes.length > 0 ? (
          heroes.map(hero => <HeroPill key={hero} eco={eco} hero={hero} />)
        ) : (
          <span className="text-xs text-fg-muted">
            Sin referente: nadie a quien estudiar acá
          </span>
        )}
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
        <h3 className="font-serif text-xl font-semibold leading-tight text-fg">Referentes por apertura</h3>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Vista de referentes"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'opening', label: 'Por apertura' },
              { value: 'player', label: 'Por jugador' },
            ]}
          />
          <Button variant="secondary" size="sm" icon={PlusIcon} onClick={() => setShowAddOpening(o => !o)}>
            Nueva apertura
          </Button>
        </div>
      </div>
      <p className="text-sm text-fg-muted mb-4">
        {totalHeroes > 0 ? (
          <>
            {totalHeroes} jugador{totalHeroes === 1 ? '' : 'es'} en{' '}
            {entries.length - gaps.length} apertura
            {entries.length - gaps.length === 1 ? '' : 's'}
            {gaps.length > 0 && (
              <>
                {' · '}
                <span className="font-medium text-fg">
                  {gaps.length} de tu repertorio sin referente
                </span>
              </>
            )}
          </>
        ) : (
          'Los jugadores que estudiás para cada apertura de tu repertorio.'
        )}
      </p>

      {showAddOpening && (
        <div className="mb-5 rounded border border-hairline bg-surface-2 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px] relative">
              <label className="text-label mb-1 block">Apertura</label>
              <input
                type="text"
                value={ecoQuery}
                onChange={e => { setEcoQuery(e.target.value); setSelectedEco(''); }}
                placeholder="Buscá por nombre, por ejemplo Najdorf"
                className="w-full text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {matches.length > 0 && !selectedEco && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-hairline-strong bg-surface">
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
              <label className="text-label mb-1 block">Jugador</label>
              <input
                type="text"
                value={newOpeningHero}
                onChange={e => setNewOpeningHero(e.target.value)}
                placeholder="Nombre del jugador"
                onKeyDown={e => e.key === 'Enter' && addNewOpening()}
                className="w-full text-xs px-2 py-1.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <Button variant="primary" size="sm" onClick={addNewOpening} disabled={!selectedEco || !newOpeningHero.trim()}>
              Agregar
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-fg-muted">Todavía no cargaste referentes. Sumá uno con "Nueva apertura".</p>
      ) : view === 'player' ? (
        <div className="space-y-3">
          {byPlayer.map(([player, openings]) => (
            <div key={player} className="rounded border border-hairline bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={player} />
                <p className="font-serif text-[15px] font-semibold text-fg">{player}</p>
                <span className="text-xs text-fg-subtle">· {openings.length} apertura{openings.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {openings.map(o => (
                  <span key={o.eco} className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface border border-hairline text-fg text-xs rounded-sm">
                    {o.color && <PieceGlyph color={o.color} size={10} />}
                    {o.name}
                    <span className="font-mono text-fg-subtle tabular-nums">{o.eco}</span>
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
              <SectionHeading className="mb-3"><span className="inline-flex items-center gap-2"><PieceGlyph color="W" /> Blancas</span></SectionHeading>
              <OpeningGrid list={grouped.W} />
            </div>
          )}
          {grouped.B.length > 0 && (
            <div>
              <SectionHeading className="mb-3"><span className="inline-flex items-center gap-2"><PieceGlyph color="B" /> Negras</span></SectionHeading>
              <OpeningGrid list={grouped.B} />
            </div>
          )}
          {grouped.other.length > 0 && (
            <div>
              <button
                onClick={() => setShowOffRepertoire(o => !o)}
                aria-expanded={showOffRepertoire}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
              >
                {showOffRepertoire ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
                Fuera del repertorio ({grouped.other.length})
              </button>
              {showOffRepertoire && <OpeningGrid list={grouped.other} />}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default OpeningHeroesGallery;
