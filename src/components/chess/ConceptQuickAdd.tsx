import { useState } from 'react';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { postConcept } from '../../api/client';
import type { Concept, ConceptCategory } from '../../types/training';

/**
 * Create a concept from wherever it actually came up.
 *
 * The concepts table stayed empty because the only way in was a blank form on
 * a tab you had to remember to visit. A concept is never *thought of* there —
 * it comes from a coach saying something in class, or from a drill you got
 * wrong. So this mounts at both of those moments, prefilled with what that
 * context already knows.
 *
 * The prefill from a drill matters most: it carries the FEN and the game id,
 * and a concept with a linked game is the difference between having read
 * about a motif and being able to point at it in your own play — which is the
 * distinction the concepts view grades on.
 */

const CATEGORIES: { value: ConceptCategory; label: string }[] = [
  { value: 'opening', label: 'Apertura' },
  { value: 'middlegame', label: 'Medio juego' },
  { value: 'endgame', label: 'Finales' },
  { value: 'calculation', label: 'Cálculo' },
  { value: 'strategy', label: 'Estrategia' },
  { value: 'mindset', label: 'Mentalidad' },
];

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

interface ConceptQuickAddProps {
  /** Everything the calling context already knows — name, category, FEN, game. */
  defaults: Partial<Concept>;
  /** Trigger label; the caller knows what "this" refers to on its own screen. */
  label?: string;
  onCreated?: (concept: Concept) => void;
}

const ConceptQuickAdd = ({
  defaults,
  label = 'Crear concepto',
  onCreated,
}: ConceptQuickAddProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaults.name ?? '');
  const [category, setCategory] = useState<ConceptCategory>(defaults.category ?? 'middlegame');
  const [summary, setSummary] = useState(defaults.summary ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const concept = await postConcept({
        ...defaults,
        name: name.trim(),
        category,
        summary: summary.trim() || undefined,
        status: defaults.status ?? 'studying',
      });
      setCreated(concept.name);
      setOpen(false);
      onCreated?.(concept);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el concepto');
    } finally {
      setSaving(false);
    }
  };

  if (created && !open) {
    return (
      <p className="text-xs text-win">
        Concepto «{created}» creado.{' '}
        <button
          className="text-accent hover:underline"
          onClick={() => {
            setCreated(null);
            setName('');
            setSummary('');
          }}
        >
          otro
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
      >
        <LightBulbIcon className="w-4 h-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-hairline bg-surface-2 p-3">
      <input
        autoFocus
        className={INPUT_CLASS}
        placeholder="Nombre del concepto"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <select
        className={INPUT_CLASS}
        value={category}
        onChange={e => setCategory(e.target.value as ConceptCategory)}
      >
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <textarea
        className={INPUT_CLASS}
        rows={2}
        placeholder="En una frase: qué es y cuándo aplica"
        value={summary}
        onChange={e => setSummary(e.target.value)}
      />
      {defaults.exampleFens?.length ? (
        <p className="text-xs text-fg-subtle">
          Se guarda con la posición del drill{defaults.gameIds?.length ? ' y la partida' : ''}.
        </p>
      ) : null}
      {error && <p className="text-xs text-loss">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => void save()}
          disabled={!name.trim() || saving}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ConceptQuickAdd;
