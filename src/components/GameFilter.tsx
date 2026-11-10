import type { Game } from '../types/chess';

type GameFilterValue = 'otb' | 'online' | 'all';

interface GameFilterProps {
  gameFilter: GameFilterValue;
  setGameFilter: (value: GameFilterValue) => void;
  filteredGames: Game[];
}

const OPTIONS: { value: GameFilterValue; label: string; aria: string }[] = [
  { value: 'otb', label: 'Torneo', aria: 'Mostrar solo partidas de torneo' },
  { value: 'online', label: 'Online', aria: 'Mostrar solo partidas online' },
  { value: 'all', label: 'Todas', aria: 'Mostrar todas las partidas' },
];

/**
 * Which games feed every view. A ruled column header (Planilla "Segmented"):
 * the chosen source underlined in pen, with its game count in mono.
 */
const GameFilter = ({ gameFilter, setGameFilter, filteredGames }: GameFilterProps) => (
  <div className="inline-flex border-b border-hairline" role="group" aria-label="Origen de las partidas">
    {OPTIONS.map(opt => {
      const active = gameFilter === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => setGameFilter(opt.value)}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            active ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
          }`}
          aria-label={opt.aria}
          aria-pressed={active}
        >
          {opt.label}
          {active && <span className="font-mono text-xs tabular-nums text-fg-subtle">{filteredGames.length}</span>}
        </button>
      );
    })}
  </div>
);

export default GameFilter;
