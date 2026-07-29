/**
 * The user's chosen board size — one number, shared by every board in the app.
 *
 * Each page declares an automatic fit (`--board-fit`, roughly "as tall as the
 * window minus this page's chrome"). Dragging the handle in a board's corner
 * sets `--board-user`, which overrides that fit *everywhere*: resizing the
 * board is a preference about how you like to look at a position, not a
 * property of the screen you happened to set it on.
 *
 * The value is written straight onto the document element rather than held in
 * React state. A drag fires dozens of updates a second, and every board on the
 * page has to follow — a CSS custom property does that in one write, without
 * re-rendering a single component.
 */

const STORAGE_KEY = 'chess-dashboard-board-size';

/** Small enough to still be a usable board; large enough for a 4K monitor. */
export const BOARD_MIN = 260;
export const BOARD_MAX = 1800;

export const clampBoardSize = (px: number): number =>
  Math.min(BOARD_MAX, Math.max(BOARD_MIN, Math.round(px)));

/** `null` means "no preference" — pages fall back to their own `--board-fit`. */
export const applyBoardSize = (px: number | null): void => {
  const root = document.documentElement;
  if (px === null) root.style.removeProperty('--board-user');
  else root.style.setProperty('--board-user', `${px}px`);
};

export const readStoredBoardSize = (): number | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const px = Number(raw);
    return Number.isFinite(px) ? clampBoardSize(px) : null;
  } catch {
    // Private mode / storage disabled: fall back to the automatic fit.
    return null;
  }
};

export const storeBoardSize = (px: number | null): void => {
  try {
    if (px === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(px));
  } catch {
    // Not being able to remember the size must not break resizing it.
  }
};

/** Re-apply the saved size on load. Called once, from the dashboard shell. */
export const restoreBoardSize = (): void => applyBoardSize(readStoredBoardSize());
