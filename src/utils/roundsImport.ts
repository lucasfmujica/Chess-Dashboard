/**
 * Parser for a pasted tournament crosstable row:
 *
 *   Ronda | Rival | Elo | Color | Resultado
 *   1 | Romanelli, Gabriel | 2054 | B | ½
 *
 * Team events publish a results table and no PGN — nobody writes the moves
 * down at 12+3 — so this is the only way those games get into the app.
 */

export interface ParsedRound {
  round?: number;
  opponent: string;
  /**
   * Opponent rating. **Zero, never undefined, for an unrated opponent.**
   * `calculateExpectedScore` only special-cases 0; given undefined it returns
   * NaN and poisons every average that opponent appears in.
   */
  opponentElo: number;
  color: 'W' | 'B';
  result: 'W' | 'D' | 'L';
}

/** Colour column: chess-results uses □/■, sheets use B/N or W/B or words. */
const parseColor = (raw: string): 'W' | 'B' | null => {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === '□' || value === '⬜' || value === 'w') return 'W';
  if (value === '■' || value === '⬛' || value === 'n') return 'B';
  // 'b' is ambiguous — Spanish "blancas" vs English "black". This app's data
  // is Spanish, so a bare 'b' means blancas.
  if (value === 'b') return 'W';
  if (value.startsWith('bl')) return 'W'; // blancas / blanco
  if (value.startsWith('ne') || value.startsWith('bla')) return 'B'; // negras / black
  return null;
};

/** Result column: 1 / 0 / ½ / 0.5 / = / +/- forfeits. */
const parseResult = (raw: string): 'W' | 'D' | 'L' | null => {
  const value = raw.trim().toLowerCase().replace(',', '.');
  if (!value) return null;
  if (value === '1' || value === '1.0' || value === '+') return 'W';
  if (value === '0' || value === '0.0' || value === '-') return 'L';
  if (value === '½' || value === '0.5' || value === '.5' || value === '=' || value === '1/2') {
    return 'D';
  }
  return null;
};

/**
 * Parse one line. Returns null when the line is not a usable round — a header,
 * a blank, or a row whose colour/result could not be read.
 */
export const parseRoundLine = (line: string): ParsedRound | null => {
  const fields = line.split('|').map(f => f.trim());
  if (fields.length < 4) return null;

  // The round number is optional; when the first field isn't a number, treat
  // the line as starting at the opponent.
  const hasRound = /^\d+$/.test(fields[0]);
  const round = hasRound ? Number(fields[0]) : undefined;
  const rest = hasRound ? fields.slice(1) : fields;

  const [opponent, eloRaw, colorRaw, resultRaw] = rest;
  if (!opponent?.trim()) return null;

  const color = parseColor(colorRaw ?? '');
  const result = parseResult(resultRaw ?? '');
  if (!color || !result) return null;

  const eloDigits = (eloRaw ?? '').replace(/[^\d]/g, '');
  const opponentElo = eloDigits ? Number(eloDigits) : 0;

  return { round, opponent: opponent.trim(), opponentElo, color, result };
};

/** Parse a whole pasted block, skipping headers and blank lines. */
export const parseRounds = (text: string): ParsedRound[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseRoundLine)
    .filter((r): r is ParsedRound => r !== null);

/** Score in points, for showing the total back before importing. */
export const roundsScore = (rounds: ParsedRound[]): number =>
  rounds.reduce((sum, r) => sum + (r.result === 'W' ? 1 : r.result === 'D' ? 0.5 : 0), 0);
