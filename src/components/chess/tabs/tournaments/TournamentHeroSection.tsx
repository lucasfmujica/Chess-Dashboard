import { ClockBar, StatCard } from '../../../ui';
import type { TournamentStat } from '../../../../types/chess';

interface TournamentHeroStats {
  totalTournaments: number;
  totalGames: number;
  bestPerformance: number;
  averageScore: number | string;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
}

interface TournamentHeroSectionProps {
  stats: TournamentHeroStats;
  /** Per-event rows, for the ELO gained across all of them. */
  tournamentStats?: TournamentStat[];
}

/** 30.5 → "30½". */
const fmtPts = (p: number) => {
  const whole = Math.floor(p);
  return p - whole >= 0.5 ? `${whole || ''}½` : String(whole);
};

/** Totals of the tournament record, read like the header of a scoresheet. */
const TournamentHeroSection = ({ stats, tournamentStats = [] }: TournamentHeroSectionProps) => {
  const points = stats.totalWins + stats.totalDraws / 2;
  const eloGained = tournamentStats.reduce((sum, t) => sum + (t.eloChange || 0), 0);
  const best = tournamentStats.reduce<TournamentStat | null>(
    (b, t) => (t.performanceRating > (b?.performanceRating ?? -Infinity) ? t : b),
    null
  );

  return (
    <ClockBar>
      <StatCard
        title="Partidas"
        value={stats.totalGames}
        subtitle={`+${stats.totalWins} =${stats.totalDraws} −${stats.totalLosses} · ${stats.totalTournaments} torneos`}
      />
      <StatCard
        title="Puntaje"
        value={stats.totalGames ? `${Math.round(Number(stats.averageScore))}%` : '—'}
        subtitle={`${fmtPts(points)} de ${stats.totalGames}`}
      />
      <StatCard
        title="Mejor performance"
        value={stats.bestPerformance || '—'}
        subtitle={best?.name || best?.tournament || 'sin torneos'}
      />
      <StatCard
        title="ELO ganado"
        value={`${eloGained >= 0 ? '+' : '−'}${Math.abs(Math.round(eloGained))}`}
        trend={stats.totalTournaments ? (eloGained >= 0 ? 'up' : 'down') : undefined}
        subtitle={`en ${stats.totalTournaments} torneos`}
      />
    </ClockBar>
  );
};

export default TournamentHeroSection;
