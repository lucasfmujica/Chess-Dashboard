/**
 * Extract the human comments of a PGN's main line, indexed by ply.
 *
 * The result follows the same indexing as `parsePgn().fens`: index 0 holds the
 * comment written before the first move (the game's opening comment) and index
 * `i` holds the `{...}` comment that follows ply `i`. Comments inside
 * parenthesised variations are ignored, as are machine annotations such as
 * `[%clk ...]`, `[%eval ...]`, `[%csl ...]` and `[%cal ...]`; a comment that is
 * empty once those are removed counts as no comment (`null`).
 */
export const extractPgnComments = (pgn?: string): (string | null)[] => {
  if (!pgn || !pgn.trim()) return [null];
  // Drop header tag pairs ([Event "..."]) so their brackets aren't read as movetext.
  const text = pgn.replace(/^\s*\[[^\]\n]*\]\s*$/gm, ' ');
  const comments: (string | null)[] = [null];
  let ply = 0;
  let depth = 0;

  const attach = (raw: string) => {
    if (depth > 0) return;
    const clean = raw
      .replace(/\[%[^\]]*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;
    const prev = comments[ply];
    comments[ply] = prev ? `${prev} ${clean}` : clean;
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '{') {
      const end = text.indexOf('}', i + 1);
      const stop = end === -1 ? text.length : end;
      attach(text.slice(i + 1, stop));
      i = stop + 1;
    } else if (c === ';') {
      const end = text.indexOf('\n', i + 1);
      const stop = end === -1 ? text.length : end;
      attach(text.slice(i + 1, stop));
      i = stop + 1;
    } else if (c === '(') {
      depth++;
      i++;
    } else if (c === ')') {
      depth = Math.max(0, depth - 1);
      i++;
    } else if (/\s/.test(c)) {
      i++;
    } else {
      let j = i;
      while (j < text.length && !/[\s{};()]/.test(text[j])) j++;
      const token = text.slice(i, j);
      i = j;
      if (depth > 0 || isNonMove(token)) continue;
      ply++;
      comments[ply] = null;
    }
  }
  return comments;
};

/** Move numbers, NAGs, results and stray glyphs: everything in movetext that isn't a ply. */
const isNonMove = (token: string): boolean => {
  const t = token.replace(/^\d+\.+/, ''); // "1." / "12..." / "1.e4" -> "" / "" / "e4"
  if (!t) return true;
  if (/^0[-–—]0([-–—]0)?[+#]?[!?]*$/.test(t)) return false; // castling written with zeros
  if (/^\$\d+$/.test(t)) return true; // NAG
  if (t === '*') return true;
  if (/^[0-9/½\-–—]+$/.test(t)) return true; // 1-0, 0-1, 1/2-1/2 (also split "1/2 - 1/2")
  if (/^[!?]+$/.test(t)) return true; // detached suffix annotation
  return false;
};
