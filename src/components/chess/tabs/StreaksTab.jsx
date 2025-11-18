import React from 'react';
import PropTypes from 'prop-types';
import { useStreaksData } from '../../../hooks/useStreaksData';
import StreaksHeroSection from './streaks/StreaksHeroSection';
import RecentFormSection from './streaks/RecentFormSection';
import StreakStatsCards from './streaks/StreakStatsCards';
import ActivityCalendar from './streaks/ActivityCalendar';
import WeeklyActivityChart from './streaks/WeeklyActivityChart';
import ConsistencyInsights from './streaks/ConsistencyInsights';

const StreaksTab = ({ games, formStats, monthlyStats }) => {
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

StreaksTab.propTypes = {
  games: PropTypes.arrayOf(PropTypes.object).isRequired,
  formStats: PropTypes.shape({
    last5: PropTypes.shape({
      wins: PropTypes.number,
      draws: PropTypes.number,
      losses: PropTypes.number,
      percentage: PropTypes.number,
      results: PropTypes.arrayOf(PropTypes.string),
    }),
    last10: PropTypes.shape({
      wins: PropTypes.number,
      draws: PropTypes.number,
      losses: PropTypes.number,
      percentage: PropTypes.number,
      results: PropTypes.arrayOf(PropTypes.string),
    }),
  }),
  monthlyStats: PropTypes.arrayOf(PropTypes.object),
};

export default StreaksTab;
