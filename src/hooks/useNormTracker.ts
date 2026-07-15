import { useCallback, useEffect, useState } from 'react';
import {
  fetchNormAttempts,
  postNormAttempt,
  putNormAttempt,
  deleteNormAttempt,
  fetchNormThresholds,
  putNormThresholds,
} from '../api/client';
import type { NormAttempt, NormThresholds } from '../types/norms';

const DEFAULT_THRESHOLDS: NormThresholds = { IM: 2450, GM: 2600, WIM: 2250, WGM: 2400 };

export interface UseNormTracker {
  attempts: NormAttempt[];
  thresholds: NormThresholds;
  loading: boolean;
  error: string | null;
  saveAttempt: (attempt: Partial<NormAttempt>, editingId?: string) => Promise<void>;
  removeAttempt: (id: string) => Promise<void>;
  saveThresholds: (thresholds: NormThresholds) => Promise<void>;
}

export const useNormTracker = (): UseNormTracker => {
  const [attempts, setAttempts] = useState<NormAttempt[]>([]);
  const [thresholds, setThresholds] = useState<NormThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchNormAttempts(), fetchNormThresholds()])
      .then(([a, t]) => {
        setAttempts(a);
        setThresholds(t);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load norm tracker data'))
      .finally(() => setLoading(false));
  }, []);

  const saveAttempt = useCallback(async (attempt: Partial<NormAttempt>, editingId?: string) => {
    const saved = editingId ? await putNormAttempt(editingId, attempt) : await postNormAttempt(attempt);
    setAttempts(prev => (editingId ? prev.map(a => (a.id === saved.id ? saved : a)) : [saved, ...prev]));
  }, []);

  const removeAttempt = useCallback(async (id: string) => {
    await deleteNormAttempt(id);
    setAttempts(prev => prev.filter(a => a.id !== id));
  }, []);

  const saveThresholds = useCallback(async (next: NormThresholds) => {
    setThresholds(await putNormThresholds(next));
  }, []);

  return { attempts, thresholds, loading, error, saveAttempt, removeAttempt, saveThresholds };
};
