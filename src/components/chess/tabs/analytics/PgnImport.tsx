import { LightBulbIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface PgnImportProps {
  showPgnImport: boolean;
  setShowPgnImport: React.Dispatch<React.SetStateAction<boolean>>;
  pgnText: string;
  setPgnText: React.Dispatch<React.SetStateAction<string>>;
  handlePgnImport: () => void;
}

const PgnImport = ({
  showPgnImport,
  setShowPgnImport,
  pgnText,
  setPgnText,
  handlePgnImport,
}: PgnImportProps) => {
  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-2 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg">PGN Import</h3>
              <p className="text-sm text-fg-muted">Import games from PGN notation</p>
            </div>
          </div>
          <button
            onClick={() => setShowPgnImport(!showPgnImport)}
            className="px-4 py-2 text-sm font-medium text-app bg-fg rounded-lg hover:opacity-90 transition-opacity"
          >
            {showPgnImport ? '✕ Close Import' : '📥 Import Games'}
          </button>
        </div>

        {showPgnImport && (
          <div className="space-y-4 animate-slideUp">
            <div>
              <label className="block mb-2 text-sm font-medium text-fg">
                Paste PGN text below:
              </label>
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder={`[Event "Tournament Name"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n[WhiteElo "1800"]\n[BlackElo "1750"]\n[ECO "B23"]\n\n1. e4 c5 2. Nc3 ...`}
                className="w-full h-64 px-4 py-3 font-mono text-sm bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePgnImport}
                className="px-5 py-2.5 text-sm font-medium text-app bg-fg rounded-lg hover:opacity-90 transition-opacity"
              >
                ✓ Parse PGN
              </button>
              <button
                onClick={() => {
                  setPgnText('');
                  setShowPgnImport(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-fg transition-colors border border-hairline bg-surface rounded-lg hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-surface-2 border border-hairline rounded-lg">
              <LightBulbIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-fg-muted">
                <strong>How to use:</strong> Paste your PGN text, then enter your name as it appears in the games and your ELO rating. Games will be automatically added to your database.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PgnImport;
