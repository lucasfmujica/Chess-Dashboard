import { Card, CardHeader } from '../../../ui';

interface StreakStatsData {
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  gamesThisMonth: number;
  gamesThisWeek?: number;
  consistency?: number;
}

interface StreakStatsCardsProps {
  streaksData: StreakStatsData;
}

/** How often you play: this week, the latest tournament, and regularity over 12 weeks. */
const StreakStatsCards = ({ streaksData }: StreakStatsCardsProps) => (
  <Card>
    <CardHeader title="Ritmo de juego" />
    <dl className="mt-4 grid grid-cols-1 divide-y divide-hairline rounded border border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="p-4">
        <dt className="text-label">Esta semana</dt>
        <dd className="mt-1 font-mono text-3xl tabular-nums text-fg">{streaksData.gamesThisWeek ?? '—'}</dd>
        <dd className="text-xs text-fg-muted">partidas · últimos 7 días</dd>
      </div>
      <div className="p-4">
        <dt className="text-label">Último torneo</dt>
        <dd className="mt-1 font-mono text-3xl tabular-nums text-fg">{streaksData.gamesThisMonth}</dd>
        <dd className="text-xs text-fg-muted">partidas jugadas</dd>
      </div>
      <div className="p-4">
        <dt className="text-label">Constancia</dt>
        <dd className="mt-1 font-mono text-3xl tabular-nums text-fg">
          {streaksData.consistency != null ? `${streaksData.consistency}%` : '—'}
        </dd>
        <dd className="text-xs text-fg-muted">semanas con partidas · 12 semanas</dd>
      </div>
    </dl>
  </Card>
);

export default StreakStatsCards;
