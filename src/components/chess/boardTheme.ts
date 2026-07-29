/**
 * Shared square styling for every `<Chessboard>` in the app.
 *
 * These four objects used to be copy-pasted into ten call sites, which meant
 * a board-colour change was a ten-file edit and the notation was silently
 * left on react-chessboard's defaults (#F0D9B5 / #B58863 — the colours of
 * *its* brown board, on top of squares that were never brown).
 *
 * The colours themselves live in `src/index.css` as `--board-*`, so the
 * palette stays with the rest of the design tokens.
 */
export const boardSquareStyles = {
  lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
  darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
  /* Notation takes the opposite square's colour, so a-h and 1-8 stay legible
     without a halo and without competing with the pieces. */
  lightSquareNotationStyle: { color: 'rgb(var(--board-dark))', fontWeight: 600 },
  darkSquareNotationStyle: { color: 'rgb(var(--board-light))', fontWeight: 600 },
} as const;
