import { useState } from 'react';

export const useTournamentForm = (setUpcomingTournaments, modal) => {
  const [isAddingTournament, setIsAddingTournament] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState(null);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    club: '',
    province: '',
    startDate: '',
    endDate: '',
    chessResultsLink: ''
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTournamentForm(prev => ({ ...prev, [name]: value }));
  };

  // Add new tournament
  const handleAddTournament = async () => {
    if (!tournamentForm.name || !tournamentForm.startDate) {
      await modal.alert('Tournament name and start date are required');
      return;
    }

    const newTournament = {
      id: Date.now(),
      ...tournamentForm
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

    setUpcomingTournaments(prev => prev.map(t =>
      t.id === editingTournamentId ? { ...t, ...tournamentForm } : t
    ));
    resetForm();
  };

  // Delete tournament
  const handleDeleteTournament = async (id) => {
    const confirmed = await modal.confirm('Are you sure you want to delete this tournament?', 'Delete Tournament');
    if (confirmed) {
      setUpcomingTournaments(prev => prev.filter(t => t.id !== id));
    }
  };

  // Start editing tournament
  const handleEditTournament = (tournament) => {
    setTournamentForm({
      name: tournament.name,
      club: tournament.club,
      province: tournament.province,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      chessResultsLink: tournament.chessResultsLink
    });
    setEditingTournamentId(tournament.id);
    setIsAddingTournament(true);
  };

  // Reset form
  const resetForm = () => {
    setTournamentForm({
      name: '',
      club: '',
      province: '',
      startDate: '',
      endDate: '',
      chessResultsLink: ''
    });
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
    resetForm
  };
};
