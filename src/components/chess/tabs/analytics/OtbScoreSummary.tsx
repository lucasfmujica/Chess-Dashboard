import { useMemo } from 'react';
import { scoreByGameOfDay, scoreByRound } from '../../../../utils/otbScore';
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

  const symbol = { W: '1', D: '½', L: '0' } as const;

  return (
    <div className="p-4 border border-hairline rounded-lg bg-surface-2 space-y-3">
      {rounds.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fg">
            Puntaje por ronda · {rounds[0].tournament}
          </h4>
          <p className="mt-1 text-xs text-fg-muted nums">
            {rounds.map(r => `R${r.round} ${symbol[r.result]}`).join(' · ')} —{' '}
            <span className="font-medium text-fg">
              {rounds[rounds.length - 1].total}/{rounds.length}
            </span>
          </p>
        </div>
      )}
      {day.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fg">Partidas del día · {day[0].date}</h4>
          <p className="mt-1 text-xs text-fg-muted nums">
            {day.map(g => `#${g.gameNo} ${symbol[g.result]}`).join(' · ')} —{' '}
            <span className="font-medium text-fg">
              {day[day.length - 1].total}/{day.length}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default OtbScoreSummary;
