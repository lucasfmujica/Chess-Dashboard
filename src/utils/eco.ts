/**
 * The placeholder ECO written by every import that has no moves to classify:
 * chess-results crosstables (results only, no PGN), manual game entry with the
 * field left blank, and the rare Lichess game with no opening.
 *
 * It is not an opening, so it must never be bucketed as one — a row called
 * "Unknown" outscoring the English is an artefact of the import, not something
 * to prepare against.
 */
export const UNKNOWN_ECO = 'Unknown';

/** Whether a game carries a real ECO code rather than the import placeholder. */
export const hasEco = (eco?: string | null): boolean => !!eco && eco !== UNKNOWN_ECO;

const ECO_CODE = /^([A-E])(\d{2})$/i;
const ECO_RANGE = /^([A-E]\d{2})\s*[-–]\s*([A-E]\d{2})$/i;

/** Código ECO a un número ordenable (A00 → 0, E99 → 499), o null si no es ECO. */
const ecoOrdinal = (eco: string): number | null => {
  const match = ECO_CODE.exec(eco.trim());
  if (!match) return null;
  return (match[1].toUpperCase().charCodeAt(0) - 65) * 100 + Number(match[2]);
};

/**
 * El ECO del capítulo como rango cerrado. Acepta un código suelto (`B30`) o un
 * rango (`B30-B39`); cualquier otra cosa da null.
 */
export const parseEcoRange = (eco: string | undefined): [number, number] | null => {
  if (!eco) return null;
  const trimmed = eco.trim();
  const range = ECO_RANGE.exec(trimmed);
  if (range) {
    const from = ecoOrdinal(range[1]);
    const to = ecoOrdinal(range[2]);
    if (from === null || to === null) return null;
    return from <= to ? [from, to] : [to, from];
  }
  const single = ecoOrdinal(trimmed);
  return single === null ? null : [single, single];
};

/** True si el ECO de la partida cae dentro del ECO (o rango) del capítulo. */
export const ecoMatches = (chapterEco: string | undefined, gameEco: string | undefined): boolean => {
  const range = parseEcoRange(chapterEco);
  if (!range || !gameEco) return false;
  const value = ecoOrdinal(gameEco);
  return value !== null && value >= range[0] && value <= range[1];
};
