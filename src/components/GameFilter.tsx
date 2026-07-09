import { FunnelIcon, MapPinIcon, WifiIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import type { Game } from '../types/chess';

type GameFilterValue = 'otb' | 'online' | 'all';

interface GameFilterProps {
  gameFilter: GameFilterValue;
  setGameFilter: (value: GameFilterValue) => void;
  filteredGames: Game[];
}

const GameFilter = ({ gameFilter, setGameFilter, filteredGames }: GameFilterProps) => {
  return (
    <div className="bg-surface rounded-lg border border-hairline p-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <FunnelIcon className="w-4 h-4 text-fg-muted" aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">Filter:</span>
        </div>
        <button
          onClick={() => setGameFilter('otb')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            gameFilter === 'otb'
              ? 'bg-surface-2 text-fg'
              : 'text-fg-muted hover:bg-surface-2'
          }`}
          aria-label="Filter to show only over-the-board games"
          aria-pressed={gameFilter === 'otb'}
        >
          <span className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" aria-hidden="true" />
            OTB
            {gameFilter === 'otb' && (
              <span className="ml-1 px-2 py-0.5 bg-accent text-accent-fg rounded-full text-xs font-bold tabular-nums">
                {filteredGames.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setGameFilter('online')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            gameFilter === 'online'
              ? 'bg-surface-2 text-fg'
              : 'text-fg-muted hover:bg-surface-2'
          }`}
          aria-label="Filter to show only online games"
          aria-pressed={gameFilter === 'online'}
        >
          <span className="flex items-center gap-2">
            <WifiIcon className="w-4 h-4" aria-hidden="true" />
            Online
            {gameFilter === 'online' && (
              <span className="ml-1 px-2 py-0.5 bg-accent text-accent-fg rounded-full text-xs font-bold tabular-nums">
                {filteredGames.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setGameFilter('all')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            gameFilter === 'all'
              ? 'bg-surface-2 text-fg'
              : 'text-fg-muted hover:bg-surface-2'
          }`}
          aria-label="Filter to show all games"
          aria-pressed={gameFilter === 'all'}
        >
          <span className="flex items-center gap-2">
            <ListBulletIcon className="w-4 h-4" aria-hidden="true" />
            All
            {gameFilter === 'all' && (
              <span className="ml-1 px-2 py-0.5 bg-accent text-accent-fg rounded-full text-xs font-bold tabular-nums">
                {filteredGames.length}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default GameFilter;
