import { useStreaksData } from '../../../hooks/useStreaksData';
import StreaksHeroSection from './streaks/StreaksHeroSection';
import RecentFormSection from './streaks/RecentFormSection';
import StreakStatsCards from './streaks/StreakStatsCards';
import ActivityCalendar from './streaks/ActivityCalendar';
import WeeklyActivityChart from './streaks/WeeklyActivityChart';
import ConsistencyInsights from './streaks/ConsistencyInsights';
import ResultsSheet from './streaks/ResultsSheet';
import type { Game, GameResult, MonthlyStat } from '../../../types/chess';

interface FormStat {
  wins: number;
  draws: number;
  losses: number;
  percentage: string | number;
  results: GameResult[];
}

interface FormStats {
  last5: FormStat;
  last10: FormStat;
}

interface StreaksTabProps {
  games: Game[];
  formStats: FormStats;
  monthlyStats: MonthlyStat[];
}

const StreaksTab = ({ games, formStats, monthlyStats }: StreaksTabProps) => {
  const streaksData = useStreaksData(games);

  return (
    <div className="space-y-8">
      <StreaksHeroSection streaksData={streaksData} last10={formStats.last10} />

      <ResultsSheet games={games} />

      <RecentFormSection formStats={formStats} monthlyStats={monthlyStats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityCalendar calendar={streaksData.calendar} />
        <WeeklyActivityChart
          weeklyActivity={streaksData.weeklyActivity}
          avgGamesPerWeek={streaksData.avgGamesPerWeek}
        />
      </div>

      <StreakStatsCards streaksData={streaksData} />

      <ConsistencyInsights streaksData={streaksData} />
    </div>
  );
};

export default StreaksTab;
