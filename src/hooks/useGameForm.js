import { useState, useMemo } from 'react';

/**
 * Custom hook for managing manual game entry form
 * @param {Array} games - Current games array
 * @param {Function} setGames - Function to update games
 * @param {Object} modal - Modal context for showing alerts
 * @returns {Object} Form state and handlers
 */
export const useGameForm = (games, setGames, modal) => {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [gameForm, setGameForm] = useState({
    tournament: '',
    elo: '',
    opp: '',
    opp_elo: '',
    color: 'W',
    result: 'W',
    eco: '',
    rated: true,
  });

  // Get unique tournament names for autocomplete
  const uniqueTournaments = useMemo(() => {
    const tournaments = [...new Set(games.map(g => g.tournament))];
    return tournaments.sort();
  }, [games]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGameForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddGame = async () => {
    // Validation
    if (!gameForm.tournament.trim()) {
      await modal.alert('Tournament name is required', 'Validation Error');
      return false;
    }
    if (!gameForm.elo || isNaN(parseInt(gameForm.elo))) {
      await modal.alert('Valid player ELO is required', 'Validation Error');
      return false;
    }
    if (!gameForm.opp.trim()) {
      await modal.alert('Opponent name is required', 'Validation Error');
      return false;
    }
    if (!gameForm.opp_elo || isNaN(parseInt(gameForm.opp_elo))) {
      await modal.alert('Valid opponent ELO is required', 'Validation Error');
      return false;
    }

    const newGame = {
      elo: parseInt(gameForm.elo),
      color: gameForm.color,
      result: gameForm.result,
      opp: gameForm.opp.trim(),
      opp_elo: parseInt(gameForm.opp_elo),
      eco: gameForm.eco.trim() || 'Unknown',
      tournament: gameForm.tournament.trim(),
      rated: gameForm.rated,
      source: 'otb',
      time: '00:00',
    };

    setGames(prev => [...prev, newGame]);

    // Reset form (keep tournament and elo for convenience)
    setGameForm({
      tournament: gameForm.tournament,
      elo: gameForm.elo,
      opp: '',
      opp_elo: '',
      color: 'W',
      result: 'W',
      eco: '',
      rated: true,
    });

    return true;
  };

  const resetForm = () => {
    setGameForm({
      tournament: '',
      elo: '',
      opp: '',
      opp_elo: '',
      color: 'W',
      result: 'W',
      eco: '',
      rated: true,
    });
    setShowManualEntry(false);
  };

  return {
    showManualEntry,
    setShowManualEntry,
    gameForm,
    uniqueTournaments,
    handleInputChange,
    handleAddGame,
    resetForm,
  };
};
