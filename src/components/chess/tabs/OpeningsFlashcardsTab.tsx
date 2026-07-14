import { useState, useMemo, useEffect } from 'react';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import type { RepertoireLine } from '../../../types/chess';
import { fetchRepertoireLines, putRepertoireLine } from '../../../api/client';
import { ecoNames } from '../../../constants/ecoNames';
import { Card } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';

type StudyMode = 'review' | 'all';
type ColorFilter = 'all' | 'W' | 'B';

const DAY = 24 * 60 * 60 * 1000;

/** Spaced-repetition interval (days) keyed by self-assessed confidence 1-5. */
const CONFIDENCE_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

const reviewIntervalMs = (confidence?: number) => (CONFIDENCE_DAYS[confidence ?? 1] ?? 1) * DAY;

/** A line is due when never reviewed, or its confidence-based interval has elapsed. */
const isDue = (line: RepertoireLine, now: number) =>
  !line.lastReviewed || now - line.lastReviewed >= reviewIntervalMs(line.confidence);

/** Sort key: never-reviewed (0) first, then by soonest next-review time. */
const nextReviewAt = (line: RepertoireLine) =>
  line.lastReviewed ? line.lastReviewed + reviewIntervalMs(line.confidence) : 0;

const lineName = (line: RepertoireLine) =>
  line.lineName || (line.eco ? ecoNames[line.eco] || line.eco : '') || 'Unnamed line';

