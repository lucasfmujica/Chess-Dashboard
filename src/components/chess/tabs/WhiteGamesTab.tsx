import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { Game, GameStats } from '../../../types/chess';
import { useGameViewer } from '../../../context/GameViewerContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

const StatCard = ({ title, value, subtitle }: StatCardProps) => (
  <div className="p-6 bg-surface rounded-lg border border-hairline">
    <h3 className="mb-2 text-sm text-fg-muted">{title}</h3>
    <div className="text-3xl font-bold text-accent tabular-nums">{value}</div>
    {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
  </div>
);

/** Per-opening aggregate row attached to colored game stats. */
interface ColorOpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

type ColorStats = GameStats & { openings: ColorOpeningStat[] };

type SortBy = 'date' | 'opponent' | 'result';
type SortOrder = 'asc' | 'desc';

interface WhiteGamesTabProps {
  whiteStats: ColorStats;
  whiteSortBy: SortBy;
  setWhiteSortBy: (v: SortBy) => void;
  whiteSortOrder: SortOrder;
  setWhiteSortOrder: (v: SortOrder) => void;
  games: Game[];
  ecoNames: Record<string, string>;
}

const WhiteGamesTab = ({
  whiteStats,
  whiteSortBy,
  setWhiteSortBy,
  whiteSortOrder,
  setWhiteSortOrder,
  games,
  ecoNames
}: WhiteGamesTabProps) => {
  const { openGameViewer } = useGameViewer();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Games as White"
          value={whiteStats.total}
          subtitle={`Win rate: ${whiteStats.winRate}%`}
        />
        <StatCard
          title="Score"
          value={whiteStats.score}
          subtitle={`${whiteStats.wins}W ${whiteStats.draws}D ${whiteStats.losses}L`}
        />
        <StatCard
          title="Performance Rating"
          value={whiteStats.performanceRating}
        />
      </div>

      <div className="p-6 bg-surface rounded-lg border border-hairline">
        <h3 className="mb-4 text-lg font-semibold text-fg">Results Distribution as White</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Wins', value: whiteStats.wins },
                { name: 'Draws', value: whiteStats.draws },
                { name: 'Losses', value: whiteStats.losses }
              ]}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }: { name?: string; value?: number; percent?: number }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#10b981" />
              <Cell fill="#f59e0b" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-surface rounded-lg border border-hairline">
        <h3 className="mb-4 text-lg font-semibold text-fg">Openings as White</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-left text-fg-subtle uppercase">Opening</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-fg-subtle uppercase">Games</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-fg-subtle uppercase">W-D-L</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-fg-subtle uppercase">Score</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-fg-subtle uppercase">Win Rate</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-hairline">
              {whiteStats.openings.map((opening) => (
                <tr key={opening.eco} className="hover:bg-surface-2">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-fg">{opening.name}</div>
                    <div className="text-xs text-fg-muted">{opening.eco}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-fg-muted tabular-nums">{opening.games}</td>
                  <td className="px-6 py-4 text-sm text-center text-fg-muted tabular-nums">
                    <span className="text-green-600">{opening.wins}</span>-
                    <span className="text-yellow-600">{opening.draws}</span>-
                    <span className="text-red-600">{opening.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-fg tabular-nums">{opening.score}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-semibold ${parseFloat(opening.winRate) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {opening.winRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-surface rounded-lg border border-hairline">
        <h3 className="mb-4 text-lg font-semibold text-fg">All Games as White</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-2">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-left uppercase cursor-pointer text-fg-subtle hover:bg-surface-2"
                  onClick={() => {
                    if (whiteSortBy === 'date') {
                      setWhiteSortOrder(whiteSortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setWhiteSortBy('date');
                      setWhiteSortOrder('desc');
                    }
                  }}
                >
                  Game # {whiteSortBy === 'date' && (whiteSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-center uppercase text-fg-subtle">My ELO</th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-left uppercase cursor-pointer text-fg-subtle hover:bg-surface-2"
                  onClick={() => {
                    if (whiteSortBy === 'opponent') {
                      setWhiteSortOrder(whiteSortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setWhiteSortBy('opponent');
                      setWhiteSortOrder('asc');
                    }
                  }}
                >
                  Opponent {whiteSortBy === 'opponent' && (whiteSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-center uppercase text-fg-subtle">Opp ELO</th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-center uppercase cursor-pointer text-fg-subtle hover:bg-surface-2"
                  onClick={() => {
                    setWhiteSortBy('result');
                    setWhiteSortOrder(whiteSortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Result {whiteSortBy === 'result' && (whiteSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-left uppercase text-fg-subtle">Opening</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-left uppercase text-fg-subtle">Tournament</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-center uppercase text-fg-subtle"><span className="sr-only">Replay</span></th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-hairline">
              {(() => {
                const whiteGames = games
                  .map((game, idx) => ({ ...game, gameNumber: idx + 1 }))
                  .filter(game => game.color === 'W');

                const sortedGames = [...whiteGames].sort((a, b) => {
                  let compareA: number | string;
                  let compareB: number | string;

                  switch (whiteSortBy) {
                    case 'date':
                      compareA = a.gameNumber;
                      compareB = b.gameNumber;
                      break;
                    case 'opponent':
                      compareA = (a.opp || '').toLowerCase();
                      compareB = (b.opp || '').toLowerCase();
                      break;
                    case 'result': {
                      const resultOrder: Record<string, number> = { 'W': 3, 'D': 2, 'L': 1 };
                      compareA = resultOrder[a.result];
                      compareB = resultOrder[b.result];
                      break;
                    }
                    default:
                      compareA = a.gameNumber;
                      compareB = b.gameNumber;
                  }

                  if (compareA < compareB) return whiteSortOrder === 'asc' ? -1 : 1;
                  if (compareA > compareB) return whiteSortOrder === 'asc' ? 1 : -1;
                  return 0;
                });

                return sortedGames.map((game) => (
                  <tr key={game.gameNumber} className="hover:bg-surface-2">
                    <td className="px-4 py-3 text-sm font-medium text-fg tabular-nums">#{game.gameNumber}</td>
                    <td className="px-4 py-3 text-sm text-center text-fg-muted tabular-nums">{game.elo}</td>
                    <td className="px-4 py-3 text-sm text-fg">{game.opp}</td>
                    <td className="px-4 py-3 text-sm text-center text-fg-muted tabular-nums">{game.opp_elo || 'Unrated'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded font-semibold ${game.result === 'W' ? 'bg-emerald-100 text-emerald-700' :
                        game.result === 'D' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted">
                      <div>{ecoNames[game.eco] || game.eco}</div>
                      <div className="text-xs text-fg-subtle">{game.eco}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted">{game.tournament}</td>
                    <td className="px-4 py-3 text-center">
                      {game.pgn && (
                        <button
                          onClick={() => openGameViewer({
                            pgn: game.pgn,
                            orientation: 'white',
                            white: 'You',
                            black: game.opp,
                            title: game.tournament,
                          })}
                          aria-label={`Replay game vs ${game.opp}`}
                          title="Replay game"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-hairline text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WhiteGamesTab;
