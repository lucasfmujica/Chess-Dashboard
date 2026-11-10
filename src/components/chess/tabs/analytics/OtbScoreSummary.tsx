import { useMemo } from 'react';
import { scoreByGameOfDay, scoreByRound } from '../../../../utils/otbScore';
import ResultMark from '../../../ui/ResultMark';
import type { Game } from '../../../../types/chess';

interface OtbScoreSummaryProps {
  games: Game[];
}

/**
 * Score of the latest OTB tournament round by round, and of the latest OTB day
 * game by game. Renders nothing until there is an OTB game to count.
 */
const OtbScoreSummary = ({ games }: OtbScoreSummaryProps) => {
  const { rounds, day } = useMemo(() => {
    const allRounds = scoreByRound(games);
    const lastTournament = allRounds.length ? allRounds[allRounds.length - 1].tournament : null;
    const allDays = scoreByGameOfDay(games);
    const lastDate = allDays.length ? allDays[allDays.length - 1].date : null;
    return {
      rounds: allRounds.filter(r => r.tournament === lastTournament),
      day: allDays.filter(r => r.date === lastDate),
    };
  }, [games]);

  if (rounds.length === 0 && day.length === 0) return null;

  const fmt = (n: number) => {
    const whole = Math.floor(n);
    if (n - whole < 0.5) return String(whole);
    return whole === 0 ? '½' : `${whole}½`;
  };

  return (
    <div className="space-y-4 rounded border border-hairline bg-surface-2 p-4">
      {rounds.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-fg">Puntaje por ronda · {rounds[0].tournament}</h4>
            <span className="font-mono text-sm tabular-nums text-fg">
              {fmt(rounds[rounds.length - 1].total)} / {rounds.length}
            </span>
          </div>
          <ol className="mt-2 flex flex-wrap gap-2">
            {rounds.map((r, i) => (
              <li key={i} className="flex items-center gap-1 font-mono text-xs tabular-nums text-fg-muted">
                R{r.round}
                <ResultMark result={r.result} outline />
              </li>
            ))}
          </ol>
        </div>
      )}
      {day.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-fg">Partidas del día · <span className="font-mono">{day[0].date}</span></h4>
            <span className="font-mono text-sm tabular-nums text-fg">
              {fmt(day[day.length - 1].total)} / {day.length}
            </span>
          </div>
          <ol className="mt-2 flex flex-wrap gap-2">
            {day.map((g, i) => (
              <li key={i} className="flex items-center gap-1 font-mono text-xs tabular-nums text-fg-muted">
                #{g.gameNo}
                <ResultMark result={g.result} outline />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default OtbScoreSummary;
