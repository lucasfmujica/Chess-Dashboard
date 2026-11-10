import Button from '../../../ui/Button';

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
    <div className="rounded border border-hairline bg-surface">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-semibold text-fg">Importar PGN</h3>
            <p className="mt-0.5 text-sm text-fg-muted">Una o varias partidas en notación PGN</p>
          </div>
          <Button
            variant={showPgnImport ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowPgnImport(!showPgnImport)}
          >
            {showPgnImport ? 'Cerrar importación' : 'Importar partidas'}
          </Button>
        </div>

        {showPgnImport && (
          <div className="mt-5 space-y-4 animate-slideUp">
            <div>
              <label htmlFor="pgn-import-text" className="mb-1.5 block text-label">
                Pegá el PGN acá:
              </label>
              <textarea
                id="pgn-import-text"
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder={`[Event "Torneo"]\n[White "Jugador 1"]\n[Black "Jugador 2"]\n[Result "1-0"]\n[WhiteElo "1800"]\n[BlackElo "1750"]\n[ECO "B23"]\n\n1. e4 c5 2. Nc3 ...`}
                className="h-64 w-full resize-none rounded border border-hairline bg-surface px-3 py-2.5 font-mono text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={handlePgnImport}>
                Leer PGN
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPgnText('');
                  setShowPgnImport(false);
                }}
              >
                Cancelar
              </Button>
            </div>
            <p className="border-t border-hairline pt-3 text-xs text-fg-muted">
              Pegá el PGN y después indicá tu nombre tal como aparece en las partidas y tu ELO. Las partidas se suman a tu base.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PgnImport;
