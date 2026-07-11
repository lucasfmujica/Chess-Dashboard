import OpeningComparisonChart from '../../charts/OpeningComparisonChart';
import OpeningHeroesGallery from './repertoire/OpeningHeroesGallery';
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
  setMainRepertoire: (value: Repertoire) => Promise<void>;
  openingHeroes: OpeningHeroes;
  setOpeningHeroes: (value: OpeningHeroes) => Promise<void>;
}

const RepertoireTab = ({
  openingRecommendations,
  openingRepertoireAnalysis,
  mainRepertoire,
  setMainRepertoire,
  openingHeroes,
  setOpeningHeroes
}: RepertoireTabProps) => {
  return (
    <div className="space-y-6">
      <OpeningComparisonChart white={openingRepertoireAnalysis.white} black={openingRepertoireAnalysis.black} />

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
      <OpeningHeroesGallery
        openingHeroes={openingHeroes}
        setOpeningHeroes={setOpeningHeroes}
        mainRepertoire={mainRepertoire}
        whiteOpenings={openingRepertoireAnalysis.white}
        blackOpenings={openingRepertoireAnalysis.black}
      />

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
