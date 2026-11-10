import { postTrainingAttempts } from '../api/client';
import { UNSAVED_KEY } from './conversionProgress';
import type { TrainingAttempt } from '../types/training';

/**
 * Cola de intentos de conversión que todavía no confirmó el servidor.
 *
 * Hay un único flusher por pestaña (estado de módulo, compartido entre todas
 * las instancias del hook) y los POST salen en serie: nunca dos POST del mismo
 * pendiente a la vez. Entre pestañas, al reclamar un pendiente se lo marca "en
 * vuelo" con la hora en localStorage; nadie más lo reenvía hasta pasados
 * `INFLIGHT_MS` sin confirmación (por si la pestaña que lo mandó se cerró).
 * Si un reintento igual llega duplicado, `rebuildFromAttempts` lo colapsa.
 */

/**
 * Lo que se manda al servidor: sin `candidateMiss`, que es la métrica de los
 * blunders, y sin `sessionId` (desde la pestaña no hay sesión: queda null).
 */
export type ConversionAttempt = Pick<
  TrainingAttempt,
  'itemKind' | 'itemId' | 'correct' | 'seconds' | 'thinkSeconds' | 'candidatesWritten'
>;

export interface OutboxEntry {
  key: string;
  attempt: ConversionAttempt;
  /** Epoch ms en que una pestaña lo reclamó para enviarlo. */
  inflightAt?: number;
}

/** Sin confirmación pasado este tiempo, un pendiente en vuelo se puede reenviar. */
export const INFLIGHT_MS = 2 * 60 * 1000;

const isEntry = (v: unknown): v is OutboxEntry =>
  !!v && typeof v === 'object' && typeof (v as OutboxEntry).key === 'string' && typeof (v as OutboxEntry).attempt === 'object';

export const readOutbox = (): OutboxEntry[] => {
  try {
    const raw = window.localStorage.getItem(UNSAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

const writeOutbox = (entries: OutboxEntry[]) => {
  try {
    window.localStorage.setItem(UNSAVED_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn(`Error saving localStorage key "${UNSAVED_KEY}":`, error);
  }
  notify();
};

/** Para `useSyncExternalStore`: avisa también cuando otra pestaña cambia la clave. */
export const subscribeOutbox = (onChange: () => void) => {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === UNSAVED_KEY || e.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
};

export const outboxSize = () => readOutbox().length;

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const enqueueAttempt = (attempt: ConversionAttempt) => {
  writeOutbox([...readOutbox(), { key: newKey(), attempt }]);
};

const flushOnce = async () => {
  const now = Date.now();
  const all = readOutbox();
  const claimed = all.filter(e => e.inflightAt === undefined || now - e.inflightAt >= INFLIGHT_MS);
  if (claimed.length === 0) return;
  const keys = new Set(claimed.map(e => e.key));

  writeOutbox(all.map(e => (keys.has(e.key) ? { ...e, inflightAt: now } : e)));
  try {
    await postTrainingAttempts(claimed.map(e => e.attempt));
    writeOutbox(readOutbox().filter(e => !keys.has(e.key)));
  } catch {
    // Falló: se suelta el reclamo y queda pendiente para el próximo montaje.
    writeOutbox(
      readOutbox().map(e => {
        if (!keys.has(e.key)) return e;
        const { inflightAt: _released, ...rest } = e;
        return rest;
      })
    );
  }
};

/** Serie de envíos de la pestaña; `scheduled` junta los pedidos que llegan antes de que arranque el siguiente. */
let tail: Promise<void> = Promise.resolve();
let scheduled: Promise<void> | null = null;

/** Envía lo pendiente. Varias llamadas a la vez comparten un solo envío. */
export const flushOutbox = (): Promise<void> => {
  if (scheduled) return scheduled;
  const run = tail.then(() => {
    scheduled = null;
    return flushOnce();
  });
  scheduled = run;
  tail = run.catch(() => undefined);
  return run;
};
