import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { fetchTrainingAttempts } from '../api/client';
import { ALL_CONVERSION_ITEMS, type ConversionItem } from '../constants/conversionQueue';
import { conversionItemUuid } from '../utils/conversionId';
import {
  enqueueAttempt,
  flushOutbox,
  outboxSize,
  subscribeOutbox,
  type ConversionAttempt,
} from '../utils/conversionOutbox';
import {
  FILTER_KEY,
  PROGRESS_KEY,
  applyAttempt,
  conversionStats,
  filterByKind,
  mergeProgress,
  orderConversionItems,
  rebuildFromAttempts,
  type ConversionFilter,
  type ConversionProgress,
  type ProgressMap,
} from '../utils/conversionProgress';
import useLocalStorage from './useLocalStorage';
import type { TrainingAttempt } from '../types/training';

export type { ConversionAttempt };

/**
 * La cola de conversión, guías y clases (154 ítems estáticos).
 *
 * El progreso de cada ítem vive en localStorage y se reconstruye con los
 * intentos del servidor (`training_attempts`, `item_kind = 'external'`,
 * `item_id` = UUIDv5 del id estático); ver `utils/conversionProgress`.
 * Un intento que no se pudo guardar queda pendiente y se reintenta al montar
 * (ver `utils/conversionOutbox`: un solo flusher por pestaña).
 */

export interface RecordOptions {
  seconds?: number;
  thinkSeconds?: number;
  candidatesWritten?: string;
}

/** uuid → id estático, para reconstruir el estado desde el servidor. */
const buildIdByUuid = (items: ConversionItem[]) => new Map(items.map(i => [conversionItemUuid(i.id), i.id]));

/**
 * Los intentos del servidor se leen una sola vez por carga de la app: cada
 * montaje de la pestaña reusa la misma promesa. Si falla se descarta para que el
 * próximo montaje vuelva a intentar. Lo que se juega después ya está en el
 * estado local, que gana por `lastReviewed`.
 */
let serverAttempts: Promise<TrainingAttempt[]> | null = null;
const loadServerAttempts = () => {
  if (!serverAttempts) {
    serverAttempts = fetchTrainingAttempts().catch(err => {
      serverAttempts = null;
      throw err;
    });
  }
  return serverAttempts;
};
/** Solo para tests: olvida el cache de módulo. */
export const resetConversionServerCache = () => {
  serverAttempts = null;
};

export const useConversionQueue = (items: ConversionItem[] = ALL_CONVERSION_ITEMS) => {
  const [filter, setFilter] = useLocalStorage<ConversionFilter>(FILTER_KEY, 'all');
  const [progress, setProgress] = useLocalStorage<ProgressMap>(PROGRESS_KEY, {});
  /** Cambia cuando termina la sincronización con el servidor: la tab rearma su cola ahí, no al responder. */
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Espejos para que dos respuestas seguidas no pisen el estado de la anterior.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const idByUuid = useMemo(() => buildIdByUuid(items), [items]);

  // `useLocalStorage` devuelve un setter nuevo en cada render: se guarda en un
  // ref para que los callbacks (y el efecto de sincronización) queden estables.
  const setProgressRef = useRef(setProgress);
  setProgressRef.current = setProgress;

  const updateProgress = useCallback((next: ProgressMap) => {
    progressRef.current = next;
    setProgressRef.current(next);
  }, []);
  const pendingCount = useSyncExternalStore(subscribeOutbox, outboxSize);

  // Al montar: primero los pendientes (así el servidor ya los cuenta), después
  // se reconstruye desde el servidor y se fusiona con lo local.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await flushOutbox();
      try {
        const attempts = await loadServerAttempts();
        if (cancelled) return;
        const server = rebuildFromAttempts(attempts, idByUuid);
        updateProgress(mergeProgress(progressRef.current, server));
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        setSyncError(err instanceof Error ? err.message : 'No se pudo sincronizar con el servidor.');
      } finally {
        if (!cancelled) setSyncedAt(Date.now());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idByUuid, updateProgress]);

  const counts = useMemo(
    () => ({
      all: items.length,
      conversion: filterByKind(items, 'conversion').length,
      guide: filterByKind(items, 'guide').length,
      class: filterByKind(items, 'class').length,
    }),
    [items]
  );

  /** Orden para el filtro dado, con el progreso de ahora. */
  const ordered = useCallback(
    (which: ConversionFilter, now = Date.now()) =>
      orderConversionItems(filterByKind(items, which), progressRef.current, now),
    [items]
  );

  const stats = useCallback(
    (which: ConversionFilter, now = Date.now()) => conversionStats(filterByKind(items, which), progress, now),
    [items, progress]
  );

  /** Guarda el intento: SRS local primero, después el POST (si falla queda pendiente). */
  const record = useCallback(
    async (item: ConversionItem, correct: boolean, opts: RecordOptions = {}) => {
      const next: ConversionProgress = applyAttempt(progressRef.current[item.id], correct, Date.now());
      updateProgress({ ...progressRef.current, [item.id]: next });

      const attempt: ConversionAttempt = {
        itemKind: 'external',
        itemId: conversionItemUuid(item.id),
        correct,
        ...(opts.seconds !== undefined && { seconds: opts.seconds }),
        ...(opts.thinkSeconds !== undefined && { thinkSeconds: opts.thinkSeconds }),
        ...(opts.candidatesWritten && { candidatesWritten: opts.candidatesWritten }),
      };
      // Entra a la cola y sale por el flusher compartido; si falla queda pendiente.
      enqueueAttempt(attempt);
      await flushOutbox();
    },
    [updateProgress]
  );

  return {
    filter,
    setFilter,
    counts,
    progress,
    ordered,
    stats,
    record,
    syncedAt,
    syncError,
    pendingCount,
  };
};

export default useConversionQueue;
