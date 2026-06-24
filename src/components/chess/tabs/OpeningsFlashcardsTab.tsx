import { useState, useMemo } from 'react';
import {
  SparklesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';

/** Color the opening is played as. */
type OpeningColor = 'white' | 'black';

/** Difficulty bucket for an opening flashcard. */
type OpeningDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** A trainable opening flashcard with spaced-repetition metadata. */
interface OpeningCard {
  id: number;
  name: string;
  moves: string;
  fen: string;
  color: OpeningColor;
  difficulty: OpeningDifficulty;
  reviewCount: number;
  lastReviewed: number | null;
  nextReview: number;
  successRate: number;
  totalAttempts: number;
}

// Sample opening positions - in a real app, this would come from a database
const initialOpenings: OpeningCard[] = [
  {
    id: 1,
    name: "Sicilian Defense - Najdorf",
    moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6",
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    color: "black",
    difficulty: "advanced",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    id: 2,
    name: "Italian Game - Main Line",
    moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3",
    fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
    color: "white",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    id: 3,
    name: "French Defense - Advance Variation",
    moves: "1.e4 e6 2.d4 d5 3.e5",
    fen: "rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3",
    color: "black",
    difficulty: "beginner",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    id: 4,
    name: "Queen's Gambit Declined",
    moves: "1.d4 d5 2.c4 e6 3.Nc3 Nf6",
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
    color: "black",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    id: 5,
    name: "King's Indian Attack",
    moves: "1.Nf3 d5 2.g3 Nf6 3.Bg2 c5 4.O-O Nc6 5.d3 e6",
    fen: "r1bqkb1r/pp3ppp/2n1pn2/2pp4/8/3P1NP1/PPP1PPBP/RNBQ1RK1 w kq - 0 6",
    color: "white",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  },
  {
    id: 6,
    name: "Caro-Kann Defense - Classical",
    moves: "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4",
    fen: "rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b KQkq - 0 4",
    color: "black",
    difficulty: "intermediate",
    reviewCount: 0,
    lastReviewed: null,
    nextReview: Date.now(),
    successRate: 0,
    totalAttempts: 0
  }
];

type StudyMode = 'review' | 'learn';
type ColorFilter = 'all' | OpeningColor;
type DifficultyFilter = 'all' | OpeningDifficulty;

const OpeningsFlashcardsTab = () => {
  const modal = useModal();

  const [openings, setOpenings] = useState<OpeningCard[]>(() => {
    const stored = localStorage.getItem('chessDashboard_openings');
    return stored ? JSON.parse(stored) : initialOpenings;
  });

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

  const handleResponse = (correct: boolean) => {
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
    localStorage.setItem('chessDashboard_openings', JSON.stringify(updated));

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
      localStorage.setItem('chessDashboard_openings', JSON.stringify(reset));
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
                    currentOpening.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
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
