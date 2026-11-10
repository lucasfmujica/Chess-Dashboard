import { useEffect, useMemo, useState } from 'react';
import {
  buildChapterAssignment,
  indexFromPgn,
  isPgnIndexed,
  type ChapterAssignmentResult,
} from '../utils/chapterRules';
import type { Game } from '../types/chess';

export const INDEX_BATCH = 25;

/**
 * Indexa las partidas pendientes en tandas de INDEX_BATCH con `setTimeout(0)`
 * para no bloquear el hilo principal. Devuelve la función de cancelación.
 */
export const indexInBatches = (games: Game[], onDone: () => void, batch = INDEX_BATCH): (() => void) => {
  const pending = games.filter(g => !isPgnIndexed(g.pgn));
  let next = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const step = () => {
    const end = Math.min(next + batch, pending.length);
    for (; next < end; next++) indexFromPgn(pending[next].pgn);
    if (next < pending.length) timer = setTimeout(step, 0);
    else onDone();
  };
  timer = setTimeout(step, 0);
  return () => clearTimeout(timer);
};

/**
 * Capítulo por reglas de jugadas de cada partida. Si todos los PGN ya están en
 * la cache de índices calcula sincrónico; si no, indexa en tandas y devuelve
 * null hasta terminar.
 */
export const useChapterAssignment = (games: Game[]): ChapterAssignmentResult | null => {
  const ready = useMemo(() => games.every(g => isPgnIndexed(g.pgn)), [games]);
  const sync = useMemo(() => (ready ? buildChapterAssignment(games) : null), [ready, games]);
  const [async, setAsync] = useState<{ games: Game[]; result: ChapterAssignmentResult } | null>(null);

  useEffect(() => {
    if (ready) return;
    return indexInBatches(games, () => setAsync({ games, result: buildChapterAssignment(games) }));
  }, [ready, games]);

  if (sync) return sync;
  return async && async.games === games ? async.result : null;
};
