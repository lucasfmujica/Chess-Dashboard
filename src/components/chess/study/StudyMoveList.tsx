import type { StudyMoveNode } from '../../../utils/studyPgn';
import type { PathFrame } from '../../../hooks/useStudyLineNavigation';

interface StudyMoveListProps {
  nodes: StudyMoveNode[];
  /** Frames above this level, fixed at the index where this level branched off. */
  ancestorFrames: PathFrame[];
  activePath: PathFrame[];
  onSelect: (path: PathFrame[]) => void;
  /** True for a variation's own move list (renders parenthesized + muted). */
  isVariation?: boolean;
}

const moveLabel = (node: StudyMoveNode, isFirst: boolean, prevInterrupted: boolean): string => {
  if (node.turn === 'w') return `${node.moveNumber}.`;
  if (isFirst || prevInterrupted) return `${node.moveNumber}...`;
  return '';
};

const StudyMoveList = ({ nodes, ancestorFrames, activePath, onSelect, isVariation }: StudyMoveListProps) => {
  const depth = ancestorFrames.length;
  const activeFrame = activePath[depth];

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 gap-y-1 ${isVariation ? 'text-fg-muted italic text-[13px]' : 'text-sm'}`}>
      {isVariation && <span className="text-fg-subtle">(</span>}
      {nodes.map((node, i) => {
        const isActive = activeFrame?.nodes === nodes && activeFrame.index === i;
        const prevInterrupted = i > 0 && (!!nodes[i - 1].comment || nodes[i - 1].variations.length > 0);
        const label = moveLabel(node, i === 0, prevInterrupted);
        const path: PathFrame[] = [...ancestorFrames, { nodes, index: i }];

        return (
          <span key={i} className="inline-flex flex-wrap items-baseline gap-x-1">
            {label && <span className="text-fg-subtle tabular-nums">{label}</span>}
            <button
              onClick={() => onSelect(path)}
              className={`rounded px-1 font-medium transition-colors ${
                isActive ? 'bg-accent/15 text-accent' : 'hover:bg-surface-2 text-fg'
              }`}
            >
              {node.san}
            </button>

            {node.comment && (
              <span className="basis-full w-full block whitespace-pre-wrap rounded-md bg-surface-2 px-2.5 py-2 my-1 text-xs leading-relaxed text-fg-muted not-italic">
                {node.comment}
              </span>
            )}

            {node.variations.map((variation, vi) => (
              <span key={vi} className="basis-full w-full block">
                <StudyMoveList
                  nodes={variation}
                  ancestorFrames={[...ancestorFrames, { nodes, index: i - 1 }]}
                  activePath={activePath}
                  onSelect={onSelect}
                  isVariation
                />
              </span>
            ))}
          </span>
        );
      })}
      {isVariation && <span className="text-fg-subtle">)</span>}
    </span>
  );
};

export default StudyMoveList;
