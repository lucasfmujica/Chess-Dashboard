import { getWeekDates } from '../../../../utils/chessHelpers';
import { Badge, Card, CardHeader } from '../../../ui';

interface ReflectionHistoryProps {
  dailyNotes: Record<string, string>;
  currentWeek: string;
}

const ReflectionHistory = ({ dailyNotes, currentWeek }: ReflectionHistoryProps) => {
  const reflections = Object.entries(dailyNotes)
    .filter(([key, value]) => key.includes('-summary') && value.trim())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10);

  return (
    <Card>
      <CardHeader title="Reflexiones anteriores" subtitle="Lo que anotaste cada semana" className="mb-4" />

      <div className="max-h-96 overflow-y-auto">
        {reflections.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-serif text-base text-fg-muted">Todavía no hay reflexiones</p>
            <p className="mt-1 text-sm text-fg-subtle">Escribí la primera en el cuadro de arriba.</p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline border-t border-hairline">
            {reflections.map(([weekKey, reflection]) => {
              const weekStartDate = weekKey.replace('-summary', '');
              const reflectionWeekDates = getWeekDates(weekStartDate);
              const weekLabel = `${reflectionWeekDates[0]?.displayDate} - ${reflectionWeekDates[6]?.displayDate}, ${new Date(weekStartDate).getFullYear()}`;

              return (
                <li key={weekKey} className="py-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-label">Semana {weekLabel}</h4>
                    {weekStartDate === currentWeek && <Badge tone="today">Esta semana</Badge>}
                  </div>
                  <p className="whitespace-pre-wrap font-serif text-[15px] leading-6 text-fg">{reflection}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default ReflectionHistory;
