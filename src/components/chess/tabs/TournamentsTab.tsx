import { useState } from 'react';
import { useModal } from '../../modals/ModalContext';
import { useTournamentForm } from '../../../hooks/useTournamentForm';
import { useTournamentStats } from '../../../hooks/useTournamentStats';
import UpcomingTournamentsSection from './tournaments/UpcomingTournamentsSection';
import TournamentPrepPanel from './tournaments/TournamentPrepPanel';
import TournamentHeroSection from './tournaments/TournamentHeroSection';
import TournamentSummaryCards from './tournaments/TournamentSummaryCards';
import TournamentTable from './tournaments/TournamentTable';
import PerformanceChart from './tournaments/PerformanceChart';
import TournamentImportPanel from './tournaments/TournamentImportPanel';
import { useGames } from '../../../context/GamesContext';
import { SegmentedControl, type Segment } from '../../ui';
import type { Game, TournamentStat } from '../../../types/chess';

/**
 * Two views over the same table. "Próximos" is what you act on; "Historial"
 * is what already happened. They used to be one very long scroll with the
 * thing you can still change about the future stranded on top of it.
 */
type TournamentsView = 'proximos' | 'historial';

const VIEWS: Segment<TournamentsView>[] = [
  { value: 'proximos', label: 'Próximos y prep' },
  { value: 'historial', label: 'Historial' },
];

interface TournamentsTabProps {
  tournamentStats: TournamentStat[];
  ratedGames: Game[];
}

const TournamentsTab = ({ tournamentStats, ratedGames }: TournamentsTabProps) => {
  const modal = useModal();
  const stats = useTournamentStats(tournamentStats);
  const [view, setView] = useState<TournamentsView>('proximos');
  // Tournaments come from the database now, so this tab reads the context
  // rather than being handed a localStorage array by the dashboard.
  const { upcomingTournaments, addTournament, updateTournament, removeTournament } = useGames();

  const {
    isAddingTournament,
    setIsAddingTournament,
    editingTournamentId,
    tournamentForm,
    saving,
    handleInputChange,
    handleAddTournament,
    handleUpdateTournament,
    handleDeleteTournament,
    handleEditTournament,
    resetForm
  } = useTournamentForm(addTournament, updateTournament, removeTournament, modal);

  return (
    <div className="space-y-8">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        aria-label="Vista de torneos"
      />

      {view === 'proximos' ? (
        <>
          <UpcomingTournamentsSection
            upcomingTournaments={upcomingTournaments}
            isAddingTournament={isAddingTournament}
            setIsAddingTournament={setIsAddingTournament}
            editingTournamentId={editingTournamentId}
            tournamentForm={tournamentForm}
            saving={saving}
            handleInputChange={handleInputChange}
            handleAddTournament={handleAddTournament}
            handleUpdateTournament={handleUpdateTournament}
            handleEditTournament={handleEditTournament}
            handleDeleteTournament={handleDeleteTournament}
            resetForm={resetForm}
          />

          <TournamentPrepPanel />
        </>
      ) : (
        <>
          {/* Paste a crosstable for an event that has no PGN (team events) */}
          <TournamentImportPanel />

          <TournamentHeroSection stats={stats} />
          <TournamentSummaryCards stats={stats} />
          <TournamentTable tournamentStats={tournamentStats} ratedGames={ratedGames} />
          <PerformanceChart tournamentStats={tournamentStats} />
        </>
      )}
    </div>
  );
};

export default TournamentsTab;
