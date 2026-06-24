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
          <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
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
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
            </svg>
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
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
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
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
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
