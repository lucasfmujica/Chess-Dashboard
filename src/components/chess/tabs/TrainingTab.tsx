import { useState } from 'react';
import { getWeekDates, getWeekStats } from '../../../utils/chessHelpers';
import { useModal } from '../../modals/ModalContext';
import WeekNavigator from './training/WeekNavigator';
import DayCard from './training/DayCard';
import QuickTemplates from './training/QuickTemplates';
import WeeklyReflections from './training/WeeklyReflections';
import MonthlyStats from './training/MonthlyStats';
import ReflectionHistory from './training/ReflectionHistory';
import type { WeeklyPlans, WeekPlan, DayPlan, TrainingActivity } from '../../../types/training';

interface TrainingTabProps {
  currentWeek: string;
  setCurrentWeek: (value: string) => void;
  weeklyPlans: WeeklyPlans;
  setWeeklyPlans: (value: WeeklyPlans | ((prev: WeeklyPlans) => WeeklyPlans)) => void;
  dailyNotes: Record<string, string>;
  updateDailyNote: (date: string, note: string) => void;
  editingDay: string | null;
  setEditingDay: (value: string | null) => void;
  weeklyHours: number;
  setWeeklyHours: (value: number) => void;
  getCurrentWeekPlan: () => WeekPlan;
  updateDayPlan: (date: string, plan: DayPlan) => void;
  exportToGoogleCalendar: (date: string, dayPlan: DayPlan, note: string) => void;
}

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
}: TrainingTabProps) => {
  const modal = useModal();
  const [completedActivities, setCompletedActivities] = useState<Record<string, boolean>>({});

  const weekStats = getWeekStats(weeklyPlans, currentWeek);
  const weekDates = getWeekDates(currentWeek);

  // Calculate completion percentage
  const totalActivities = Object.values(getCurrentWeekPlan()).flat().length;
  const completedCount = Object.values(completedActivities).filter(Boolean).length;
  const completionPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const toggleActivityCompletion = (activityKey: string) => {
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
    const newPlan: WeekPlan = {};
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
    const newPlan: WeekPlan = {};
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
    const newPlan: WeekPlan = {};
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
              onRemoveActivity={(idx: number) => {
                const newPlan = dayPlan.filter((_, i) => i !== idx);
                updateDayPlan(date, newPlan);
              }}
              onSetEditingDay={setEditingDay}
              onAddActivity={(activity: { id: string; defaultMinutes: number }) => {
                const newActivity: TrainingActivity = {
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

export default TrainingTab;
