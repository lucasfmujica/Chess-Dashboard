import { isDue, nextReviewAt, nudgeConfidence } from './srs';
import type { ConversionKind } from '../constants/conversionQueue';
import type { TrainingAttempt } from '../types/training';

/**
 * Estado SRS de un ítem estático (conversión o guía). No existe tabla para esto
 * (a diferencia de `blunder_drills`), así que se deriva de los intentos en
 * `training_attempts` y se cachea en localStorage.
 */
export interface ConversionProgress {
  confidence?: number;
  /** Epoch ms del último repaso. */
  lastReviewed?: number;
  reviewCount: number;
  solvedCount: number;
}

/** Indexado por id estático (`conv-001`, `drill-001`): una sola clave para las dos fuentes. */
export type ProgressMap = Record<string, ConversionProgress>;

export type ConversionFilter = 'all' | 'conversion' | 'guide';

export const PROGRESS_KEY = 'chess-dashboard-conversion-progress';
export const FILTER_KEY = 'chess-dashboard-conversion-filter';
export const UNSAVED_KEY = 'chess-dashboard-conversion-unsaved';

/** Un intento más sobre el estado de un ítem. Misma regla que `blunders.solve`. */
export const applyAttempt = (
  prev: ConversionProgress | undefined,
  correct: boolean,
  at: number
): ConversionProgress => ({
  confidence: nudgeConfidence(prev?.confidence, correct),
  lastReviewed: at,
  reviewCount: (prev?.reviewCount ?? 0) + 1,
  solvedCount: (prev?.solvedCount ?? 0) + (correct ? 1 : 0),
});

/** Dos intentos idénticos a menos de esto cuentan una vez: son reintentos de un mismo POST. */
export const DUPLICATE_WINDOW_MS = 120_000;

/**
 * Reconstruye el estado desde los intentos del servidor. `idByUuid` mapea el
 * `itemId` (UUIDv5) al id estático; todo intento ajeno (otro `itemKind`, otro
 * uuid) se ignora. Los duplicados obvios (mismo ítem, `correct`, `seconds` y
 * `thinkSeconds`, con `createdAt` a menos de `DUPLICATE_WINDOW_MS` del último
 * que se contó) cuentan una sola vez: un reintento que llegó dos veces al
 * servidor no debe inflar `reviewCount`.
 */
export const rebuildFromAttempts = (
  attempts: Pick<TrainingAttempt, 'itemKind' | 'itemId' | 'correct' | 'seconds' | 'thinkSeconds' | 'createdAt'>[],
  idByUuid: ReadonlyMap<string, string>
): ProgressMap => {
  const out: ProgressMap = {};
  const lastCounted = new Map<string, number>();
  const relevant = attempts
    .filter(a => a.itemKind === 'external' && a.itemId && idByUuid.has(a.itemId))
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const a of relevant) {
    const signature = `${a.itemId}|${a.correct}|${a.seconds ?? ''}|${a.thinkSeconds ?? ''}`;
    const prev = lastCounted.get(signature);
    if (prev !== undefined && a.createdAt - prev < DUPLICATE_WINDOW_MS) continue;
    lastCounted.set(signature, a.createdAt);
    const id = idByUuid.get(a.itemId as string) as string;
    out[id] = applyAttempt(out[id], a.correct, a.createdAt);
  }
  return out;
};

/** Fusiona dos estados: ante un conflicto gana el `lastReviewed` más reciente (empate: local). */
export const mergeProgress = (local: ProgressMap, server: ProgressMap): ProgressMap => {
  const out: ProgressMap = { ...local };
  for (const [id, remote] of Object.entries(server)) {
    const mine = out[id];
    if (!mine || (remote.lastReviewed ?? 0) > (mine.lastReviewed ?? 0)) out[id] = remote;
  }
  return out;
};

interface Orderable {
  id: string;
  kind: ConversionKind;
  evalBefore?: number;
}

export const filterByKind = <T extends Pick<Orderable, 'kind'>>(items: T[], filter: ConversionFilter): T[] =>
  filter === 'all' ? items : items.filter(i => i.kind === filter);

export const isSeen = (p: ConversionProgress | undefined): boolean => !!p?.lastReviewed;

/**
 * Primero las no vistas, después las que vencen por SRS y al final el resto.
 *
 * Entre las no vistas van primero las de conversión, por `evalBefore`
 * descendente (las ventajas más grandes) y por id; las guías siguen por id.
 */
export const orderConversionItems = <T extends Orderable>(
  items: T[],
  progress: ProgressMap,
  now: number
): T[] => {
  const unseen: T[] = [];
  const due: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const p = progress[item.id];
    if (!isSeen(p)) unseen.push(item);
    else if (isDue(p?.lastReviewed, p?.confidence, now)) due.push(item);
    else rest.push(item);
  }
  const byId = (a: Orderable, b: Orderable) => a.id.localeCompare(b.id);
  unseen.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'conversion' ? -1 : 1;
    if (a.kind === 'conversion') return (b.evalBefore ?? 0) - (a.evalBefore ?? 0) || byId(a, b);
    return byId(a, b);
  });
  const bySoonest = (a: Orderable, b: Orderable) =>
    nextReviewAt(progress[a.id]?.lastReviewed, progress[a.id]?.confidence) -
      nextReviewAt(progress[b.id]?.lastReviewed, progress[b.id]?.confidence) || byId(a, b);
  due.sort(bySoonest);
  rest.sort(bySoonest);
  return [...unseen, ...due, ...rest];
};

export interface ConversionStats {
  total: number;
  seen: number;
  due: number;
}

/** "x de N vistas · y para hoy": las no vistas también cuentan como para hoy. */
export const conversionStats = <T extends Orderable>(
  items: T[],
  progress: ProgressMap,
  now: number
): ConversionStats => ({
  total: items.length,
  seen: items.filter(i => isSeen(progress[i.id])).length,
  due: items.filter(i => isDue(progress[i.id]?.lastReviewed, progress[i.id]?.confidence, now)).length,
});
