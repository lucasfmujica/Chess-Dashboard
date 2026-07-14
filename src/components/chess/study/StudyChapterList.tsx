import Badge from '../../ui/Badge';
import type { StudyChapter } from '../../../utils/studyPgn';

interface StudyChapterListProps {
  chapters: StudyChapter[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const StudyChapterList = ({ chapters, selectedIndex, onSelect }: StudyChapterListProps) => (
  <div className="space-y-1">
    {chapters.map((chapter, i) => (
      <button
        key={i}
        onClick={() => onSelect(i)}
        className={`w-full text-left rounded-md px-3 py-2 transition-colors ${
          i === selectedIndex ? 'bg-accent/15 text-accent' : 'hover:bg-surface-2 text-fg'
        }`}
      >
        <p className="text-sm font-medium leading-snug">{chapter.header.chapterName}</p>
        {(chapter.header.eco || chapter.header.opening) && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
            {chapter.header.eco && <Badge tone={i === selectedIndex ? 'accent' : 'neutral'}>{chapter.header.eco}</Badge>}
            {chapter.header.opening && <span className="truncate">{chapter.header.opening}</span>}
          </p>
        )}
      </button>
    ))}
  </div>
);

export default StudyChapterList;
