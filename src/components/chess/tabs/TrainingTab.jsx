import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getWeekDates, getWeekStats } from '../../../utils/chessHelpers';
import { useModal } from '../../modals/ModalContext';
import MotivationalQuote from './training/MotivationalQuote';
import WeekNavigator from './training/WeekNavigator';
import DayCard from './training/DayCard';
import QuickTemplates from './training/QuickTemplates';
import WeeklyReflections from './training/WeeklyReflections';
import MonthlyStats from './training/MonthlyStats';
import ReflectionHistory from './training/ReflectionHistory';

const motivationalQuotes = [
  { text: "The pawns are the soul of chess.", author: "Philidor" },
  { text: "Chess is the struggle against error.", author: "Tarrasch" },
  { text: "Help your pieces so they can help you.", author: "Morphy" },
  { text: "When you see a good move, look for a better one.", author: "Lasker" },
  { text: "Chess is 99% tactics.", author: "Teichmann" },
  { text: "Every chess master was once a beginner.", author: "Irving Chernev" },
  { text: "The blunders are all there on the board, waiting to be made.", author: "Savielly Tartakower" },
  { text: "You have to have the fighting spirit. You have to force moves and take chances.", author: "Bobby Fischer" },
  { text: "The hardest game to win is a won game.", author: "Emanuel Lasker" },
  { text: "Even a poor plan is better than no plan at all.", author: "Mikhail Chigorin" },
  { text: "I don't believe in psychology. I believe in good moves.", author: "Bobby Fischer" },
  { text: "Strategy requires thought, tactics require observation.", author: "Max Euwe" },
  { text: "The pin is mightier than the sword.", author: "Fred Reinfeld" },
  { text: "A bad plan is better than none at all.", author: "Frank Marshall" },
  { text: "Alekhine is a poet who creates a work of art out of something that would hardly inspire another man to send home a picture post card.", author: "Max Euwe" },
  { text: "I have come to the conclusion that I cannot improve on Alekhine's play. I may as well give up chess.", author: "Max Euwe" },
  { text: "Life is too short for chess.", author: "Lord Byron" },
  { text: "Chess is mental torture.", author: "Garry Kasparov" },
  { text: "Chess is the art of analysis.", author: "Mikhail Botvinnik" },
  { text: "No one ever won a game by resigning.", author: "Savielly Tartakower" }
];

