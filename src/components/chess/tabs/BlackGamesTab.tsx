import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Game, GameStats } from '../../../types/chess';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

const StatCard = ({ title, value, subtitle }: StatCardProps) => (
  <div className="p-6 bg-white rounded-lg shadow-md">
    <h3 className="mb-2 text-sm text-gray-600">{title}</h3>
    <div className="text-3xl font-bold text-blue-600">{value}</div>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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

interface BlackGamesTabProps {
  blackStats: ColorStats;
  blackSortBy: SortBy;
  setBlackSortBy: (v: SortBy) => void;
  blackSortOrder: SortOrder;
  setBlackSortOrder: (v: SortOrder) => void;
  games: Game[];
  ecoNames: Record<string, string>;
}

const BlackGamesTab = ({
  blackStats,
  blackSortBy,
  setBlackSortBy,
  blackSortOrder,
  setBlackSortOrder,
  games,
  ecoNames
}: BlackGamesTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Games as Black"
          value={blackStats.total}
          subtitle={`Win rate: ${blackStats.winRate}%`}
        />
        <StatCard
          title="Score"
          value={blackStats.score}
          subtitle={`${blackStats.wins}W ${blackStats.draws}D ${blackStats.losses}L`}
        />
        <StatCard
          title="Performance Rating"
          value={blackStats.performanceRating}
        />
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Results Distribution as Black</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[
                { name: 'Wins', value: blackStats.wins },
                { name: 'Draws', value: blackStats.draws },
                { name: 'Losses', value: blackStats.losses }
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

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Openings as Black</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blackStats.openings.map((opening) => (
                <tr key={opening.eco} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{opening.name}</div>
                    <div className="text-xs text-gray-500">{opening.eco}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.games}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    <span className="text-green-600">{opening.wins}</span>-
                    <span className="text-yellow-600">{opening.draws}</span>-
                    <span className="text-red-600">{opening.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{opening.score}</td>
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

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">All Games as Black</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-left uppercase cursor-pointer text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    if (blackSortBy === 'date') {
                      setBlackSortOrder(blackSortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setBlackSortBy('date');
                      setBlackSortOrder('desc');
                    }
                  }}
                >
                  Game # {blackSortBy === 'date' && (blackSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-center uppercase text-slate-600">My ELO</th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-left uppercase cursor-pointer text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    if (blackSortBy === 'opponent') {
                      setBlackSortOrder(blackSortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setBlackSortBy('opponent');
                      setBlackSortOrder('asc');
                    }
                  }}
                >
                  Opponent {blackSortBy === 'opponent' && (blackSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-center uppercase text-slate-600">Opp ELO</th>
                <th
                  scope="col"
                  className="px-4 py-3 text-xs font-medium text-center uppercase cursor-pointer text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    setBlackSortBy('result');
                    setBlackSortOrder(blackSortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  Result {blackSortBy === 'result' && (blackSortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-left uppercase text-slate-600">Opening</th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-left uppercase text-slate-600">Tournament</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {(() => {
                const blackGames = games
                  .map((game, idx) => ({ ...game, gameNumber: idx + 1 }))
                  .filter(game => game.color === 'B');

                const sortedGames = [...blackGames].sort((a, b) => {
                  let compareA: number | string;
                  let compareB: number | string;

                  switch (blackSortBy) {
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

                  if (compareA < compareB) return blackSortOrder === 'asc' ? -1 : 1;
                  if (compareA > compareB) return blackSortOrder === 'asc' ? 1 : -1;
                  return 0;
                });

                return sortedGames.map((game) => (
                  <tr key={game.gameNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">#{game.gameNumber}</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-700">{game.elo}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{game.opp}</td>
                    <td className="px-4 py-3 text-sm text-center text-slate-700">{game.opp_elo || 'Unrated'}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded font-semibold ${game.result === 'W' ? 'bg-emerald-100 text-emerald-700' :
                        game.result === 'D' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>{ecoNames[game.eco] || game.eco}</div>
                      <div className="text-xs text-slate-500">{game.eco}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{game.tournament}</td>
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

export default BlackGamesTab;
