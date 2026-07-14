import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useStudyChapters } from '../../../utils/studyPgn';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { LoadingSpinner } from '../../LoadingSkeleton';
import StudyChapterList from '../study/StudyChapterList';
import StudyChapterReader from '../study/StudyChapterReader';

const RepertoireStudyTab = () => {
  const { chapters, loading, error } = useStudyChapters();
  const [selectedIndex, setSelectedIndex] = useLocalStorage('chess-dashboard-repertoire-study-chapter', 0);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" color="indigo" />
        <p className="mt-4 text-fg-muted">Loading repertoire study…</p>
      </div>
    );
  }

  if (error || !chapters || chapters.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-5 text-sm text-fg-muted">
        {error || 'No repertoire study chapters found.'}
      </div>
    );
  }

  const index = Math.min(Math.max(selectedIndex, 0), chapters.length - 1);
  const chapter = chapters[index];

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="lg:hidden">
        <button
          onClick={() => setMobileListOpen(o => !o)}
          className="w-full flex items-center justify-between rounded-lg border border-hairline bg-surface px-3 py-2.5 text-left"
        >
          <span className="text-sm font-medium text-fg">
            {index + 1} / {chapters.length} · {chapter.header.chapterName}
          </span>
          {mobileListOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {mobileListOpen && (
          <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-hairline bg-surface p-2">
            <StudyChapterList
              chapters={chapters}
              selectedIndex={index}
              onSelect={i => {
                setSelectedIndex(i);
                setMobileListOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="hidden lg:block w-80 flex-shrink-0 lg:h-[528px] xl:h-[608px] 2xl:h-[728px] overflow-y-auto">
        <StudyChapterList chapters={chapters} selectedIndex={index} onSelect={setSelectedIndex} />
      </div>

      <div className="flex-1 min-w-0">
        <StudyChapterReader chapter={chapter} />
      </div>
    </div>
  );
};

export default RepertoireStudyTab;
