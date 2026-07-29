import { useMemo } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useHomework } from '../../../hooks/useHomework';
import { programForWeekday, quotaTotal, plannedMinutes } from '../../../constants/trainingProgram';
import { localDateKey, weekdayIndex } from '../../../utils/localDate';
import { Card } from '../../ui';

/**
 * The one actionable row on the Overview: today's block, how much work it
 * asks for, and how many coach assignments are past due.
 *
 * Deliberately does NOT load the drill queue. The day's exercise count comes
 * from the static program config, and the real due totals live in the
 * Training tab where those rows are needed anyway — pulling them here cost
 * ~550KB on the landing page to render two numbers.
 *
 * The overdue count is rendered in the loss colour when non-zero because an
 * uncomfortable number is the whole mechanism: a homework counter that
 * blends in gets ignored, which is how the assignments went missing.
 */
const TodayStrip = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const homework = useHomework();
  const program = useMemo(() => programForWeekday(weekdayIndex(localDateKey())), []);
  const planned = quotaTotal(program.quota);

  return (
    <Card interactive onClick={() => onNavigate('training')} className="cursor-pointer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-label">Hoy · {program.dayName}</p>
          <h3 className="text-h3 text-fg mt-1">{program.focus}</h3>
          <p className="text-sm text-fg-muted mt-1">
            {plannedMinutes(program)} min
            {planned > 0 ? ` · ${planned} ejercicios en la cola` : ' · sin cola de ejercicios'}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div
              className={`text-h2 nums ${
                homework.overdue.length > 0 ? 'text-loss' : 'text-fg-subtle'
              }`}
            >
              {homework.overdue.length}
            </div>
            <div className="text-xs text-fg-muted">
              tarea{homework.overdue.length === 1 ? '' : 's'} vencida
              {homework.overdue.length === 1 ? '' : 's'}
            </div>
          </div>
          <ArrowRightIcon className="w-5 h-5 text-fg-subtle shrink-0" />
        </div>
      </div>
    </Card>
  );
};

export default TodayStrip;
