interface QuickTemplatesProps {
  weeklyHours: number;
  setWeeklyHours: (value: number) => void;
  onApplyGMNoahMethod: () => void;
  onApplyBalancedDaily: () => void;
  onApplyBlockFocus: () => void;
  onClearWeek: () => void;
}

const QuickTemplates = ({
  weeklyHours,
  setWeeklyHours,
  onApplyGMNoahMethod,
  onApplyBalancedDaily,
  onApplyBlockFocus,
  onClearWeek,
}: QuickTemplatesProps) => {
  return (
    <div className="bg-surface rounded-lg border border-hairline p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-surface-2 rounded-lg">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg">Quick Templates</h3>
          <p className="text-sm text-fg-muted">Apply proven training methods instantly</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 text-sm font-bold text-fg">
          Weekly Study Hours
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="20"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="flex-1 h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <div className="px-4 py-2 bg-surface-2 rounded-lg border border-hairline">
            <span className="text-2xl font-bold text-fg">{weeklyHours}</span>
            <span className="text-sm text-fg-muted ml-1">hrs</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-fg-subtle">≈ {Math.round(weeklyHours * 60 / 6)} minutes per day (6 training days)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onApplyGMNoahMethod}
          className="group p-6 bg-surface-2 rounded-lg border border-hairline hover:border-accent transition-colors"
        >
          <div className="text-4xl mb-3">⚡</div>
          <p className="font-bold text-fg text-lg mb-2">GM Noah&apos;s Method</p>
          <p className="text-sm text-fg-muted">Rotating focus: Tactics → Games → Endgames</p>
        </button>

        <button
          onClick={onApplyBalancedDaily}
          className="group p-6 bg-surface-2 rounded-lg border border-hairline hover:border-accent transition-colors"
        >
          <div className="text-4xl mb-3">🎯</div>
          <p className="font-bold text-fg text-lg mb-2">Balanced Daily</p>
          <p className="text-sm text-fg-muted">All elements every day for consistency</p>
        </button>

        <button
          onClick={onApplyBlockFocus}
          className="group p-6 bg-surface-2 rounded-lg border border-hairline hover:border-accent transition-colors"
        >
          <div className="text-4xl mb-3">📚</div>
          <p className="font-bold text-fg text-lg mb-2">Block Focus</p>
          <p className="text-sm text-fg-muted">Multi-day deep dives on each topic</p>
        </button>
      </div>

      <div className="flex justify-between items-center mt-6 pt-6 border-t border-hairline">
        <p className="text-sm text-fg-muted">
          <span className="font-semibold">Pro Tip:</span> Following the 1/3 rule - Tactics, Play+Analyze, Endgames/Openings
        </p>
        <button
          onClick={onClearWeek}
          className="px-4 py-2 text-sm font-semibold text-loss border border-hairline bg-surface rounded-lg hover:bg-surface-2 transition-colors"
        >
          Clear Week
        </button>
      </div>
    </div>
  );
};

export default QuickTemplates;
