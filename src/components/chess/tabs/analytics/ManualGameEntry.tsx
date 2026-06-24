import { LightBulbIcon } from '@heroicons/react/24/outline';
import type { PlayerColor, GameResult } from '../../../../types/chess';

/** Local form state shape for manual game entry (numeric fields kept as string|number while editing). */
interface GameForm {
  tournament: string;
  elo: string | number;
  opp: string;
  opp_elo: string | number;
  color: PlayerColor | string;
  result: GameResult | string;
  eco?: string;
  rated: boolean;
}

interface ManualGameEntryProps {
  showManualEntry: boolean;
  setShowManualEntry: React.Dispatch<React.SetStateAction<boolean>>;
  gameForm: GameForm;
  uniqueTournaments: string[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleAddGame: () => void;
  resetForm: () => void;
}

const ManualGameEntry = ({
  showManualEntry,
  setShowManualEntry,
  gameForm,
  uniqueTournaments,
  handleInputChange,
  handleAddGame,
  resetForm,
}: ManualGameEntryProps) => {
  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-2 rounded-lg">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg">Add Game Manually</h3>
              <p className="text-sm text-fg-muted">Record individual tournament games</p>
            </div>
          </div>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="px-4 py-2 text-sm font-medium text-app bg-fg rounded-lg hover:opacity-90 transition-opacity"
          >
            {showManualEntry ? '✕ Close Form' : '➕ Add Game'}
          </button>
        </div>

        {showManualEntry && (
          <div className="space-y-4 animate-slideUp">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tournament Name */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="tournament"
                  list="tournament-suggestions"
                  value={gameForm.tournament}
                  onChange={handleInputChange}
                  placeholder="e.g., Lago Puelo Open 2025"
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
                <datalist id="tournament-suggestions">
                  {uniqueTournaments.map((t, idx) => (
                    <option key={idx} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Your ELO */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Your ELO *
                </label>
                <input
                  type="number"
                  name="elo"
                  value={gameForm.elo}
                  onChange={handleInputChange}
                  placeholder="e.g., 1650"
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              {/* Opponent Name */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Opponent Name *
                </label>
                <input
                  type="text"
                  name="opp"
                  value={gameForm.opp}
                  onChange={handleInputChange}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              {/* Opponent ELO */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Opponent ELO *
                </label>
                <input
                  type="number"
                  name="opp_elo"
                  value={gameForm.opp_elo}
                  onChange={handleInputChange}
                  placeholder="e.g., 1700"
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Your Color
                </label>
                <select
                  name="color"
                  value={gameForm.color}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                >
                  <option value="W">⚪ White</option>
                  <option value="B">⚫ Black</option>
                </select>
              </div>

              {/* Result */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  Result
                </label>
                <select
                  name="result"
                  value={gameForm.result}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                >
                  <option value="W">✅ Win</option>
                  <option value="D">➖ Draw</option>
                  <option value="L">❌ Loss</option>
                </select>
              </div>

              {/* ECO Code */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-fg">
                  ECO Code (Optional)
                </label>
                <input
                  type="text"
                  name="eco"
                  value={gameForm.eco}
                  onChange={handleInputChange}
                  placeholder="e.g., B23"
                  className="w-full px-4 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              {/* Rated */}
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rated"
                    checked={gameForm.rated}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-accent border border-hairline rounded focus:ring-1 focus:ring-accent"
                  />
                  <span className="text-sm font-semibold text-fg">Rated Game</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddGame}
                className="px-6 py-2.5 text-sm font-medium text-app bg-fg rounded-lg hover:opacity-90 transition-opacity"
              >
                ✓ Add Game
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 text-sm font-medium text-fg transition-colors border border-hairline bg-surface rounded-lg hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 bg-surface-2 border border-hairline rounded-lg">
              <LightBulbIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-fg-muted">
                <strong>Tip:</strong> Tournament and ELO are preserved when adding multiple games from the same event. Games are saved automatically to your browser&apos;s localStorage.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualGameEntry;
