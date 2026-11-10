import type { StudyChapter } from '../../../utils/studyPgn';

interface StudyChapterListProps {
  chapters: StudyChapter[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * The study as a book's table of contents: chapter name in serif, ECO in the
 * margin, the open chapter marked in pen.
 */
const StudyChapterList = ({ chapters, selectedIndex, onSelect }: StudyChapterListProps) => (
  <nav aria-label="Índice del estudio">
    <p className="text-label mx-3 mb-1">Capítulos · {chapters.length}</p>
    <ol className="space-y-0.5">
      {chapters.map((chapter, i) => {
        const active = i === selectedIndex;
        return (
          <li key={i}>
            <button
              onClick={() => onSelect(i)}
              aria-current={active ? 'page' : undefined}
              className={`grid w-full grid-cols-[1fr_auto] items-baseline gap-2 rounded px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                active ? 'bg-accent/10 text-accent' : 'text-fg hover:bg-app'
              }`}
            >
              <span className="min-w-0">
                <span className="block font-serif text-[15px] leading-[21px]">{chapter.header.chapterName}</span>
                {chapter.header.opening && (
                  <span className={`mt-0.5 block truncate text-xs ${active ? 'text-accent/80' : 'text-fg-subtle'}`}>
                    {chapter.header.opening}
                  </span>
                )}
              </span>
              {chapter.header.eco && (
                <span className={`font-mono text-xs tabular-nums ${active ? 'text-accent' : 'text-fg-subtle'}`}>
                  {chapter.header.eco}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default StudyChapterList;
