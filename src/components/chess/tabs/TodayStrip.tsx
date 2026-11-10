import { useMemo } from 'react';
import { useHomework } from '../../../hooks/useHomework';
import { programForDate, quotaTotal, plannedMinutes } from '../../../constants/trainingProgram';
import { localDateKey } from '../../../utils/localDate';
import { Card, CardHeader, Badge, Button } from '../../ui';

/**
 * The one actionable sheet on the Overview: today's blocks, how much work they
 * ask for, and how many coach assignments are past due.
 *
 * Deliberately does NOT load the drill queue. The day's exercise count comes
 * from the static program config, and the real due totals live in the
 * Training tab where those rows are needed anyway — pulling them here cost
 * ~550KB on the landing page to render two numbers.
 *
 * The overdue count is marked in carbon pink when non-zero because an
 * uncomfortable number is the whole mechanism: a homework counter that
 * blends in gets ignored, which is how the assignments went missing.
 */
const TodayStrip = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const homework = useHomework();
  const program = useMemo(() => programForDate(localDateKey()), []);
  const planned = quotaTotal(program.quota);
  const overdue = homework.overdue.length;

  return (
    <Card>
      <CardHeader
        title="Hoy"
        actions={<Badge tone="today">{program.dayName} · {plannedMinutes(program)} min</Badge>}
      />
      <p className="mt-1 font-serif text-[15px] leading-[22px] text-fg-muted">{program.focus}</p>

      {program.blocks.length > 0 && (
        <ul className="mt-3 divide-y divide-hairline">
          {program.blocks.map((b, i) => (
            <li key={i} className="py-3">
              <span className="block font-medium text-fg">{b.label}</span>
              <span className="block text-[13px] leading-5 text-fg-subtle">
                <span className="font-mono tabular-nums">{b.minutes} min</span>
                {b.detail ? ` · ${b.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 text-sm">
        <span className="text-fg-muted">
          {planned > 0 ? (
            <>
              <span className="font-mono tabular-nums text-fg">{planned}</span> ejercicios en la cola
            </>
          ) : (
            'Sin cola de ejercicios'
          )}
        </span>
        {overdue > 0 ? (
          <Badge tone="alert">
            <span className="font-mono tabular-nums">{overdue}</span> tarea{overdue === 1 ? '' : 's'} vencida{overdue === 1 ? '' : 's'}
          </Badge>
        ) : (
          <span className="text-fg-subtle">0 tareas vencidas</span>
        )}
      </div>

      <Button className="mt-4 w-full" onClick={() => onNavigate('training')}>
        Ir al plan de hoy
      </Button>
    </Card>
  );
};

export default TodayStrip;
