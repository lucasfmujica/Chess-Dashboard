import { useStreaksData } from '../../../hooks/useStreaksData';
import StreaksHeroSection from './streaks/StreaksHeroSection';
import RecentFormSection from './streaks/RecentFormSection';
import StreakStatsCards from './streaks/StreakStatsCards';
import ActivityCalendar from './streaks/ActivityCalendar';
import WeeklyActivityChart from './streaks/WeeklyActivityChart';
import ConsistencyInsights from './streaks/ConsistencyInsights';
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
      {/* Hero Section */}
      <StreaksHeroSection streaksData={streaksData} />

      {/* Recent Form Section */}
      <RecentFormSection formStats={formStats} monthlyStats={monthlyStats} />

      {/* Streak Stats Cards */}
      <StreakStatsCards streaksData={streaksData} />

      {/* Activity Calendar */}
      <ActivityCalendar calendar={streaksData.calendar} />

      {/* Weekly Activity Chart */}
      <WeeklyActivityChart
        weeklyActivity={streaksData.weeklyActivity}
        avgGamesPerWeek={streaksData.avgGamesPerWeek}
      />

      {/* Consistency Insights */}
      <ConsistencyInsights streaksData={streaksData} />
    </div>
  );
};

export default StreaksTab;
