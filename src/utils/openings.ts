import { useEffect, useMemo, useState } from 'react';

/**
 * Opening naming from a bundled copy of the Lichess chess-openings dataset
 * (~3700 positions), keyed by EPD (a FEN's first 4 fields). This works offline
 * and doesn't depend on the Lichess explorer API (which is unreliable).
 *
 * The dataset is ~60KB gzipped, so it's lazy-loaded on first use.
 */

export interface OpeningInfo {
  eco: string;
  name: string;
}

type Book = Record<string, string>; // epd -> "ECO\tName"

let book: Book | null = null;
let loadPromise: Promise<Book> | null = null;

/** Lazy-load (and cache) the openings dataset from the static asset. */
export const loadOpeningsBook = (): Promise<Book> => {
  if (book) return Promise.resolve(book);
  if (!loadPromise) {
    loadPromise = fetch(`${import.meta.env.BASE_URL}data/openingsBook.json`)
      .then(res => {
        if (!res.ok) throw new Error(`openings book ${res.status}`);
        return res.json();
      })
      .then((json: Book) => {
        book = json;
        return book;
      })
      .catch(err => {
        loadPromise = null; // allow a later retry
        throw err;
      });
  }
  return loadPromise;
};

const epdOf = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

const parse = (value: string | undefined): OpeningInfo | null => {
  if (!value) return null;
  const tab = value.indexOf('\t');
  return tab === -1 ? { eco: '', name: value } : { eco: value.slice(0, tab), name: value.slice(tab + 1) };
};

/** Opening named exactly at this position, if any. */
export const openingAtFen = (fen: string, b: Book): OpeningInfo | null => parse(b[epdOf(fen)]);

/**
 * Deepest named opening reached along a sequence of positions up to `upTo`
 * (inclusive). Returns the most specific line seen so far.
 */
export const deepestOpening = (fens: string[], b: Book, upTo = fens.length - 1): OpeningInfo | null => {
  let found: OpeningInfo | null = null;
  for (let i = 0; i <= upTo && i < fens.length; i++) {
    const o = openingAtFen(fens[i], b);
    if (o) found = o;
  }
  return found;
};

/**
 * Live opening name for a replay: the deepest named line reached at the current
 * ply. Returns null until the dataset has loaded or if nothing matches.
 */
export const useOpeningName = (fens: string[], ply: number): OpeningInfo | null => {
  const [loaded, setLoaded] = useState<Book | null>(book);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loadOpeningsBook().then(b => {
      if (active) setLoaded(b);
    });
    return () => {
      active = false;
    };
  }, [loaded]);

  return useMemo(() => (loaded ? deepestOpening(fens, loaded, ply) : null), [loaded, fens, ply]);
};
