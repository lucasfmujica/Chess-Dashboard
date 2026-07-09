import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { Game, PlayerColor, GameResult } from '../types/chess';
import type { ModalContextType } from '../components/modals/ModalContext';

interface GameFormState {
  tournament: string;
  elo: string;
  opp: string;
  opp_elo: string;
  color: PlayerColor;
  result: GameResult;
  eco: string;
  rated: boolean;
}

const EMPTY_FORM: GameFormState = {
  tournament: '',
  elo: '',
  opp: '',
  opp_elo: '',
  color: 'W',
  result: 'W',
  eco: '',
  rated: true,
};

/**
 * Custom hook for managing manual game entry form.
 */
export const useGameForm = (games: Game[], addManualGame: (game: Game) => Promise<void>, modal: ModalContextType) => {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [gameForm, setGameForm] = useState<GameFormState>({ ...EMPTY_FORM });

  // Get unique tournament names for autocomplete
  const uniqueTournaments = useMemo(() => {
    const tournaments = [...new Set(games.map(g => g.tournament))];
    return tournaments.sort();
  }, [games]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    setGameForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }) as GameFormState);
  };

  const handleAddGame = async (): Promise<boolean> => {
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

    const newGame: Game = {
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

    await addManualGame(newGame);

    // Reset form (keep tournament and elo for convenience)
    setGameForm({
      ...EMPTY_FORM,
      tournament: gameForm.tournament,
      elo: gameForm.elo,
    });

    return true;
  };

  const resetForm = () => {
    setGameForm({ ...EMPTY_FORM });
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
