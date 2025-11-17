/**
 * Training plan template generators
 */

import { getWeekDates } from './chessHelpers';
import { ACTIVE_TRAINING_DAYS, MINUTES_PER_HOUR, REST_DAY_INDEX } from '../constants/chessConstants';

/**
 * Generate a rest day plan
 * @returns {Array} Rest day activity
 */
const generateRestDay = () => {
  return [{ id: 'rest', minutes: 0, details: '' }];
};

/**
 * Generate Noah's Method training plan
 * 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames (cycling approach)
 * @param {string} currentWeek - Week start date
 * @param {number} weeklyHours - Total hours per week
 * @returns {Object} Weekly plan object
 */
export const generateNoahsMethodPlan = (currentWeek, weeklyHours) => {
  const dates = getWeekDates(currentWeek);
  const totalMinutes = weeklyHours * MINUTES_PER_HOUR;
  const dailyMinutes = Math.round(totalMinutes / ACTIVE_TRAINING_DAYS);
  const newPlan = {};

  dates.forEach(({ date }, idx) => {
    if (idx === REST_DAY_INDEX) {
      newPlan[date] = generateRestDay();
    } else {
      // 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames (this week's focus)
      const cycle = idx % 3;
      if (cycle === 0) {
        newPlan[date] = [{
          id: 'tactics',
          minutes: dailyMinutes,
          details: 'Tactical puzzles and pattern recognition'
        }];
      } else if (cycle === 1) {
        const playTime = Math.round(dailyMinutes * 0.5);
        const analysisTime = dailyMinutes - playTime;
        newPlan[date] = [
          { id: 'games', minutes: playTime, details: 'Play rated games with focus, no distractions' },
          { id: 'analysis', minutes: analysisTime, details: 'Deep analysis of games played' }
        ];
      } else {
        newPlan[date] = [{
          id: 'endgame',
          minutes: dailyMinutes,
          details: 'Endgame study and practice'
        }];
      }
    }
  });

  return newPlan;
};

/**
 * Generate Balanced Daily training plan
 * All three elements (tactics, games, endgame) every day
 * @param {string} currentWeek - Week start date
 * @param {number} weeklyHours - Total hours per week
 * @returns {Object} Weekly plan object
 */
export const generateBalancedDailyPlan = (currentWeek, weeklyHours) => {
  const dates = getWeekDates(currentWeek);
  const totalMinutes = weeklyHours * MINUTES_PER_HOUR;
  const dailyMinutes = Math.round(totalMinutes / ACTIVE_TRAINING_DAYS);
  const tacticsTime = Math.round(dailyMinutes / 3);
  const gamesTime = Math.round(dailyMinutes / 2);
  const endgameTime = dailyMinutes - tacticsTime - gamesTime;
  const newPlan = {};

  dates.forEach(({ date }, idx) => {
    if (idx === REST_DAY_INDEX) {
      newPlan[date] = generateRestDay();
    } else {
      newPlan[date] = [
        { id: 'tactics', minutes: tacticsTime, details: '' },
        { id: 'games', minutes: gamesTime, details: '' },
        { id: 'endgame', minutes: endgameTime, details: '' }
      ];
    }
  });

  return newPlan;
};

/**
 * Generate Block Focus training plan
 * Multi-day blocks: 3 days Tactics → 2 days Play+Analyze → 1 day Endgames
 * @param {string} currentWeek - Week start date
 * @param {number} weeklyHours - Total hours per week
 * @returns {Object} Weekly plan object
 */
export const generateBlockFocusPlan = (currentWeek, weeklyHours) => {
  const dates = getWeekDates(currentWeek);
  const totalMinutes = weeklyHours * MINUTES_PER_HOUR;
  const tacticsDaily = Math.round(totalMinutes / 3 / 3); // 1/3 of total, spread over 3 days
  const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2); // 1/3 of total, spread over 2 days
  const endgameDaily = Math.round(totalMinutes / 3); // 1/3 of total on 1 day
  const newPlan = {};

  dates.forEach(({ date }, idx) => {
    if (idx === REST_DAY_INDEX) {
      newPlan[date] = generateRestDay();
    } else if (idx <= 2) {
      // First 3 days: Tactics focus
      newPlan[date] = [{
        id: 'tactics',
        minutes: tacticsDaily,
        details: 'Intensive tactical training'
      }];
    } else if (idx === 3 || idx === 4) {
      // Next 2 days: Play and analyze
      const playTime = Math.round(playAnalyzeDaily * 0.67);
      const analysisTime = playAnalyzeDaily - playTime;
      newPlan[date] = [
        { id: 'games', minutes: playTime, details: 'Multiple rated games' },
        { id: 'analysis', minutes: analysisTime, details: 'Deep game review' }
      ];
    } else {
      // Saturday: Endgames
      newPlan[date] = [{
        id: 'endgame',
        minutes: endgameDaily,
        details: 'Deep endgame study'
      }];
    }
  });

  return newPlan;
};

/**
 * Apply a training plan template
 * @param {string} currentWeek - Week start date
 * @param {number} weeklyHours - Total hours per week
 * @param {Function} setWeeklyPlans - State setter for weekly plans
 * @param {Function} templateGenerator - Template generator function
 */
export const applyTemplate = (currentWeek, weeklyHours, setWeeklyPlans, templateGenerator) => {
  const newPlan = templateGenerator(currentWeek, weeklyHours);
  setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
};
