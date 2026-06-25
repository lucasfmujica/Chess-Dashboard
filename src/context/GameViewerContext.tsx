import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const GameViewer = lazy(() => import('../components/chess/GameViewer'));

export interface GameViewerData {
  pgn?: string;
  orientation?: 'white' | 'black';
  white?: string;
  black?: string;
  result?: string;
  title?: string;
}

interface GameViewerContextValue {
  openGameViewer: (data: GameViewerData) => void;
  closeGameViewer: () => void;
}

const GameViewerContext = createContext<GameViewerContextValue | null>(null);

export const useGameViewer = (): GameViewerContextValue => {
  const ctx = useContext(GameViewerContext);
  if (!ctx) throw new Error('useGameViewer must be used within a GameViewerProvider');
  return ctx;
};

export const GameViewerProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<GameViewerData | null>(null);

  const openGameViewer = useCallback((d: GameViewerData) => setData(d), []);
  const closeGameViewer = useCallback(() => setData(null), []);

  // Close on Escape
  useEffect(() => {
    if (!data) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGameViewer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, closeGameViewer]);

  return (
    <GameViewerContext.Provider value={{ openGameViewer, closeGameViewer }}>
      {children}
      {data && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeGameViewer}
          role="dialog"
          aria-modal="true"
          aria-label="Game replay"
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-hairline bg-surface shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
              <h3 className="text-sm font-semibold text-fg">{data.title || 'Game Replay'}</h3>
              <button
                onClick={closeGameViewer}
                aria-label="Close"
                className="p-1.5 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Suspense fallback={<div className="py-16 text-center text-sm text-fg-muted">Loading board…</div>}>
                <GameViewer
                  pgn={data.pgn}
                  orientation={data.orientation}
                  white={data.white}
                  black={data.black}
                  result={data.result}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </GameViewerContext.Provider>
  );
};
