import { ClockBar, StatCard } from '../../../ui';
import type { GameResult } from '../../../../types/chess';

interface StreaksHeroData {
  currentWinStreak: number;
  currentUnbeatenStreak: number;
  gamesThisWeek: number;
  consistency: number;
  longestWinStreak?: number;
  longestUnbeatenStreak?: number;
  currentLossStreak?: number;
}

interface StreaksHeroSectionProps {
  streaksData: StreaksHeroData;
  /** Last ten results, most recent first (formStats.last10). */
  last10?: { results: GameResult[]; wins: number; draws: number };
}

const SYMBOL: Record<GameResult, string> = { W: '1', D: '½', L: '0' };
const COLOR: Record<GameResult, string> = { W: 'text-win', D: 'text-fg-muted', L: 'text-loss' };

const fmtPoints = (n: number): string => {
  const whole = Math.floor(n);
  if (n - whole < 0.5) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

/** The view's one metrics bar: form, the two longest streaks, and the current one. */
const StreaksHeroSection = ({ streaksData, last10 }: StreaksHeroSectionProps) => {
  const loss = streaksData.currentLossStreak ?? 0;
  const current =
    streaksData.currentWinStreak > 0
      ? { value: streaksData.currentWinStreak, label: 'victorias seguidas', trend: 'up' as const }
      : loss > 0
        ? { value: loss, label: 'derrotas seguidas', trend: 'down' as const }
        : { value: streaksData.currentUnbeatenStreak, label: 'partidas sin perder', trend: undefined };

  return (
    <ClockBar>
      {last10 && last10.results.length > 0 && (
        <StatCard
          title={`Forma · últimas ${last10.results.length}`}
          value={
            <span className="text-[26px] tracking-[0.1em]">
              {[...last10.results].reverse().map((r, i) => (
                <span key={i} className={COLOR[r]}>{SYMBOL[r]}</span>
              ))}
            </span>
          }
          subtitle={`${fmtPoints(last10.wins + last10.draws / 2)} de ${last10.results.length} · la más reciente a la derecha`}
        />
      )}
      {streaksData.longestUnbeatenStreak != null && (
        <StatCard title="Invicto más largo" value={streaksData.longestUnbeatenStreak} subtitle="partidas sin perder" />
      )}
      {streaksData.longestWinStreak != null && (
        <StatCard title="Victorias seguidas" value={streaksData.longestWinStreak} subtitle="la mejor serie" />
      )}
      <StatCard title="Racha actual" value={current.value} trend={current.trend} subtitle={current.label} />
    </ClockBar>
  );
};

export default StreaksHeroSection;
