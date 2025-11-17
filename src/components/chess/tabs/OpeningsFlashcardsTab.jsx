import React, { useState, useMemo } from 'react';
import {
  SparklesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';

// Sample opening positions - in a real app, this would come from a database
const initialOpenings = [
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

const OpeningsFlashcardsTab = () => {
  const modal = useModal();

  const [openings, setOpenings] = useState(() => {
    const stored = localStorage.getItem('chessDashboard_openings');
    return stored ? JSON.parse(stored) : initialOpenings;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filter, setFilter] = useState('all'); // all, white, black
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [studyMode, setStudyMode] = useState('review'); // review, learn

  // Calculate spaced repetition intervals (in days)
  const getNextReviewInterval = (reviewCount, success) => {
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

  const handleResponse = (correct) => {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        <div className="relative px-8 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Opening Repertoire Trainer</h2>
              <p className="text-purple-100">Master your openings with spaced repetition</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-4">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <BookOpenIcon className="w-5 h-5 text-yellow-300" />
                <p className="text-sm font-medium text-white/80">Total Openings</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-orange-300" />
                <p className="text-sm font-medium text-white/80">Due Today</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.dueToday}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 text-emerald-300" />
                <p className="text-sm font-medium text-white/80">Mastered</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.mastered}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-300" />
                <p className="text-sm font-medium text-white/80">Avg Success</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.avgSuccessRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Study Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStudyMode('review')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                  studyMode === 'review'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Review ({stats.dueToday})
              </button>
              <button
                onClick={() => setStudyMode('learn')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                  studyMode === 'learn'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Openings
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Color</label>
            <div className="flex gap-2">
              {['all', 'white', 'black'].map(c => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all capitalize ${
                    filter === c
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all capitalize ${
                    difficultyFilter === d
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetProgress}
            className="ml-auto px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* Flashcard */}
      {filteredOpenings.length > 0 && currentOpening ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
          {/* Progress */}
          <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Card {currentIndex + 1} of {filteredOpenings.length}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  Success: <span className="font-bold text-emerald-600">{currentOpening.successRate}%</span>
                </span>
                <span className="text-sm text-slate-600">
                  Reviews: <span className="font-bold text-indigo-600">{currentOpening.reviewCount}</span>
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filteredOpenings.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-900">{currentOpening.name}</h3>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    currentOpening.color === 'white'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-800 text-white'
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
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200">
                <p className="text-lg font-semibold text-slate-900 mb-2">What are the main moves?</p>
                <p className="text-sm text-slate-600">Try to recall the move sequence before revealing...</p>
              </div>
            </div>

            {/* Answer */}
            {showAnswer && (
              <div className="mb-6 animate-slideUp">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-700 mb-2">Move Sequence:</p>
                  <p className="text-lg font-bold text-slate-900 font-mono">{currentOpening.moves}</p>

                  {currentOpening.lastReviewed && (
                    <p className="text-xs text-slate-500 mt-3">
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
                  className="flex-1 px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleResponse(false)}
                    className="flex-1 px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="w-6 h-6" />
                    Incorrect
                  </button>
                  <button
                    onClick={() => handleResponse(true)}
                    className="flex-1 px-6 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
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
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentIndex((currentIndex + 1) % filteredOpenings.length);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-12 text-center">
          <div className="p-4 bg-slate-100 rounded-full inline-block mb-4">
            <CheckCircleIcon className="w-12 h-12 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">All done for today!</h3>
          <p className="text-slate-600">No openings due for review. Check back tomorrow or switch to "All Openings" mode.</p>
        </div>
      )}
    </div>
  );
};

export default OpeningsFlashcardsTab;
