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
