import { Fragment, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { Game, TournamentStat } from '../../../../types/chess';
import { useGameViewer } from '../../../../context/GameViewerContext';
import { ecoNames } from '../../../../constants/ecoNames';
import { Card, CardHeader, ResultMark, Table, TBody, TD, TH, THead } from '../../../ui';

interface TournamentTableProps {
  tournamentStats: TournamentStat[];
  ratedGames: Game[];
}

/** "5.5/9" → { pts: "5½", pct: 61 }. */
const parseScore = (score: string, total: number) => {
  const pts = parseFloat(String(score).split('/')[0]) || 0;
  const whole = Math.floor(pts);
  return {
    pts: pts - whole >= 0.5 ? `${whole || ''}½` : String(whole),
    pct: total > 0 ? Math.round((pts / total) * 100) : 0,
  };
};

const TournamentTable = ({ tournamentStats, ratedGames }: TournamentTableProps) => {
  const { openGameViewer } = useGameViewer();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Historial" subtitle="tocá un torneo para ver sus partidas" className="mb-4" />
      <Table>
        <THead>
          <tr>
            <TH>Torneo</TH>
            <TH align="right">P</TH>
            <TH align="right">Pts</TH>
            <TH align="right">%</TH>
            <TH align="right">+ = −</TH>
            <TH align="right">Rival prom.</TH>
            <TH align="right">Perf.</TH>
            <TH align="right">Blancas</TH>
            <TH align="right">Negras</TH>
            <TH align="right">Δ ELO</TH>
          </tr>
        </THead>
        <TBody>
          {tournamentStats.map((t, idx) => {
            const isOpen = expanded === t.tournament;
            const games = isOpen ? ratedGames.filter(g => g.tournament === t.tournament) : [];
            const { pts, pct } = parseScore(t.score, t.total);
            const toggle = () => setExpanded(isOpen ? null : t.tournament);
            return (
              <Fragment key={idx}>
                <tr className="cursor-pointer transition-colors hover:bg-app" onClick={toggle}>
                  <TD className="min-w-[200px]">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={e => { e.stopPropagation(); toggle(); }}
                      className="flex items-center gap-2 text-left font-serif text-[15px] text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 shrink-0 text-fg-subtle transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                      />
                      {t.tournament}
                    </button>
                  </TD>
                  <TD align="right" className="font-mono">{t.total}</TD>
                  <TD align="right" className="font-mono">{pts}</TD>
                  <TD align="right" className="font-mono">{pct}</TD>
                  <TD align="right" muted className="whitespace-nowrap font-mono">+{t.wins} ={t.draws} −{t.losses}</TD>
                  <TD align="right" muted className="font-mono">{t.avgOppElo}</TD>
                  <TD align="right" className="font-mono font-medium">{t.performanceRating}</TD>
                  <TD align="right" muted className="font-mono">{t.whitePerformance}</TD>
                  <TD align="right" muted className="font-mono">{t.blackPerformance}</TD>
                  <TD
                    align="right"
                    className={`font-mono ${t.eloChange > 0 ? '!text-win' : t.eloChange < 0 ? '!text-loss' : '!text-fg-muted'}`}
                  >
                    {t.eloChange > 0 ? '+' : t.eloChange < 0 ? '−' : ''}
                    {Math.abs(t.eloChange)}
                  </TD>
                </tr>

                {isOpen && (
                  <tr className="bg-surface-2/40">
                    <td colSpan={10} className="px-3 py-4">
                      {games.length === 0 ? (
                        <p className="text-sm text-fg-muted">No hay partidas cargadas de este torneo.</p>
                      ) : (
                        <Table className="min-w-[560px]">
                          <THead>
                            <tr>
                              <TH>Rival</TH>
                              <TH align="right">ELO</TH>
                              <TH>Color</TH>
                              <TH>Apertura</TH>
                              <TH align="right">Res.</TH>
                              <TH><span className="sr-only">Repasar</span></TH>
                            </tr>
                          </THead>
                          <TBody>
                            {games.map((g, gi) => (
                              <tr key={gi}>
                                <TD className="whitespace-nowrap">{g.opp}</TD>
                                <TD align="right" muted className="font-mono">{g.opp_elo || 'Sin ELO'}</TD>
                                <TD muted>{g.color === 'W' ? 'Blancas' : 'Negras'}</TD>
                                <TD className="font-serif text-[15px]">{ecoNames[g.eco] || g.eco}</TD>
                                <TD align="right"><ResultMark result={g.result} outline /></TD>
                                <TD align="center">
                                  {g.pgn && (
                                    <button
                                      onClick={() => openGameViewer({
                                        pgn: g.pgn,
                                        orientation: g.color === 'W' ? 'white' : 'black',
                                        white: g.color === 'W' ? 'Vos' : g.opp,
                                        black: g.color === 'W' ? g.opp : 'Vos',
                                        result: g.result,
                                        title: g.tournament,
                                      })}
                                      aria-label={`Repasar la partida contra ${g.opp}`}
                                      title="Repasar partida"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-hairline text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    >
                                      <PlayIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </TD>
                              </tr>
                            ))}
                          </TBody>
                        </Table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {tournamentStats.length === 0 && (
            <tr>
              <td colSpan={10} className="px-3 py-6 text-center text-sm text-fg-muted">Todavía no hay torneos con partidas.</td>
            </tr>
          )}
        </TBody>
      </Table>
    </Card>
  );
};

export default TournamentTable;
