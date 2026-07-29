import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHomework, postHomework, putHomework, deleteHomework } from '../api/client';
import { localDateKey } from '../utils/localDate';
import { isHomeworkOverdue, type Homework } from '../types/training';

/**
 * Homework assigned in coaching sessions.
 *
 * Overdue is computed here rather than read from `status`, so the count is
 * correct whether or not any importer or scheduled job has ever run.
 */
export interface UseHomework {
  items: Homework[];
  /** Not done yet, in due-date order. */
  open: Homework[];
  /** Past its due date and still open. */
  overdue: Homework[];
  loading: boolean;
  error: string | null;
  todayKey: string;
  add: (items: Partial<Homework>[]) => Promise<void>;
  setStatus: (id: string, status: Homework['status']) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useHomework = (): UseHomework => {
  const [items, setItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const todayKey = useMemo(() => localDateKey(), []);

  const refetch = useCallback(async () => {
    setItems(await fetchHomework());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar la tarea'))
      .finally(() => setLoading(false));
  }, [refetch]);

  const open = useMemo(() => items.filter(h => h.status !== 'hecho'), [items]);
  const overdue = useMemo(
    () => open.filter(h => isHomeworkOverdue(h, todayKey)),
    [open, todayKey]
  );

  const add = useCallback(
    async (newItems: Partial<Homework>[]) => {
      setItems(await postHomework(newItems));
    },
    []
  );

  const setStatus = useCallback(
    async (id: string, status: Homework['status']) => {
      const updated = await putHomework(id, { status });
      setItems(prev => prev.map(h => (h.id === id ? updated : h)));
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteHomework(id);
    setItems(prev => prev.filter(h => h.id !== id));
  }, []);

  return { items, open, overdue, loading, error, todayKey, add, setStatus, remove, refetch };
};
