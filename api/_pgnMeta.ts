import { ecoNames } from '../src/constants/ecoNames.js';

/** Parses a PGN's [Date "YYYY.MM.DD"] header into an ISO date. Null for missing/partial (e.g. "????.??.??") dates. */
export const parsePgnDate = (pgn: string | null | undefined): string | null => {
  if (!pgn) return null;
  const match = pgn.match(/\[Date\s+"(\d{4})\.(\d{1,2})\.(\d{1,2})"\]/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/** Looks up a human-readable opening name for an ECO code. */
export const openingNameForEco = (eco: string | null | undefined): string | null => {
  if (!eco) return null;
  return ecoNames[eco] ?? null;
};
