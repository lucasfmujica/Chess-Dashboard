import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Tournament } from '../types/chess';
import type { ModalContextType } from '../components/modals/ModalContext';

/**
 * Add/edit form for upcoming tournaments.
 *
 * These used to be localStorage-only with `Date.now()` ids. They now go
 * through the `tournaments` table, so `timeControl` and `chessResultsUrl` are
 * captured here: the prep generator needs the rate of play to size the plan,
 * and the start list is behind the chess-results link.
 */

export interface TournamentFormState {
  name: string;
  club: string;
  province: string;
  startDate: string;
  endDate: string;
  timeControl: string;
  chessResultsUrl: string;
}

const EMPTY_FORM: TournamentFormState = {
  name: '',
  club: '',
  province: '',
  startDate: '',
  endDate: '',
  timeControl: '',
  chessResultsUrl: '',
};

/** Blank strings must reach the API as undefined, not as empty columns. */
const toPatch = (form: TournamentFormState): Partial<Tournament> => ({
  name: form.name.trim(),
  club: form.club.trim() || undefined,
  province: form.province.trim() || undefined,
  startDate: form.startDate || undefined,
  endDate: form.endDate || undefined,
  timeControl: form.timeControl.trim() || undefined,
  chessResultsUrl: form.chessResultsUrl.trim() || undefined,
});

export const useTournamentForm = (
  addTournament: (t: Partial<Tournament>) => Promise<void>,
  updateTournament: (id: string, t: Partial<Tournament>) => Promise<void>,
  removeTournament: (id: string) => Promise<void>,
  modal: ModalContextType
) => {
  const [isAddingTournament, setIsAddingTournament] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [tournamentForm, setTournamentForm] = useState<TournamentFormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTournamentForm(prev => ({ ...prev, [name]: value }) as TournamentFormState);
  };

  const resetForm = () => {
    setTournamentForm({ ...EMPTY_FORM });
    setIsAddingTournament(false);
    setEditingTournamentId(null);
  };

  /** Shared guard + save + error path for both add and update. */
  const submit = async (save: () => Promise<void>) => {
    if (!tournamentForm.name || !tournamentForm.startDate) {
      await modal.alert('El nombre y la fecha de inicio son obligatorios');
      return;
    }
    setSaving(true);
    try {
      await save();
      resetForm();
    } catch (err) {
      await modal.alert(err instanceof Error ? err.message : 'No se pudo guardar el torneo');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTournament = () => submit(() => addTournament(toPatch(tournamentForm)));

  const handleUpdateTournament = () =>
    submit(async () => {
      if (editingTournamentId) await updateTournament(editingTournamentId, toPatch(tournamentForm));
    });

  const handleDeleteTournament = async (id: string) => {
    const confirmed = await modal.confirm(
      '¿Seguro que querés borrar este torneo?',
      'Borrar torneo'
    );
    if (!confirmed) return;
    try {
      await removeTournament(id);
    } catch (err) {
      await modal.alert(err instanceof Error ? err.message : 'No se pudo borrar el torneo');
    }
  };

  const handleEditTournament = (tournament: Tournament) => {
    setTournamentForm({
      name: tournament.name,
      club: tournament.club ?? '',
      province: tournament.province ?? '',
      startDate: tournament.startDate ?? '',
      endDate: tournament.endDate ?? '',
      timeControl: tournament.timeControl ?? '',
      chessResultsUrl: tournament.chessResultsUrl ?? '',
    });
    setEditingTournamentId(tournament.id);
    setIsAddingTournament(true);
  };

  return {
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
    resetForm,
  };
};
