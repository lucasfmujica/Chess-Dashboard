import Button from '../../../ui/Button';
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
  round?: string;
  clock20?: string;
  clock30?: string;
  clock40?: string;
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

const INPUT =
  'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';

const ManualGameEntry = ({
  showManualEntry,
  setShowManualEntry,
  gameForm,
  uniqueTournaments,
  handleInputChange,
  handleAddGame,
  resetForm,
}: ManualGameEntryProps) => {
  const field = (
    label: string,
    name: keyof GameForm,
    placeholder: string,
    type: 'text' | 'number' = 'text'
  ) => (
    <div>
      <label htmlFor={`mge-${name}`} className="mb-1.5 block text-label">
        {label}
      </label>
      <input
        id={`mge-${name}`}
        type={type}
        name={name}
        list={name === 'tournament' ? 'tournament-suggestions' : undefined}
        value={(gameForm[name] as string | number | undefined) ?? ''}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`${INPUT} ${type === 'number' || name.startsWith('clock') || name === 'round' ? 'font-mono tabular-nums' : ''}`}
      />
    </div>
  );

  return (
    <div className="rounded border border-hairline bg-surface">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-semibold text-fg">Cargar una partida a mano</h3>
            <p className="mt-0.5 text-sm text-fg-muted">Una partida de torneo por vez</p>
          </div>
          <Button
            variant={showManualEntry ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            {showManualEntry ? 'Cerrar formulario' : 'Cargar partida'}
          </Button>
        </div>

        {showManualEntry && (
          <div className="mt-5 space-y-4 animate-slideUp">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {field('Torneo *', 'tournament', 'Ej.: Abierto Lago Puelo 2025')}
              <datalist id="tournament-suggestions">
                {uniqueTournaments.map((t, idx) => (
                  <option key={idx} value={t} />
                ))}
              </datalist>
              {field('Tu ELO *', 'elo', 'Ej.: 1650', 'number')}
              {field('Rival *', 'opp', 'Apellido, Nombre')}
              {field('ELO del rival *', 'opp_elo', 'Ej.: 1700', 'number')}

              <div>
                <label htmlFor="mge-color" className="mb-1.5 block text-label">
                  Tu color
                </label>
                <select id="mge-color" name="color" value={gameForm.color} onChange={handleInputChange} className={INPUT}>
                  <option value="W">Blancas</option>
                  <option value="B">Negras</option>
                </select>
              </div>

              <div>
                <label htmlFor="mge-result" className="mb-1.5 block text-label">
                  Resultado
                </label>
                <select id="mge-result" name="result" value={gameForm.result} onChange={handleInputChange} className={INPUT}>
                  <option value="W">1 · Victoria</option>
                  <option value="D">½ · Tablas</option>
                  <option value="L">0 · Derrota</option>
                </select>
              </div>

              {field('ECO (opcional)', 'eco', 'Ej.: B23')}
              {field('Ronda (opcional)', 'round', 'Ej.: 3')}
              {field('Reloj en la 20 (opcional)', 'clock20', '1:12:05')}
              {field('Reloj en la 30 (opcional)', 'clock30', '0:48:30')}
              {field('Reloj en la 40 (opcional)', 'clock40', '0:20:10')}

              <div className="flex items-center md:pt-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="rated"
                    checked={gameForm.rated}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded-sm border border-hairline accent-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                  <span className="text-sm font-medium text-fg">Válida para ELO</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="primary" onClick={handleAddGame}>
                Guardar partida
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            </div>

            <p className="border-t border-hairline pt-3 text-xs text-fg-muted">
              El torneo y tu ELO quedan cargados para la partida siguiente del mismo evento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualGameEntry;
