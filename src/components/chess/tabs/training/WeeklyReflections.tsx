interface WeeklyReflectionsProps {
  currentWeek: string;
  dailyNotes: Record<string, string>;
  onUpdateNote: (key: string, value: string) => void;
}

const WeeklyReflections = ({ currentWeek, dailyNotes, onUpdateNote }: WeeklyReflectionsProps) => {
  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Weekly Reflections</h3>
          <p className="text-sm text-slate-600">Track your progress and learnings</p>
        </div>
      </div>
      <textarea
        value={dailyNotes[`${currentWeek}-summary`] || ''}
        onChange={(e) => onUpdateNote(`${currentWeek}-summary`, e.target.value)}
        placeholder="How did this week go? What worked well? What needs improvement for next week? Any key insights from your games or studies?"
        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500 transition-all"
        rows={6}
      />
    </div>
  );
};

export default WeeklyReflections;
