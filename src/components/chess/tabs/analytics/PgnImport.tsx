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
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 hover:shadow-xl">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600"></div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">PGN Import</h3>
              <p className="text-sm text-slate-600">Import games from PGN notation</p>
            </div>
          </div>
          <button
            onClick={() => setShowPgnImport(!showPgnImport)}
            className="px-4 py-2 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
          >
            {showPgnImport ? '✕ Close Import' : '📥 Import Games'}
          </button>
        </div>

        {showPgnImport && (
          <div className="space-y-4 animate-slideUp">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Paste PGN text below:
              </label>
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder={`[Event "Tournament Name"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n[WhiteElo "1800"]\n[BlackElo "1750"]\n[ECO "B23"]\n\n1. e4 c5 2. Nc3 ...`}
                className="w-full h-64 px-4 py-3 font-mono text-sm border-2 border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePgnImport}
                className="px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30"
              >
                ✓ Parse PGN
              </button>
              <button
                onClick={() => {
                  setPgnText('');
                  setShowPgnImport(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 transition-all bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <LightBulbIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
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
