import React, { useState } from 'react';
import GameFilter from './GameFilter';

export default {
  title: 'Components/GameFilter',
  component: GameFilter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const mockGames = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  source: i % 3 === 0 ? 'otb' : 'lichess',
}));

const InteractiveGameFilter = () => {
  const [gameFilter, setGameFilter] = useState('otb');

  const filteredGames = mockGames.filter(g => {
    if (gameFilter === 'all') return true;
    if (gameFilter === 'otb') return g.source === 'otb' || !g.source;
    if (gameFilter === 'online') return g.source === 'lichess';
    return true;
  });

  return (
    <div className="p-8">
      <GameFilter
        gameFilter={gameFilter}
        setGameFilter={setGameFilter}
        filteredGames={filteredGames}
      />
      <div className="mt-4 text-sm text-slate-600">
        Current filter: <strong>{gameFilter}</strong> | Showing {filteredGames.length} games
      </div>
    </div>
  );
};

export const Interactive = () => <InteractiveGameFilter />;

export const FilteredToOTB = {
  args: {
    gameFilter: 'otb',
    setGameFilter: () => {},
    filteredGames: mockGames.filter(g => g.source === 'otb'),
  },
};

export const FilteredToOnline = {
  args: {
    gameFilter: 'online',
    setGameFilter: () => {},
    filteredGames: mockGames.filter(g => g.source === 'lichess'),
  },
};

export const ShowingAll = {
  args: {
    gameFilter: 'all',
    setGameFilter: () => {},
    filteredGames: mockGames,
  },
};
