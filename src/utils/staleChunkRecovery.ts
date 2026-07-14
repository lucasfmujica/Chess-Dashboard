const RELOAD_FLAG = 'chess-dashboard-chunk-reload-attempted';

/**
 * True for the "stale chunk" family of errors: the browser has an old
 * index.html referencing a lazy-loaded JS chunk whose hashed filename no
 * longer exists because a new deployment went live while the tab was open.
 * Different browsers phrase this differently (Vite's own preload error,
 * Chrome's dynamic-import fetch failure, Safari/Firefox's module-script
 * wording), so match on the common substrings rather than one exact string.
 */
export const isStaleChunkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch dynamically imported module|importing a module script failed|loading chunk|loading css chunk/i.test(
    message
  );
};

/**
 * Reload the page once to pick up the new deployment's asset manifest. Guarded
 * by a sessionStorage flag so a persistent failure (offline, real 404) shows
 * the error UI instead of reload-looping forever.
 */
export const reloadOnceForStaleChunk = (): boolean => {
  if (sessionStorage.getItem(RELOAD_FLAG)) return false;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
  return true;
};
