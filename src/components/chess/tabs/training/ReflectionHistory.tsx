import { getWeekDates } from '../../../../utils/chessHelpers';

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
    <div className="bg-surface rounded-lg border border-hairline p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-surface-2 rounded-lg">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg">Reflection History</h3>
          <p className="text-sm text-fg-muted">Review your past weekly insights</p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {reflections.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-3">
              <svg className="w-12 h-12 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-fg-muted font-medium">No reflections yet</p>
            <p className="text-sm text-fg-subtle mt-1">Write your first weekly reflection above</p>
          </div>
        ) : (
          reflections.map(([weekKey, reflection]) => {
            const weekStartDate = weekKey.replace('-summary', '');
            const reflectionWeekDates = getWeekDates(weekStartDate);
            const weekLabel = `${reflectionWeekDates[0]?.displayDate} - ${reflectionWeekDates[6]?.displayDate}, ${new Date(weekStartDate).getFullYear()}`;

            return (
              <div key={weekKey} className="bg-surface-2 rounded-lg p-4 border border-hairline">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-surface rounded-lg border border-hairline">
                      <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-fg">Week of {weekLabel}</h4>
                  </div>
                  {weekKey.replace('-summary', '') === currentWeek && (
                    <span className="px-2 py-1 text-xs font-bold bg-accent text-accent-fg rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">
                  {reflection}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReflectionHistory;
