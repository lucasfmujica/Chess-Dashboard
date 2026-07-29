import { useState } from 'react';
import { SegmentedControl, type Segment } from '../../ui';
import TodayQueue from './training/TodayQueue';
import WeekProgram from './training/WeekProgram';
import TrainingLog from './training/TrainingLog';
import HomeworkPanel from './training/HomeworkPanel';

/**
 * Sub-views. "Hoy" is the default because the point of the rebuild is that
 * opening this tab answers "what do I do now" without any choosing.
 *
 * There used to be a fifth view, "Planificador" — a free-form weekly grid in
 * localStorage. It has been folded into Semana. The two were separate systems
 * with separate storage, separate week state and separate vocabularies for
 * what a training block is, which is why work planned in one never appeared
 * in the other. Its notes and reflections moved across under the same keys.
 */
type TrainingView = 'today' | 'week' | 'tareas' | 'log';

const VIEWS: Segment<TrainingView>[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'tareas', label: 'Tareas' },
  { value: 'log', label: 'Registro' },
];

interface TrainingTabProps {
  dailyNotes: Record<string, string>;
  updateDailyNote: (key: string, note: string) => void;
}

const TrainingTab = ({ dailyNotes, updateDailyNote }: TrainingTabProps) => {
  const [view, setView] = useState<TrainingView>('today');

  return (
    <div className="space-y-8 animate-fadeIn">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        aria-label="Vista de entrenamiento"
      />

      {view === 'today' && <TodayQueue />}
      {view === 'week' && <WeekProgram dailyNotes={dailyNotes} updateDailyNote={updateDailyNote} />}
      {view === 'tareas' && <HomeworkPanel />}
      {view === 'log' && <TrainingLog />}
    </div>
  );
};

export default TrainingTab;
