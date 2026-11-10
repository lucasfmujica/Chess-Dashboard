import { createElement } from 'react';
import type { PieceRenderObject } from 'react-chessboard';

import wP from '../../assets/pieces/merida/wP.svg';
import wN from '../../assets/pieces/merida/wN.svg';
import wB from '../../assets/pieces/merida/wB.svg';
import wR from '../../assets/pieces/merida/wR.svg';
import wQ from '../../assets/pieces/merida/wQ.svg';
import wK from '../../assets/pieces/merida/wK.svg';
import bP from '../../assets/pieces/merida/bP.svg';
import bN from '../../assets/pieces/merida/bN.svg';
import bB from '../../assets/pieces/merida/bB.svg';
import bR from '../../assets/pieces/merida/bR.svg';
import bQ from '../../assets/pieces/merida/bQ.svg';
import bK from '../../assets/pieces/merida/bK.svg';

/**
 * Merida, the piece set of printed chess books and diagrams. It goes with the
 * Planilla look (paper + ink) better than react-chessboard's default
 * Cburnett, which reads as "screen". Files from Lichess's set (GPLv2+, see
 * src/assets/pieces/merida/README.md).
 */
const MERIDA: Record<string, string> = { wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK };

const meridaPieces: PieceRenderObject = Object.fromEntries(
  Object.entries(MERIDA).map(([key, src]) => [
    key,
    (props?: { svgStyle?: React.CSSProperties }) =>
      createElement('img', {
        src,
        alt: '',
        draggable: false,
        style: { width: '100%', height: '100%', display: 'block', ...props?.svgStyle },
      }),
  ]),
);

/**
 * Shared square styling and pieces for every `<Chessboard>` in the app.
 *
 * These objects used to be copy-pasted into ten call sites, which meant a
 * board-colour change was a ten-file edit and the notation was silently left
 * on react-chessboard's defaults.
 *
 * The colours themselves live in `src/index.css` as `--board-*` (the "Tinta"
 * board of the Planilla design system), so the palette stays with the rest of
 * the design tokens.
 */
export const boardSquareStyles = {
  lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
  darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
  /* Notation takes the opposite square's colour, so a-h and 1-8 stay legible
     without a halo and without competing with the pieces. */
  lightSquareNotationStyle: { color: 'rgb(var(--board-dark))', fontWeight: 600 },
  darkSquareNotationStyle: { color: 'rgb(var(--board-light))', fontWeight: 600 },
  pieces: meridaPieces,
} as const;