const OpeningsFlashcardsTab = () => {
  const modal = useModal();

  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [studyMode, setStudyMode] = useState<StudyMode>('review');

  useEffect(() => {
    fetchRepertoireLines()
      .then(setLines)
      .catch(err => console.error('Failed to load repertoire lines', err));
  }, []);

  const now = Date.now();

  const filteredLines = useMemo(() => {
    let filtered = lines;
    if (colorFilter !== 'all') filtered = filtered.filter(l => l.color === colorFilter);
    if (studyMode === 'review') filtered = filtered.filter(l => isDue(l, now));
    return [...filtered].sort((a, b) => nextReviewAt(a) - nextReviewAt(b));
  }, [lines, colorFilter, studyMode, now]);

  const current = filteredLines[currentIndex];

  const stats = useMemo(() => {
    const total = lines.length;
    const dueToday = lines.filter(l => isDue(l, now)).length;
    const mastered = lines.filter(l => (l.confidence ?? 0) >= 5).length;
    const scored = lines.filter(l => l.confidence);
    const avgConfidence = scored.length
      ? Math.round((scored.reduce((s, l) => s + (l.confidence ?? 0), 0) / scored.length) * 10) / 10
      : 0;
    return { total, dueToday, mastered, avgConfidence };
  }, [lines, now]);

  const handleResponse = async (correct: boolean) => {
    if (!current) return;
    const nudged = correct
      ? Math.min(5, (current.confidence ?? 3) + 1)
      : Math.max(1, (current.confidence ?? 3) - 1);
    const updated: RepertoireLine = { ...current, confidence: nudged, lastReviewed: Date.now() };

    setLines(prev => prev.map(l => (l.id === current.id ? updated : l)));
    setShowAnswer(false);
    // Advance within the (pre-update) filtered list length.
    setCurrentIndex(i => (filteredLines.length ? (i + 1) % filteredLines.length : 0));

    try {
      await putRepertoireLine(current.id, updated);
    } catch (err) {
      console.error('Failed to save review', err);
    }
  };

  const resetProgress = async () => {
    const confirmed = await modal.confirm('Reset review progress for all lines? This clears their last-reviewed dates.');
    if (!confirmed) return;
    const cleared = lines.map(l => ({ ...l, lastReviewed: undefined }));
    setLines(cleared);
    setCurrentIndex(0);
    await Promise.all(cleared.map(l => putRepertoireLine(l.id, l).catch(() => undefined)));
  };

  const goPrev = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filteredLines.length ? (i - 1 + filteredLines.length) % filteredLines.length : 0));
  };
  const goNext = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filteredLines.length ? (i + 1) % filteredLines.length : 0));
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-surface-2 rounded-lg">
            <BookOpenIcon className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h2 className="text-h2 text-fg">Opening Repertoire Trainer</h2>
            <p className="text-sm text-fg-muted">Drill your repertoire lines with spaced repetition</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Lines" value={stats.total} icon={BookOpenIcon} />
        <StatCard title="Due Now" value={stats.dueToday} icon={ClockIcon} />
        <StatCard title="Mastered" value={stats.mastered} icon={SparklesIcon} subtitle="Confidence 5/5" />
        <StatCard title="Avg Confidence" value={`${stats.avgConfidence}/5`} />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-label mb-2">Mode</p>
            <SegmentedControl
              aria-label="Study mode"
              value={studyMode}
              onChange={v => { setStudyMode(v); setCurrentIndex(0); }}
              options={[
                { value: 'review', label: `Due (${stats.dueToday})` },
                { value: 'all', label: 'All lines' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Color</p>
            <SegmentedControl
              aria-label="Color filter"
              value={colorFilter}
              onChange={v => { setColorFilter(v); setCurrentIndex(0); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'W', label: <PieceLabel color="W" /> },
                { value: 'B', label: <PieceLabel color="B" /> },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={resetProgress} className="ml-auto">
            Reset progress
          </Button>
        </div>
      </Card>

      {/* Flashcard */}
      {filteredLines.length > 0 && current ? (
        <Card flush className="overflow-hidden">
          {/* Progress */}
          <div className="px-6 py-3 bg-surface-2 border-b border-hairline">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">
                Card {currentIndex + 1} of {filteredLines.length}
              </span>
              <span className="text-sm text-fg-muted">
                Confidence: <span className="font-bold text-accent tabular-nums">{current.confidence ?? '—'}/5</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filteredLines.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-h3 text-fg">{lineName(current)}</h3>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral"><PieceLabel color={current.color} /></Badge>
                  {current.eco && <Badge tone="neutral">{current.eco}</Badge>}
                  {current.vsMove && <Badge tone="accent">vs {current.vsMove}</Badge>}
                </div>
              </div>

              {/* Prompt */}
              <div className="p-6 bg-surface-2 rounded-lg border border-hairline">
                <p className="text-base font-semibold text-fg mb-1">Recall your line & plan</p>
                <p className="text-sm text-fg-muted">Play through the moves in your head, then reveal.</p>
              </div>
            </div>

            {/* Answer */}
            {showAnswer && (
              <div className="mb-6 animate-slideUp space-y-3">
                {current.movesSan && (
                  <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
                    <p className="text-label mb-2">Moves</p>
                    <p className="text-lg font-bold text-fg font-mono">{current.movesSan}</p>
                  </div>
                )}
                {current.plan && (
                  <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
                    <p className="text-label mb-2">Plan</p>
                    <p className="text-sm text-fg">{current.plan}</p>
                  </div>
                )}
                {current.goldenRule && (
                  <div className="p-5 rounded-lg border border-draw/20 bg-draw/10">
                    <p className="text-label mb-2 text-draw">Golden rule</p>
                    <p className="text-sm text-fg">{current.goldenRule}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-fg-subtle">
                  {current.lichessUrl && (
                    <a
                      href={current.lichessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Open in Lichess
                    </a>
                  )}
                  {current.lastReviewed && (
                    <span>Last reviewed: {new Date(current.lastReviewed).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 px-6 py-4 text-base font-bold text-app bg-fg rounded-lg hover:opacity-90 transition-all"
                >
                  Show answer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleResponse(false)}
                    className="flex-1 px-6 py-4 text-base font-bold text-app bg-loss rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="w-5 h-5" />
                    Missed it
                  </button>
                  <button
                    onClick={() => handleResponse(true)}
                    className="flex-1 px-6 py-4 text-base font-bold text-app bg-win rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Got it
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={goPrev}>← Previous</Button>
              <Button variant="secondary" onClick={goNext}>Next →</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
            <CheckCircleIcon className="w-12 h-12 text-win" />
          </div>
          {lines.length === 0 ? (
            <>
              <h3 className="text-h3 text-fg mb-2">No repertoire lines yet</h3>
              <p className="text-fg-muted">Add lines in <span className="font-semibold text-fg">Tournament Prep</span> — they'll show up here to drill.</p>
            </>
          ) : (
            <>
              <h3 className="text-h3 text-fg mb-2">All caught up!</h3>
              <p className="text-fg-muted">No lines due for review. Switch to "All lines" to keep practicing.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default OpeningsFlashcardsTab;
