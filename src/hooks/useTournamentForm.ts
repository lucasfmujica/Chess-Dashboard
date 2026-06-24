import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { UpcomingTournament } from '../types/chess';
import type { ModalContextType } from '../components/modals/ModalContext';

type TournamentFormState = Omit<UpcomingTournament, 'id'>;

type SetUpcomingTournaments = (
  value: UpcomingTournament[] | ((prev: UpcomingTournament[]) => UpcomingTournament[])
) => void;

const EMPTY_FORM: TournamentFormState = {
  name: '',
  club: '',
  province: '',
  startDate: '',
  endDate: '',
  chessResultsLink: '',
};

export const useTournamentForm = (
  setUpcomingTournaments: SetUpcomingTournaments,
  modal: ModalContextType
) => {
  const [isAddingTournament, setIsAddingTournament] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);
  const [tournamentForm, setTournamentForm] = useState<TournamentFormState>({ ...EMPTY_FORM });

  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTournamentForm(prev => ({ ...prev, [name]: value }) as TournamentFormState);
  };

  // Add new tournament
  const handleAddTournament = async () => {
    if (!tournamentForm.name || !tournamentForm.startDate) {
      await modal.alert('Tournament name and start date are required');
      return;
    }

    const newTournament: UpcomingTournament = {
      id: Date.now(),
      ...tournamentForm,
    };

    setUpcomingTournaments(prev => [...prev, newTournament]);
    resetForm();
  };

  // Update existing tournament
  const handleUpdateTournament = async () => {
    if (!tournamentForm.name || !tournamentForm.startDate) {
      await modal.alert('Tournament name and start date are required');
      return;
    }

    setUpcomingTournaments(prev =>
      prev.map(t => (t.id === editingTournamentId ? { ...t, ...tournamentForm } : t))
    );
    resetForm();
  };

  // Delete tournament
  const handleDeleteTournament = async (id: number) => {
    const confirmed = await modal.confirm(
      'Are you sure you want to delete this tournament?',
      'Delete Tournament'
    );
    if (confirmed) {
      setUpcomingTournaments(prev => prev.filter(t => t.id !== id));
    }
  };

  // Start editing tournament
  const handleEditTournament = (tournament: UpcomingTournament) => {
    setTournamentForm({
      name: tournament.name,
      club: tournament.club,
      province: tournament.province,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      chessResultsLink: tournament.chessResultsLink,
    });
    setEditingTournamentId(tournament.id);
    setIsAddingTournament(true);
  };

  // Reset form
  const resetForm = () => {
    setTournamentForm({ ...EMPTY_FORM });
    setIsAddingTournament(false);
    setEditingTournamentId(null);
  };

  return {
    isAddingTournament,
    setIsAddingTournament,
    editingTournamentId,
    tournamentForm,
    handleInputChange,
    handleAddTournament,
    handleUpdateTournament,
    handleDeleteTournament,
    handleEditTournament,
    resetForm,
  };
};