const TrainingTab = ({
  currentWeek,
  setCurrentWeek,
  weeklyPlans,
  setWeeklyPlans,
  dailyNotes,
  updateDailyNote,
  editingDay,
  setEditingDay,
  weeklyHours,
  setWeeklyHours,
  getCurrentWeekPlan,
  updateDayPlan,
  exportToGoogleCalendar
}) => {
  const modal = useModal();
  const [completedActivities, setCompletedActivities] = useState({});
  const [showMotivation, setShowMotivation] = useState(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const currentQuote = motivationalQuotes[currentQuoteIndex];

  const nextQuote = () => {
    setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
  };

  const prevQuote = () => {
    setCurrentQuoteIndex((prev) => (prev - 1 + motivationalQuotes.length) % motivationalQuotes.length);
  };

  const weekStats = getWeekStats(weeklyPlans, currentWeek);
  const weekDates = getWeekDates(currentWeek);

  // Calculate completion percentage
  const totalActivities = Object.values(getCurrentWeekPlan()).flat().length;
  const completedCount = Object.values(completedActivities).filter(Boolean).length;
  const completionPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const toggleActivityCompletion = (activityKey) => {
    setCompletedActivities(prev => ({
      ...prev,
      [activityKey]: !prev[activityKey]
    }));
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(next.toISOString().split('T')[0]);
  };

  const handleClearWeek = async () => {
    const confirmed = await modal.confirm('Clear this week\'s entire plan?', 'Clear Weekly Plan');
    if (confirmed) {
      setWeeklyPlans(prev => {
        const newPlans = { ...prev };
        delete newPlans[currentWeek];
        return newPlans;
      });
      setCompletedActivities({});
    }
  };

  const applyGMNoahMethod = () => {
    const dates = getWeekDates(currentWeek);
    const totalMinutes = weeklyHours * 60;
    const dailyMinutes = Math.round(totalMinutes / 6);
    const newPlan = {};
    dates.forEach(({ date }, idx) => {
      if (idx === 6) {
        newPlan[date] = [{ id: 'rest', minutes: 0, details: 'Recovery and mental reset' }];
      } else {
        const cycle = idx % 3;
        if (cycle === 0) {
          newPlan[date] = [{ id: 'tactics', minutes: dailyMinutes, details: 'Focus on tactical patterns' }];
        } else if (cycle === 1) {
          const playTime = Math.round(dailyMinutes * 0.5);
          const analysisTime = dailyMinutes - playTime;
          newPlan[date] = [
            { id: 'games', minutes: playTime, details: 'Play with full focus' },
            { id: 'analysis', minutes: analysisTime, details: 'Deep analysis' }
          ];
        } else {
          newPlan[date] = [{ id: 'endgame', minutes: dailyMinutes, details: 'Endgame fundamentals' }];
        }
      }
    });
    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
  };

  const applyBalancedDaily = () => {
    const dates = getWeekDates(currentWeek);
    const totalMinutes = weeklyHours * 60;
    const dailyMinutes = Math.round(totalMinutes / 6);
    const tacticsTime = Math.round(dailyMinutes / 3);
    const gamesTime = Math.round(dailyMinutes / 2);
    const endgameTime = dailyMinutes - tacticsTime - gamesTime;
    const newPlan = {};
    dates.forEach(({ date }, idx) => {
      if (idx === 6) {
        newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
      } else {
        newPlan[date] = [
          { id: 'tactics', minutes: tacticsTime, details: '' },
          { id: 'games', minutes: gamesTime, details: '' },
          { id: 'endgame', minutes: endgameTime, details: '' }
        ];
      }
    });
    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
  };

  const applyBlockFocus = () => {
    const dates = getWeekDates(currentWeek);
    const totalMinutes = weeklyHours * 60;
    const tacticsDaily = Math.round(totalMinutes / 3 / 3);
    const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2);
    const endgameDaily = Math.round(totalMinutes / 3);
    const newPlan = {};
    dates.forEach(({ date }, idx) => {
      if (idx === 6) {
        newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
      } else if (idx <= 2) {
        newPlan[date] = [{ id: 'tactics', minutes: tacticsDaily, details: 'Deep tactical training' }];
      } else if (idx === 3 || idx === 4) {
        const playTime = Math.round(playAnalyzeDaily * 0.67);
        const analysisTime = playAnalyzeDaily - playTime;
        newPlan[date] = [
          { id: 'games', minutes: playTime, details: 'Multiple games' },
          { id: 'analysis', minutes: analysisTime, details: 'Deep review' }
        ];
      } else {
        newPlan[date] = [{ id: 'endgame', minutes: endgameDaily, details: 'Intensive endgame study' }];
      }
    });
    setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Quote */}
      <MotivationalQuote
        currentQuote={currentQuote}
        currentQuoteIndex={currentQuoteIndex}
        totalQuotes={motivationalQuotes.length}
        onPrevQuote={prevQuote}
        onNextQuote={nextQuote}
        onClose={() => setShowMotivation(false)}
        show={showMotivation}
      />

      {/* Week Navigator & Stats */}
      <WeekNavigator
        currentWeek={currentWeek}
        weekDates={weekDates}
        weekStats={weekStats}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        completionPercent={completionPercent}
        completedCount={completedCount}
        totalActivities={totalActivities}
      />

      {/* Weekly Planner Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {weekDates.map(({ day, date, displayDate }) => {
          const dayPlan = getCurrentWeekPlan()[date] || [];
          const note = dailyNotes[date] || '';
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <DayCard
              key={date}
              day={day}
              date={date}
              displayDate={displayDate}
              isToday={isToday}
              dayPlan={dayPlan}
              note={note}
              editingDay={editingDay}
              completedActivities={completedActivities}
              onToggleActivityCompletion={toggleActivityCompletion}
              onRemoveActivity={(idx) => {
                const newPlan = dayPlan.filter((_, i) => i !== idx);
                updateDayPlan(date, newPlan);
              }}
              onSetEditingDay={setEditingDay}
              onAddActivity={(activity) => {
                const newActivity = {
                  id: activity.id,
                  minutes: activity.defaultMinutes,
                  details: ''
                };
                updateDayPlan(date, [...dayPlan, newActivity]);
                setEditingDay(null);
              }}
              onExportToCalendar={exportToGoogleCalendar}
              onUpdateNote={updateDailyNote}
            />
          );
        })}
      </div>

      {/* Quick Templates */}
      <QuickTemplates
        weeklyHours={weeklyHours}
        setWeeklyHours={setWeeklyHours}
        onApplyGMNoahMethod={applyGMNoahMethod}
        onApplyBalancedDaily={applyBalancedDaily}
        onApplyBlockFocus={applyBlockFocus}
        onClearWeek={handleClearWeek}
      />

      {/* Week Summary */}
      <WeeklyReflections
        currentWeek={currentWeek}
        dailyNotes={dailyNotes}
        onUpdateNote={updateDailyNote}
      />

      {/* Monthly Training Stats */}
      <MonthlyStats weeklyPlans={weeklyPlans} />

      {/* Reflection History */}
      <ReflectionHistory
        dailyNotes={dailyNotes}
        currentWeek={currentWeek}
      />
    </div>
  );
};

TrainingTab.propTypes = {
  currentWeek: PropTypes.string.isRequired,
  setCurrentWeek: PropTypes.func.isRequired,
  weeklyPlans: PropTypes.object.isRequired,
  setWeeklyPlans: PropTypes.func.isRequired,
  dailyNotes: PropTypes.object.isRequired,
  updateDailyNote: PropTypes.func.isRequired,
  editingDay: PropTypes.string,
  setEditingDay: PropTypes.func.isRequired,
  weeklyHours: PropTypes.number.isRequired,
  setWeeklyHours: PropTypes.func.isRequired,
  getCurrentWeekPlan: PropTypes.func.isRequired,
  updateDayPlan: PropTypes.func.isRequired,
  exportToGoogleCalendar: PropTypes.func.isRequired,
};

export default TrainingTab;
