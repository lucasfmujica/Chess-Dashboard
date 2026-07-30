import { useMemo, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useConcepts } from '../../hooks/useConcepts';
import { putConcept } from '../../api/client';

/**
 * Links a post-mortem to the concepts the game turned on.
 *
 * The Concepts tab already grades a concept by whether any game of yours is
 * attached — "leído, no aprendido" when the list is empty. But the only way to
 * attach one was to open Concepts, remember which game it was, and pick it out
 * of a list of eighty. This asks at the moment you actually know the answer,
 * and writes both directions: the annotation records which concepts, and each
 * concept gets the game, which is the half the grading reads.
 */

interface ConceptLinkPickerProps {
  /** Concept ids currently linked to this annotation. */
  value: string[];
  onChange: (ids: string[]) => void;
  /**
   * The `games` row this post-mortem is about. Without it the link is recorded
   * on the annotation only — a concept can't claim a game that isn't identified.
   */
  gameId?: string;
}

const ConceptLinkPicker = ({ value, onChange, gameId }: ConceptLinkPickerProps) => {
  const { concepts, loading, error } = useConcepts();
  const [query, setQuery] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? concepts.filter(
          c => c.name.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q)
        )
      : concepts;
    // Linked ones stay visible even when the search would hide them, so
    // unlinking never requires guessing the right search term.
    const linked = concepts.filter(c => value.includes(c.id));
    return [...new Set([...linked, ...list])].slice(0, 12);
  }, [concepts, query, value]);

  const toggle = async (id: string) => {
    const linking = !value.includes(id);
    onChange(linking ? [...value, id] : value.filter(x => x !== id));

    if (!gameId) return;
    const concept = concepts.find(c => c.id === id);
    if (!concept) return;

    const gameIds = linking
      ? [...new Set([...concept.gameIds, gameId])]
      : concept.gameIds.filter(g => g !== gameId);
    if (gameIds.length === concept.gameIds.length && linking) return;

    try {
      setSyncError(null);
      // Partial write: only game_ids travels, so the concept's own text is
      // untouched. Clearing the last game is possible now too — the PUT no
      // longer COALESCEs an empty array away.
      await putConcept(id, { gameIds });
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'No se pudo actualizar el concepto'
      );
    }
  };

  if (loading) return <p className="text-sm text-fg-muted">Cargando conceptos…</p>;
  if (error) return <p className="text-sm text-loss">{error}</p>;

  if (concepts.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Todavía no hay conceptos cargados. Se crean en Concepts &amp; Books, o se importan del
        estudio.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar un concepto…"
        className="w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm"
      />
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {matches.map(concept => {
          const linked = value.includes(concept.id);
          return (
            <li key={concept.id}>
              <button
                type="button"
                onClick={() => void toggle(concept.id)}
                aria-pressed={linked}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  linked
                    ? 'border-accent bg-accent/10 text-fg'
                    : 'border-hairline bg-surface text-fg-muted hover:border-accent/50'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    linked ? 'border-accent bg-accent text-app' : 'border-hairline'
                  }`}
                >
                  {linked && <CheckIcon className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{concept.name}</span>
                <span className="shrink-0 text-xs text-fg-subtle">{concept.category}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!gameId && value.length > 0 && (
        <p className="text-xs text-draw">
          Vinculá la partida arriba para que estos conceptos cuenten como aplicados.
        </p>
      )}
      {syncError && <p className="text-xs text-loss">{syncError}</p>}
    </div>
  );
};

export default ConceptLinkPicker;
