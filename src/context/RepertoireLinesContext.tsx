import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RepertoireLine } from '../types/chess';
import {
  fetchRepertoireLines,
  postRepertoireLine,
  putRepertoireLine,
  deleteRepertoireLine,
  type RepertoireLineWrite,
} from '../api/client';

/**
 * One copy of `repertoire_lines` for every view that reads it.
 *
 * Before this, Líneas, Entrenar and the daily queue each ran their own
 * `fetchRepertoireLines()` into their own `useState`. Editing a line's plan in
 * one and then reviewing it in another showed the old text until the tab was
 * remounted — the views were reading the same table and disagreeing about it.
 * Now they share this state, so a write in any of them is visible in all.
 *
 * The queue (`useDailyQueue`) still fetches independently: it lives outside
 * this provider and mixes lines with blunders and endgames. Its copy is
 * read-only apart from the SRS bump it makes itself, so it can't go stale in
 * a way the user would act on.
 */

interface RepertoireLinesValue {
  lines: RepertoireLine[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (line: Partial<RepertoireLine>) => Promise<RepertoireLine>;
  /**
   * Full replace — `putRepertoireLine` sets every column from the body, so a
   * partial object nulls plan/goldenRule/notes. Spread the whole line.
   */
  update: (id: string, line: RepertoireLineWrite) => Promise<RepertoireLine>;
  remove: (id: string) => Promise<void>;
}

const RepertoireLinesContext = createContext<RepertoireLinesValue | null>(null);

export const RepertoireLinesProvider = ({ children }: { children: ReactNode }) => {
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setLines(await fetchRepertoireLines());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las líneas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (line: Partial<RepertoireLine>) => {
    const saved = await postRepertoireLine(line);
    setLines(prev => [...prev, saved]);
    return saved;
  }, []);

  const update = useCallback(async (id: string, line: RepertoireLineWrite) => {
    const saved = await putRepertoireLine(id, line);
    setLines(prev => prev.map(l => (l.id === saved.id ? saved : l)));
    return saved;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteRepertoireLine(id);
    setLines(prev => prev.filter(l => l.id !== id));
  }, []);

  return (
    <RepertoireLinesContext.Provider
      value={{ lines, loading, error, reload, create, update, remove }}
    >
      {children}
    </RepertoireLinesContext.Provider>
  );
};

export const useRepertoireLines = (): RepertoireLinesValue => {
  const context = useContext(RepertoireLinesContext);
  if (!context) {
    throw new Error('useRepertoireLines must be used within a RepertoireLinesProvider');
  }
  return context;
};
