import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import type { StudyMoveNode } from '../utils/studyPgn';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** One level of the current path through a chapter's move tree. */
export interface PathFrame {
  nodes: StudyMoveNode[];
  /** Index of the last-played node within `nodes`; -1 means none played yet. */
  index: number;
}

export interface StudyLineNavigation {
  fen: string;
  /** Flattened, in-order list of the currently active path's played nodes. */
  activeNodes: StudyMoveNode[];
  path: PathFrame[];
  atStart: boolean;
  atEnd: boolean;
  /** True once the active path has branched into a variation. */
  insideVariation: boolean;
  goToPath: (path: PathFrame[]) => void;
  stepForward: () => void;
  stepBack: () => void;
  /** Jump to the end of the currently active line (mainline or entered variation). */
  jumpToLineEnd: () => void;
  resetToMainlineStart: () => void;
}

const flattenPath = (path: PathFrame[]): StudyMoveNode[] => {
  const nodes: StudyMoveNode[] = [];
  for (const frame of path) {
    for (let i = 0; i <= frame.index; i++) nodes.push(frame.nodes[i]);
  }
  return nodes;
};

const replayFen = (nodes: StudyMoveNode[]): string => {
  const chess = new Chess();
  try {
    for (const node of nodes) chess.move(node.san);
    return chess.fen();
  } catch {
    return STARTING_FEN;
  }
};

/** Tracks the currently-viewed route through a chapter's move tree (mainline + any entered variations). */
export const useStudyLineNavigation = (mainline: StudyMoveNode[]): StudyLineNavigation => {
  const [path, setPath] = useState<PathFrame[]>([{ nodes: mainline, index: -1 }]);

  // Reset navigation whenever the chapter (and thus its move tree) changes.
  useEffect(() => {
    setPath([{ nodes: mainline, index: -1 }]);
  }, [mainline]);

  const activeNodes = useMemo(() => flattenPath(path), [path]);
  const fen = useMemo(() => replayFen(activeNodes), [activeNodes]);

  const goToPath = useCallback((next: PathFrame[]) => setPath(next), []);

  const stepForward = useCallback(() => {
    setPath(current => {
      const last = current[current.length - 1];
      if (last.index + 1 >= last.nodes.length) return current;
      return [...current.slice(0, -1), { ...last, index: last.index + 1 }];
    });
  }, []);

  const stepBack = useCallback(() => {
    setPath(current => {
      const last = current[current.length - 1];
      if (last.index - 1 >= -1) {
        return [...current.slice(0, -1), { ...last, index: last.index - 1 }];
      }
      // Already at the start of this frame — pop up to the parent frame, if any.
      return current.length > 1 ? current.slice(0, -1) : current;
    });
  }, []);

  const jumpToLineEnd = useCallback(() => {
    setPath(current => {
      const last = current[current.length - 1];
      return [...current.slice(0, -1), { ...last, index: last.nodes.length - 1 }];
    });
  }, []);

  const resetToMainlineStart = useCallback(() => setPath([{ nodes: mainline, index: -1 }]), [mainline]);

  const last = path[path.length - 1];

  return {
    fen,
    activeNodes,
    path,
    atStart: path.length === 1 && path[0].index === -1,
    atEnd: last.index + 1 >= last.nodes.length,
    insideVariation: path.length > 1,
    goToPath,
    stepForward,
    stepBack,
    jumpToLineEnd,
    resetToMainlineStart,
  };
};
