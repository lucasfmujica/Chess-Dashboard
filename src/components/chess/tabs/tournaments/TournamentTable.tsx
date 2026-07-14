import { Fragment, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { Game, TournamentStat } from '../../../../types/chess';
import { useGameViewer } from '../../../../context/GameViewerContext';
import { ecoNames } from '../../../../constants/ecoNames';
import Badge, { resultTone } from '../../../ui/Badge';

interface TournamentTableProps {
  tournamentStats: TournamentStat[];
  ratedGames: Game[];
}

const resultLabel = (r: string) => (r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss');

const TournamentTable = ({ tournamentStats, ratedGames }: TournamentTableProps) => {
  const { openGameViewer } = useGameViewer();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-h2 text-fg mb-1">Tournament Performance</h3>
          <p className="text-fg-muted text-sm">Click a tournament to see the games that make it up</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="px-6 py-4 text-label text-left">Tournament</th>
                <th scope="col" className="px-6 py-4 text-label text-center">Games</th>
                <th scope="col" className="px-6 py-4 text-label text-center">Score</th>
                <th scope="col" className="px-6 py-4 text-label text-center">W-D-L</th>
                <th scope="col" className="px-6 py-4 text-label text-center">Avg Opp</th>
                <th scope="col" className="px-6 py-4 text-label text-center">Performance</th>
                <th scope="col" className="px-6 py-4 text-label text-center">White</th>
                <th scope="col" className="px-6 py-4 text-label text-center">Black</th>
                <th scope="col" className="px-6 py-4 text-label text-center">ELO Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {tournamentStats.map((t, idx) => {
                const isOpen = expanded === t.tournament;
                const games = isOpen
                  ? ratedGames.filter(g => g.tournament === t.tournament)
                  : [];
                return (
                  <Fragment key={idx}>
                    <tr
                      className="hover:bg-surface-2 transition-colors duration-150 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : t.tournament)}
                      aria-expanded={isOpen}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-fg">
                        <span className="flex items-center gap-2">
                          <ChevronRightIcon
                            className={`w-4 h-4 shrink-0 text-fg-subtle transition-transform ${isOpen ? 'rotate-90' : ''}`}
                            aria-hidden="true"
                          />
                          {t.tournament}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center tabular-nums">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-fg">
                          {t.total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-center text-fg tabular-nums">{t.score}</td>
                      <td className="px-6 py-4 text-sm text-center tabular-nums">
                        <div className="flex items-center justify-center gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-win/12 text-win font-semibold text-xs">{t.wins}</span>
                          <span className="text-fg-subtle">-</span>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-draw/12 text-draw font-semibold text-xs">{t.draws}</span>
                          <span className="text-fg-subtle">-</span>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-loss/12 text-loss font-semibold text-xs">{t.losses}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.avgOppElo}</td>
                      <td className="px-6 py-4 text-sm font-bold text-center tabular-nums">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent/10 text-accent font-bold">
                          {t.performanceRating}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.whitePerformance}</td>
                      <td className="px-6 py-4 text-sm text-center text-fg-muted font-medium tabular-nums">{t.blackPerformance}</td>
                      <td className="px-6 py-4 text-sm font-bold text-center tabular-nums">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold ${
                          t.eloChange > 0 ? 'bg-win/12 text-win' :
                          t.eloChange < 0 ? 'bg-loss/12 text-loss' : 'bg-surface-2 text-fg-muted'
                        }`}>
                          {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-surface-2/40">
                        <td colSpan={9} className="px-6 py-4">
                          {games.length === 0 ? (
                            <p className="text-sm text-fg-muted">No individual games recorded for this tournament.</p>
                          ) : (
                            <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="border-b border-hairline">
                                    <th className="px-4 py-2.5 text-label text-left">Opponent</th>
                                    <th className="px-4 py-2.5 text-label text-center">Opp ELO</th>
                                    <th className="px-4 py-2.5 text-label text-center">Color</th>
                                    <th className="px-4 py-2.5 text-label text-center">Result</th>
                                    <th className="px-4 py-2.5 text-label text-left">Opening</th>
                                    <th className="px-4 py-2.5 text-label text-center"><span className="sr-only">Replay</span></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                  {games.map((g, gi) => (
                                    <tr key={gi} className="hover:bg-surface-2">
                                      <td className="px-4 py-2.5 text-sm text-fg">{g.opp}</td>
                                      <td className="px-4 py-2.5 text-sm text-center text-fg-muted tabular-nums">{g.opp_elo || 'Unrated'}</td>
                                      <td className="px-4 py-2.5 text-sm text-center text-fg-muted">{g.color === 'W' ? 'White' : 'Black'}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <Badge tone={resultTone(g.result)}>{resultLabel(g.result)}</Badge>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-fg-muted">{ecoNames[g.eco] || g.eco}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        {g.pgn && (
                                          <button
                                            onClick={() => openGameViewer({
                                              pgn: g.pgn,
                                              orientation: g.color === 'W' ? 'white' : 'black',
                                              white: g.color === 'W' ? 'You' : g.opp,
                                              black: g.color === 'W' ? g.opp : 'You',
                                              result: g.result,
                                              title: g.tournament,
                                            })}
                                            aria-label={`Replay game vs ${g.opp}`}
                                            title="Replay game"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-hairline text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
                                          >
                                            <PlayIcon className="w-4 h-4" />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TournamentTable;
