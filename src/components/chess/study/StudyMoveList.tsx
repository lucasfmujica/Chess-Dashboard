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
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 gap-y-1 font-serif ${isVariation ? 'text-fg-muted italic text-sm' : 'text-[15px] leading-6'}`}>
      {isVariation && <span className="text-fg-subtle">(</span>}
      {nodes.map((node, i) => {
        const isActive = activeFrame?.nodes === nodes && activeFrame.index === i;
        const prevInterrupted = i > 0 && (!!nodes[i - 1].comment || nodes[i - 1].variations.length > 0);
        const label = moveLabel(node, i === 0, prevInterrupted);
        const path: PathFrame[] = [...ancestorFrames, { nodes, index: i }];

        return (
          <span key={i} className="inline-flex flex-wrap items-baseline gap-x-1">
            {label && <span className="font-mono text-xs text-fg-subtle tabular-nums">{label}</span>}
            <button
              onClick={() => onSelect(path)}
              aria-current={isActive ? 'true' : undefined}
              className={`rounded-sm px-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                isActive ? 'bg-carbon text-fg font-semibold' : 'hover:bg-surface-2 text-fg'
              }`}
            >
              {node.san}
            </button>

            {node.comment && (
              <span className="basis-full w-full block whitespace-pre-wrap pl-3 py-1 my-1.5 font-serif text-[15px] leading-6 text-fg not-italic">
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
