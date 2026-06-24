import { useModal } from '../../modals/ModalContext';
import { useTournamentForm } from '../../../hooks/useTournamentForm';
import { useTournamentStats } from '../../../hooks/useTournamentStats';
import UpcomingTournamentsSection from './tournaments/UpcomingTournamentsSection';
import TournamentHeroSection from './tournaments/TournamentHeroSection';
import TournamentSummaryCards from './tournaments/TournamentSummaryCards';
import TournamentTable from './tournaments/TournamentTable';
import PerformanceChart from './tournaments/PerformanceChart';
import type { TournamentStat, UpcomingTournament } from '../../../types/chess';

interface TournamentsTabProps {
  tournamentStats: TournamentStat[];
  upcomingTournaments: UpcomingTournament[];
  setUpcomingTournaments: (
    value: UpcomingTournament[] | ((prev: UpcomingTournament[]) => UpcomingTournament[])
  ) => void;
}

const TournamentsTab = ({ tournamentStats, upcomingTournaments, setUpcomingTournaments }: TournamentsTabProps) => {
  const modal = useModal();
  const stats = useTournamentStats(tournamentStats);

  const {
    isAddingTournament,
    setIsAddingTournament,
    editingTournamentId,
    tournamentForm,
    handleInputChange,
    handleAddTournament,
    handleUpdateTournament,
    handleDeleteTournament,
    handleEditTournament,
    resetForm
  } = useTournamentForm(setUpcomingTournaments, modal);

  return (
    <div className="space-y-8">
      {/* Upcoming Tournaments Section */}
      <UpcomingTournamentsSection
        upcomingTournaments={upcomingTournaments}
        isAddingTournament={isAddingTournament}
        setIsAddingTournament={setIsAddingTournament}
        editingTournamentId={editingTournamentId}
        tournamentForm={tournamentForm}
        handleInputChange={handleInputChange}
        handleAddTournament={handleAddTournament}
        handleUpdateTournament={handleUpdateTournament}
        handleEditTournament={handleEditTournament}
        handleDeleteTournament={handleDeleteTournament}
        resetForm={resetForm}
      />

      {/* Hero Section */}
      <TournamentHeroSection stats={stats} />

      {/* Summary Cards */}
      <TournamentSummaryCards stats={stats} />

      {/* Tournament Table */}
      <TournamentTable tournamentStats={tournamentStats} />

      {/* Performance Chart */}
      <PerformanceChart tournamentStats={tournamentStats} />
    </div>
  );
};

export default TournamentsTab;
