interface WeeklyReflectionsProps {
  currentWeek: string;
  dailyNotes: Record<string, string>;
  onUpdateNote: (key: string, value: string) => void;
}

const WeeklyReflections = ({ currentWeek, dailyNotes, onUpdateNote }: WeeklyReflectionsProps) => {
  return (
    <div className="bg-surface rounded-lg border border-hairline p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-surface-2 rounded-lg">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-fg">Weekly Reflections</h3>
          <p className="text-sm text-fg-muted">Track your progress and learnings</p>
        </div>
      </div>
      <textarea
        value={dailyNotes[`${currentWeek}-summary`] || ''}
        onChange={(e) => onUpdateNote(`${currentWeek}-summary`, e.target.value)}
        placeholder="How did this week go? What worked well? What needs improvement for next week? Any key insights from your games or studies?"
        className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-fg-subtle transition-all"
        rows={6}
      />
    </div>
  );
};

export default WeeklyReflections;
