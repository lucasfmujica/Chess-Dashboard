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
      <div className="p-6 border border-blue-200 rounded-lg shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="flex items-center mb-4 text-lg font-semibold">
          <span className="mr-2 text-2xl">💡</span>
          Opening Recommendations
        </h3>
        {openingRecommendations.length > 0 ? (
          <div className="space-y-3">
            {openingRecommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${rec.priority === 'high' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{rec.opening}</p>
                    <p className="text-sm text-gray-600">{rec.eco}</p>
                    <p className="mt-1 text-sm">{rec.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rec.priority === 'high' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                    }`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No critical issues found. Your opening repertoire looks solid!</p>
        )}
      </div>

      {/* Opening Heroes Section */}
      <div className="p-6 border-2 border-purple-200 rounded-lg shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
        <h3 className="flex items-center mb-4 text-lg font-semibold text-purple-900">
          <span className="mr-2 text-2xl">⭐</span>
          Opening Heroes
          <span className="ml-2 px-2 py-0.5 text-xs bg-purple-200 text-purple-800 rounded-full">NEW</span>
        </h3>
        <p className="text-sm text-purple-700 mb-4">
          Track which top players you're following for each opening in your repertoire.
          Add players to study their games in ChessBase or other databases.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* White Openings Heroes */}
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-sm mb-3 text-gray-800">⚪ White Openings</h4>
            <div className="space-y-3">
              {openingRepertoireAnalysis.white.map((opening) => {
                return (
                  <div key={opening.eco} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-xs text-gray-900">{opening.name}</p>
                        <p className="text-xs text-gray-500">{opening.eco} • {opening.games} games</p>
                      </div>
                      <button
                        onClick={() => setSelectedOpening(selectedOpening === opening.eco ? null : opening.eco)}
                        className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
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
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                          onKeyPress={(e) => e.key === 'Enter' && addHero(opening.eco)}
                        />
                        <button
                          onClick={() => addHero(opening.eco)}
                          className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {hero}
                            <button
                              onClick={() => removeHero(opening.eco, hero)}
                              className="hover:text-purple-900"
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
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-sm mb-3 text-gray-800">⚫ Black Defenses</h4>
            <div className="space-y-3">
              {openingRepertoireAnalysis.black.map((opening) => {
                return (
                  <div key={opening.eco} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-xs text-gray-900">{opening.name}</p>
                        <p className="text-xs text-gray-500">{opening.eco} • {opening.games} games</p>
                      </div>
                      <button
                        onClick={() => setSelectedOpening(selectedOpening === opening.eco ? null : opening.eco)}
                        className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
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
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                          onKeyPress={(e) => e.key === 'Enter' && addHero(opening.eco)}
                        />
                        <button
                          onClick={() => addHero(opening.eco)}
                          className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {hero}
                            <button
                              onClick={() => removeHero(opening.eco, hero)}
                              className="hover:text-purple-900"
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
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">White Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600">Main openings (click to toggle):</p>
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {openingRepertoireAnalysis.white.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{opening.name}</div>
                      <div className="text-xs text-gray-500">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
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

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Black Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600">Main defenses (click to toggle):</p>
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
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {openingRepertoireAnalysis.black.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-gray-100' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{opening.name}</div>
                      <div className="text-xs text-gray-500">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
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
