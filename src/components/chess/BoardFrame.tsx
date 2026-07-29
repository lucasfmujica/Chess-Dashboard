import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { applyBoardSize, clampBoardSize, storeBoardSize } from './boardSize';

interface BoardFrameProps {
  children: ReactNode;
  /** Extra classes for the outer square — flex/grid behaviour of the column. */
  className?: string;
  /**
   * Hide the drag handle. Only for boards that are decoration rather than
   * something you sit and study.
   */
  resizable?: boolean;
}

/**
 * The square a board lives in, plus the corner handle that resizes it.
 *
 * The handle sits *outside* the clipping box on purpose: overlaying it on h1
 * would put a drag target on top of a square you need to be able to grab a
 * piece from.
 */
const BoardFrame = ({ children, className = '', resizable = true }: BoardFrameProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  /** Last size written during a drag, persisted on release. */
  const draggedRef = useRef<number | null>(null);

  const startResize = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const frame = frameRef.current;
    if (!frame || e.button !== 0) return;
    e.preventDefault();

    let last = { x: e.clientX, y: e.clientY };

    const onMove = (ev: PointerEvent) => {
      // The delta is measured against the board's *rendered* width each frame,
      // not accumulated from the start. When the column runs out of room the
      // board stops growing, and an accumulated total would keep climbing
      // invisibly — you'd then have to drag halfway back before it responded.
      const delta = (ev.clientX - last.x + (ev.clientY - last.y)) / 2;
      last = { x: ev.clientX, y: ev.clientY };
      const next = clampBoardSize(frame.getBoundingClientRect().width + delta);
      draggedRef.current = next;
      applyBoardSize(next);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (draggedRef.current !== null) storeBoardSize(draggedRef.current);
    };

    // Without this a drag across the page selects every paragraph it crosses.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, []);

  /** Back to the size the page picks for itself. */
  const resetSize = useCallback(() => {
    draggedRef.current = null;
    applyBoardSize(null);
    storeBoardSize(null);
  }, []);

  /** The same control from the keyboard: arrows resize, Escape/Backspace reset. */
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      const frame = frameRef.current;
      if (!frame) return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        resetSize();
        return;
      }
      const step = e.shiftKey ? 50 : 10;
      const dir =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? 1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? -1
            : 0;
      if (!dir) return;
      e.preventDefault();
      const next = clampBoardSize(frame.getBoundingClientRect().width + dir * step);
      draggedRef.current = next;
      applyBoardSize(next);
      storeBoardSize(next);
    },
    [resetSize]
  );

  return (
    <div ref={frameRef} className={`board-frame relative ${className}`}>
      <div className="absolute inset-0 overflow-hidden rounded-lg border border-hairline">
        {children}
      </div>
      {resizable && (
        <button
          type="button"
          onPointerDown={startResize}
          onDoubleClick={resetSize}
          onKeyDown={onKeyDown}
          aria-label="Redimensionar el tablero. Flechas para ajustar, Escape para volver al automático."
          title="Arrastrá para redimensionar · doble clic para volver al automático"
          className="group absolute -bottom-1.5 -right-1.5 z-30 h-6 w-6 cursor-nwse-resize touch-none rounded-br-lg opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <span className="absolute bottom-1 right-1 block h-3.5 w-3.5 border-b-2 border-r-2 border-fg-muted rounded-br-sm group-hover:border-accent" />
        </button>
      )}
    </div>
  );
};

export default BoardFrame;
