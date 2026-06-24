import { useState } from 'react';
import type { Repertoire } from '../../../types/chess';

interface OpeningRecommendation {
  type?: string;
  opening: string;
  eco: string;
  reason: string;
  priority: 'high' | 'medium';
}

interface AnalyzedOpening {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  isMain: boolean;
  needsWork: boolean;
}

interface OpeningRepertoireAnalysis {
  white: AnalyzedOpening[];
  black: AnalyzedOpening[];
}

type OpeningHeroes = Record<string, string[]>;

interface RepertoireTabProps {
  openingRecommendations: OpeningRecommendation[];
  openingRepertoireAnalysis: OpeningRepertoireAnalysis;
  mainRepertoire: Repertoire;
  setMainRepertoire: (value: Repertoire | ((prev: Repertoire) => Repertoire)) => void;
  openingHeroes: OpeningHeroes;
  setOpeningHeroes: (value: OpeningHeroes | ((prev: OpeningHeroes) => OpeningHeroes)) => void;
}

const RepertoireTab = ({
  openingRecommendations,
  openingRepertoireAnalysis,
  mainRepertoire,
  setMainRepertoire,
  openingHeroes,
  setOpeningHeroes
}: RepertoireTabProps) => {
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);
  const [newHeroName, setNewHeroName] = useState('');

  const addHero = (eco: string) => {
    if (!newHeroName.trim()) return;
    const updated: OpeningHeroes = { ...openingHeroes };
    if (!updated[eco]) updated[eco] = [];
    if (!updated[eco].includes(newHeroName.trim())) {
      updated[eco].push(newHeroName.trim());
      setOpeningHeroes(updated);
    }
    setNewHeroName('');
  };

  const removeHero = (eco: string, heroName: string) => {
    const updated: OpeningHeroes = { ...openingHeroes };
    if (updated[eco]) {
      updated[eco] = updated[eco].filter(h => h !== heroName);
      if (updated[eco].length === 0) delete updated[eco];
      setOpeningHeroes(updated);
    }
  };
  return (
    <div className="space-y-6">
      <div className="p-6 border border-hairline rounded-lg bg-surface">
        <h3 className="flex items-center mb-4 text-lg font-semibold text-fg">
          <span className="mr-2 text-2xl">💡</span>
          Opening Recommendations
        </h3>
        {openingRecommendations.length > 0 ? (
          <div className="space-y-3">
            {openingRecommendations.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-surface-2 border border-hairline">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-fg">{rec.opening}</p>
                    <p className="text-sm text-fg-muted">{rec.eco}</p>
                    <p className="mt-1 text-sm text-fg">{rec.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rec.priority === 'high' ? 'bg-loss text-white' : 'bg-draw text-white'
                    }`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-fg-muted">No critical issues found. Your opening repertoire looks solid!</p>
        )}
      </div>

      {/* Opening Heroes Section */}
      <div className="p-6 border border-hairline rounded-lg bg-surface">
        <h3 className="flex items-center mb-4 text-lg font-semibold text-fg">
          <span className="mr-2 text-2xl">⭐</span>
          Opening Heroes
          <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-accent-fg rounded-full">NEW</span>
        </h3>
        <p className="text-sm text-fg-muted mb-4">
          Track which top players you're following for each opening in your repertoire.
          Add players to study their games in ChessBase or other databases.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* White Openings Heroes */}
          <div className="bg-surface-2 rounded-lg p-4 border border-hairline">
            <h4 className="font-semibold text-sm mb-3 text-fg">⚪ White Openings</h4>
            <div className="space-y-3">
              {openingRepertoireAnalysis.white.map((opening) => {
                return (
                  <div key={opening.eco} className="border border-hairline rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-xs text-fg">{opening.name}</p>
                        <p className="text-xs text-fg-muted">{opening.eco} • {opening.games} games</p>
                      </div>
                      <button
                        onClick={() => setSelectedOpening(selectedOpening === opening.eco ? null : opening.eco)}
                        className="text-xs px-2 py-1 border border-hairline bg-surface hover:bg-surface-2 text-fg rounded transition-colors"
                      >
                        {selectedOpening === opening.eco ? 'Cancel' : '+ Add Hero'}
                      </button>
                    </div>

                    {selectedOpening === opening.eco && (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newHeroName}
                          onChange={(e) => setNewHeroName(e.target.value)}
                          placeholder="Enter player name..."
                          className="flex-1 text-xs px-2 py-1 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
                          onKeyPress={(e) => e.key === 'Enter' && addHero(opening.eco)}
                        />
                        <button
                          onClick={() => addHero(opening.eco)}
                          className="text-xs px-3 py-1 bg-fg text-app rounded hover:opacity-90 transition-opacity"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {openingHeroes[opening.eco] && openingHeroes[opening.eco].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {openingHeroes[opening.eco].map((hero, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-hairline text-fg text-xs rounded-full"
                          >
                            {hero}
                            <button
                              onClick={() => removeHero(opening.eco, hero)}
                              className="hover:text-loss"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Black Openings Heroes */}
          <div className="bg-surface-2 rounded-lg p-4 border border-hairline">
            <h4 className="font-semibold text-sm mb-3 text-fg">⚫ Black Defenses</h4>
            <div className="space-y-3">
              {openingRepertoireAnalysis.black.map((opening) => {
                return (
                  <div key={opening.eco} className="border border-hairline rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-xs text-fg">{opening.name}</p>
                        <p className="text-xs text-fg-muted">{opening.eco} • {opening.games} games</p>
                      </div>
                      <button
                        onClick={() => setSelectedOpening(selectedOpening === opening.eco ? null : opening.eco)}
                        className="text-xs px-2 py-1 border border-hairline bg-surface hover:bg-surface-2 text-fg rounded transition-colors"
                      >
                        {selectedOpening === opening.eco ? 'Cancel' : '+ Add Hero'}
                      </button>
                    </div>

                    {selectedOpening === opening.eco && (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newHeroName}
                          onChange={(e) => setNewHeroName(e.target.value)}
                          placeholder="Enter player name..."
                          className="flex-1 text-xs px-2 py-1 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent"
                          onKeyPress={(e) => e.key === 'Enter' && addHero(opening.eco)}
                        />
                        <button
                          onClick={() => addHero(opening.eco)}
                          className="text-xs px-3 py-1 bg-fg text-app rounded hover:opacity-90 transition-opacity"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {openingHeroes[opening.eco] && openingHeroes[opening.eco].length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {openingHeroes[opening.eco].map((hero, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-hairline text-fg text-xs rounded-full"
                          >
                            {hero}
                            <button
                              onClick={() => removeHero(opening.eco, hero)}
                              className="hover:text-loss"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="p-6 bg-surface rounded-lg border border-hairline">
          <h3 className="mb-4 text-lg font-semibold text-fg">White Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-fg-muted">Main openings (click to toggle):</p>
            <div className="flex flex-wrap gap-2">
              {openingRepertoireAnalysis.white.slice(0, 8).map((opening, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newRepertoire = { ...mainRepertoire };
                    if (newRepertoire.white.includes(opening.eco)) {
                      newRepertoire.white = newRepertoire.white.filter(e => e !== opening.eco);
                    } else {
                      newRepertoire.white.push(opening.eco);
                    }
                    setMainRepertoire(newRepertoire);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                    ? 'bg-surface-2 text-fg border border-hairline'
                    : 'text-fg-muted hover:bg-surface-2'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-left text-fg-muted">Opening</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Games</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Score</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {openingRepertoireAnalysis.white.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-surface-2' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{opening.name}</div>
                      <div className="text-xs text-fg-muted">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-fg">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-win' : 'text-loss'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-loss bg-surface-2 border border-hairline rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-accent bg-surface-2 border border-hairline rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-fg-muted bg-surface-2 border border-hairline rounded">
                          Backup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-surface rounded-lg border border-hairline">
          <h3 className="mb-4 text-lg font-semibold text-fg">Black Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-fg-muted">Main defenses (click to toggle):</p>
            <div className="flex flex-wrap gap-2">
              {openingRepertoireAnalysis.black.slice(0, 8).map((opening, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newRepertoire = { ...mainRepertoire };
                    if (newRepertoire.black.includes(opening.eco)) {
                      newRepertoire.black = newRepertoire.black.filter(e => e !== opening.eco);
                    } else {
                      newRepertoire.black.push(opening.eco);
                    }
                    setMainRepertoire(newRepertoire);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                    ? 'bg-surface-2 text-fg border border-hairline'
                    : 'text-fg-muted hover:bg-surface-2'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-left text-fg-muted">Opening</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Games</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Score</th>
                  <th scope="col" className="px-3 py-2 text-xs font-medium text-center text-fg-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {openingRepertoireAnalysis.black.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-surface-2' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{opening.name}</div>
                      <div className="text-xs text-fg-muted">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-fg">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-win' : 'text-loss'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-loss bg-surface-2 border border-hairline rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-accent bg-surface-2 border border-hairline rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-fg-muted bg-surface-2 border border-hairline rounded">
                          Backup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepertoireTab;
