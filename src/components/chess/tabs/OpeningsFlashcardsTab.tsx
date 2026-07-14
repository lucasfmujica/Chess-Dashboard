import { useState, useMemo, useEffect } from 'react';
import {
  SparklesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import type { OpeningCard } from '../../../types/chess';
import { fetchFlashcards, putFlashcards } from '../../../api/client';

type StudyMode = 'review' | 'learn';
type ColorFilter = 'all' | OpeningCard['color'];
type DifficultyFilter = 'all' | OpeningCard['difficulty'];

const OpeningsFlashcardsTab = () => {
  const modal = useModal();

  const [openings, setOpenings] = useState<OpeningCard[]>([]);

  useEffect(() => {
    fetchFlashcards()
      .then(setOpenings)
      .catch(err => console.error('Failed to load opening flashcards', err));
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filter, setFilter] = useState<ColorFilter>('all'); // all, white, black
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [studyMode, setStudyMode] = useState<StudyMode>('review'); // review, learn

  // Calculate spaced repetition intervals (in days)
  const getNextReviewInterval = (reviewCount: number, success: boolean) => {
    if (!success) return 0; // Review again today
    const intervals = [1, 3, 7, 14, 30, 60, 120]; // Days
    const index = Math.min(reviewCount, intervals.length - 1);
    return intervals[index] * 24 * 60 * 60 * 1000; // Convert to milliseconds
  };

  // Filter openings
  const filteredOpenings = useMemo(() => {
    let filtered = openings;

    if (filter !== 'all') {
      filtered = filtered.filter(o => o.color === filter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(o => o.difficulty === difficultyFilter);
    }

    if (studyMode === 'review') {
      // Show only items due for review
      filtered = filtered.filter(o => o.nextReview <= Date.now());
    }

    return filtered.sort((a, b) => a.nextReview - b.nextReview);
  }, [openings, filter, difficultyFilter, studyMode]);

  const currentOpening = filteredOpenings[currentIndex];

  // Stats
  const stats = useMemo(() => {
    const total = openings.length;
    const dueToday = openings.filter(o => o.nextReview <= Date.now()).length;
    const mastered = openings.filter(o => o.reviewCount >= 5 && o.successRate >= 80).length;
    const avgSuccessRate = openings.length > 0
      ? Math.round(openings.reduce((sum, o) => sum + o.successRate, 0) / openings.length)
      : 0;

    return { total, dueToday, mastered, avgSuccessRate };
  }, [openings]);

  const handleResponse = async (correct: boolean) => {
    if (!currentOpening) return;

    const updated = openings.map(opening => {
      if (opening.id === currentOpening.id) {
        const newAttempts = opening.totalAttempts + 1;
        const newSuccesses = correct ? (opening.successRate * opening.totalAttempts / 100) + 1 : (opening.successRate * opening.totalAttempts / 100);
        const newSuccessRate = Math.round((newSuccesses / newAttempts) * 100);
        const newReviewCount = correct ? opening.reviewCount + 1 : opening.reviewCount;
        const nextReviewDelay = getNextReviewInterval(newReviewCount, correct);

        return {
          ...opening,
          reviewCount: newReviewCount,
          lastReviewed: Date.now(),
          nextReview: Date.now() + nextReviewDelay,
          successRate: newSuccessRate,
          totalAttempts: newAttempts
        };
      }
      return opening;
    });

    setOpenings(updated);
    await putFlashcards(updated);

    setShowAnswer(false);
    setCurrentIndex((currentIndex + 1) % filteredOpenings.length);
  };

  const resetProgress = async () => {
    const confirmed = await modal.confirm('Reset all progress? This cannot be undone.');
    if (confirmed) {
      const reset = openings.map(o => ({
        ...o,
        reviewCount: 0,
        lastReviewed: null,
        nextReview: Date.now(),
        successRate: 0,
        totalAttempts: 0
      }));
      setOpenings(reset);
      await putFlashcards(reset);
      setCurrentIndex(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-surface-2 rounded-lg">
              <BookOpenIcon className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">Opening Repertoire Trainer</h2>
              <p className="text-fg-muted">Master your openings with spaced repetition</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-4">
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <BookOpenIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Total Openings</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.total}</p>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Due Today</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.dueToday}</p>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Mastered</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.mastered}</p>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Avg Success</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.avgSuccessRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-semibold text-fg mb-2">Study Mode</label>
            <div className="flex gap-2 bg-surface border border-hairline rounded-lg p-1">
              <button
                onClick={() => setStudyMode('review')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  studyMode === 'review'
                    ? 'bg-surface-2 text-fg'
                    : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                Review ({stats.dueToday})
              </button>
              <button
                onClick={() => setStudyMode('learn')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  studyMode === 'learn'
                    ? 'bg-surface-2 text-fg'
                    : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                All Openings
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg mb-2">Color</label>
            <div className="flex gap-2 bg-surface border border-hairline rounded-lg p-1">
              {(['all', 'white', 'black'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all capitalize ${
                    filter === c
                      ? 'bg-surface-2 text-fg'
                      : 'text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-fg mb-2">Difficulty</label>
            <div className="flex gap-2 bg-surface border border-hairline rounded-lg p-1">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all capitalize ${
                    difficultyFilter === d
                      ? 'bg-surface-2 text-fg'
                      : 'text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetProgress}
            className="ml-auto px-4 py-2 text-sm font-semibold border border-hairline bg-surface text-fg rounded-lg hover:bg-surface-2 transition-colors"
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* Flashcard */}
      {filteredOpenings.length > 0 && currentOpening ? (
        <div className="bg-surface rounded-lg border border-hairline overflow-hidden">
          {/* Progress */}
          <div className="px-6 py-3 bg-surface-2 border-b border-hairline">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">
                Card {currentIndex + 1} of {filteredOpenings.length}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-fg-muted">
                  Success: <span className="font-bold text-win">{currentOpening.successRate}%</span>
                </span>
                <span className="text-sm text-fg-muted">
                  Reviews: <span className="font-bold text-accent">{currentOpening.reviewCount}</span>
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filteredOpenings.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-fg">{currentOpening.name}</h3>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    currentOpening.color === 'white'
                      ? 'bg-surface-2 text-fg'
                      : 'bg-fg text-app'
                  }`}>
                    ⚔️ Playing as {currentOpening.color === 'white' ? 'White' : 'Black'}
                  </span>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    currentOpening.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    currentOpening.difficulty === 'intermediate' ? 'bg-draw/12 text-draw' :
                    'bg-loss/12 text-loss'
                  }`}>
                    {currentOpening.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="p-6 bg-surface-2 rounded-lg border border-hairline">
                <p className="text-lg font-semibold text-fg mb-2">What are the main moves?</p>
                <p className="text-sm text-fg-muted">Try to recall the move sequence before revealing...</p>
              </div>
            </div>

            {/* Answer */}
            {showAnswer && (
              <div className="mb-6 animate-slideUp">
                <div className="p-6 bg-surface-2 rounded-lg border border-hairline">
                  <p className="text-sm font-semibold text-fg-muted mb-2">Move Sequence:</p>
                  <p className="text-lg font-bold text-fg font-mono">{currentOpening.moves}</p>

                  {currentOpening.lastReviewed && (
                    <p className="text-xs text-fg-subtle mt-3">
                      Last reviewed: {new Date(currentOpening.lastReviewed).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 px-6 py-4 text-lg font-bold text-app bg-fg rounded-lg hover:opacity-90 transition-all"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleResponse(false)}
                    className="flex-1 px-6 py-4 text-lg font-bold text-app bg-loss rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="w-6 h-6" />
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleResponse(true)}
                    className="flex-1 px-6 py-4 text-lg font-bold text-app bg-win rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-6 h-6" />
                    Correct
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentIndex((currentIndex - 1 + filteredOpenings.length) % filteredOpenings.length);
                }}
                className="px-4 py-2 text-sm font-semibold border border-hairline bg-surface text-fg rounded-lg hover:bg-surface-2 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentIndex((currentIndex + 1) % filteredOpenings.length);
                }}
                className="px-4 py-2 text-sm font-semibold border border-hairline bg-surface text-fg rounded-lg hover:bg-surface-2 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-hairline p-12 text-center">
          <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
            <CheckCircleIcon className="w-12 h-12 text-win" />
          </div>
          <h3 className="text-base font-semibold text-fg mb-2">All done for today!</h3>
          <p className="text-fg-muted">No openings due for review. Check back tomorrow or switch to "All Openings" mode.</p>
        </div>
      )}
    </div>
  );
};

export default OpeningsFlashcardsTab;
