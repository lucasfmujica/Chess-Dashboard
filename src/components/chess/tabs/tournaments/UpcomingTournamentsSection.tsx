import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardHeader } from '../../../ui';
import { dateFromKey } from '../../../../utils/localDate';
import type { Tournament } from '../../../../types/chess';
import type { TournamentFormState } from '../../../../hooks/useTournamentForm';

interface UpcomingTournamentsSectionProps {
  upcomingTournaments: Tournament[];
  isAddingTournament: boolean;
  setIsAddingTournament: React.Dispatch<React.SetStateAction<boolean>>;
  editingTournamentId?: string | null;
  tournamentForm: TournamentFormState;
  saving?: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddTournament: () => void;
  handleUpdateTournament: () => void;
  handleEditTournament: (tournament: Tournament) => void;
  handleDeleteTournament: (id: string) => void;
  resetForm: () => void;
}

/**
 * `new Date('2026-08-20')` parses as UTC midnight, which is the 19th in any
 * negative-offset timezone — so every date here rendered a day early. Dates
 * arrive as 'YYYY-MM-DD' keys, so they must go through dateFromKey.
 */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  return dateFromKey(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const MONTH = (dateStr: string) =>
  dateFromKey(dateStr).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
const DAY = (dateStr: string) => dateFromKey(dateStr).getDate();

const FIELD = 'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const UpcomingTournamentsSection = ({
  upcomingTournaments,
  isAddingTournament,
  setIsAddingTournament,
  editingTournamentId,
  tournamentForm,
  saving = false,
  handleInputChange,
  handleAddTournament,
  handleUpdateTournament,
  handleEditTournament,
  handleDeleteTournament,
  resetForm
}: UpcomingTournamentsSectionProps) => {
  return (
    <Card>
      <CardHeader
        title="Próximos"
        subtitle="los torneos que tenés anotados"
        actions={
          <Button variant="primary" size="sm" icon={PlusIcon} onClick={() => setIsAddingTournament(true)}>
            Agregar torneo
          </Button>
        }
        className="mb-4"
      />

      {isAddingTournament && (
        <div className="mb-6 rounded border border-hairline bg-surface-2 p-4 sm:p-5">
          <h3 className="mb-4 font-serif text-lg font-semibold text-fg">
            {editingTournamentId ? 'Editar torneo' : 'Nuevo torneo'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="upcoming-name" className="text-label mb-1.5 block">Nombre del torneo *</label>
              <input
                id="upcoming-name"
                type="text"
                name="name"
                value={tournamentForm.name}
                onChange={handleInputChange}
                className={FIELD}
                placeholder="por ejemplo, Abierto de Mar del Plata"
              />
            </div>
            <div>
              <label htmlFor="upcoming-club" className="text-label mb-1.5 block">Club</label>
              <input
                id="upcoming-club"
                type="text"
                name="club"
                value={tournamentForm.club}
                onChange={handleInputChange}
                className={FIELD}
                placeholder="por ejemplo, Club Argentino de Ajedrez"
              />
            </div>
            <div>
              <label htmlFor="upcoming-province" className="text-label mb-1.5 block">Provincia</label>
              <input
                id="upcoming-province"
                type="text"
                name="province"
                value={tournamentForm.province}
                onChange={handleInputChange}
                className={FIELD}
                placeholder="por ejemplo, Buenos Aires"
              />
            </div>
            <div>
              <label htmlFor="upcoming-timeControl" className="text-label mb-1.5 block">Ritmo de juego</label>
              <input
                id="upcoming-timeControl"
                type="text"
                name="timeControl"
                value={tournamentForm.timeControl}
                onChange={handleInputChange}
                className={FIELD}
                placeholder="por ejemplo, 90+30 o 12+3"
              />
            </div>
            <div>
              <label htmlFor="upcoming-chessResultsUrl" className="text-label mb-1.5 block">Link de Chess-Results</label>
              <input
                id="upcoming-chessResultsUrl"
                type="url"
                name="chessResultsUrl"
                value={tournamentForm.chessResultsUrl}
                onChange={handleInputChange}
                className={FIELD}
                placeholder="https://chess-results.com/…"
              />
            </div>
            <div>
              <label htmlFor="upcoming-startDate" className="text-label mb-1.5 block">Empieza *</label>
              <input
                id="upcoming-startDate"
                type="date"
                name="startDate"
                value={tournamentForm.startDate}
                onChange={handleInputChange}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="upcoming-endDate" className="text-label mb-1.5 block">Termina</label>
              <input
                id="upcoming-endDate"
                type="date"
                name="endDate"
                value={tournamentForm.endDate}
                onChange={handleInputChange}
                className={FIELD}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={editingTournamentId ? handleUpdateTournament : handleAddTournament}
              disabled={saving}
            >
              {saving ? 'Guardando…' : editingTournamentId ? 'Guardar cambios' : 'Agregar torneo'}
            </Button>
            <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {upcomingTournaments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-serif text-base text-fg-muted">No tenés torneos anotados.</p>
          <p className="mt-1 text-sm text-fg-subtle">Con “Agregar torneo” anotás el próximo.</p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {upcomingTournaments.map(tournament => {
            const meta = [tournament.club, tournament.province, tournament.timeControl].filter(Boolean).join(' · ');
            return (
              <li key={tournament.id} className="flex items-start gap-4 py-4">
                {tournament.startDate && (
                  <span className="flex w-12 shrink-0 flex-col items-center border-r border-hairline pr-4 text-center">
                    <span className="text-label">{MONTH(tournament.startDate)}</span>
                    <span className="font-mono text-[22px] font-medium leading-tight tabular-nums text-fg">{DAY(tournament.startDate)}</span>
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-base font-semibold leading-snug text-fg">{tournament.name}</h4>
                  {meta && <p className="text-[13px] text-fg-subtle">{meta}</p>}
                  <p className="font-mono text-xs tabular-nums text-fg-muted">
                    {formatDate(tournament.startDate)}
                    {tournament.endDate && tournament.endDate !== tournament.startDate && ` – ${formatDate(tournament.endDate)}`}
                  </p>
                  {tournament.chessResultsUrl && (
                    <a
                      href={tournament.chessResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-accent hover:underline"
                    >
                      Ver en Chess-Results
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleEditTournament(tournament)}
                    className="rounded p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    title="Editar torneo"
                    aria-label={`Editar ${tournament.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTournament(tournament.id)}
                    className="rounded p-2 text-loss transition-colors hover:bg-carbon-pink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    title="Borrar torneo"
                    aria-label={`Borrar ${tournament.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default UpcomingTournamentsSection;
